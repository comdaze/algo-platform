import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

export interface BacktestingConstructProps {
  readonly sageMakerExecutionRole: iam.IRole;
  readonly dataBucket: s3.IBucket;
  readonly artifactBucket: s3.IBucket;
}

export class BacktestingConstruct extends Construct {
  readonly stateMachineArn: string;
  readonly backtestResultsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: BacktestingConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // DynamoDB table for backtest results
    this.backtestResultsTable = new dynamodb.Table(this, 'BacktestResultsTable', {
      tableName: 'goldwind-backtest-results',
      partitionKey: { name: 'algorithmId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'backtestId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'BacktestAlertTopic', {
      topicName: 'goldwind-backtest-alerts',
    });

    // Lambda: PrepareData
    const prepareDataFn = new lambda.Function(this, 'PrepareDataFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/backtesting')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        DATA_BUCKET: props.dataBucket.bucketName,
        ARTIFACT_BUCKET: props.artifactBucket.bucketName,
        REGION: stack.region,
      },
    });
    props.dataBucket.grantRead(prepareDataFn);
    props.artifactBucket.grantRead(prepareDataFn);

    // Lambda: StoreResults
    const storeResultsFn = new lambda.Function(this, 'StoreResultsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'store-results.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/backtesting')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        RESULTS_TABLE: this.backtestResultsTable.tableName,
        REGION: stack.region,
      },
    });
    this.backtestResultsTable.grantWriteData(storeResultsFn);

    // Step Functions states
    const prepareData = new tasks.LambdaInvoke(this, 'PrepareData', {
      lambdaFunction: prepareDataFn,
      outputPath: '$.Payload',
    });

    const runBacktest = new tasks.SageMakerCreateProcessingJob(this, 'RunBacktest', {
      processingJobName: sfn.JsonPath.stringAt('$.processingJobName'),
      role: props.sageMakerExecutionRole,
      appSpecification: {
        imageUri: sfn.JsonPath.stringAt('$.processingImageUri'),
        containerEntrypoint: ['python3', '/opt/ml/processing/input/code/backtest_processor.py'],
      },
      processingResources: {
        clusterConfig: {
          instanceCount: 1,
          instanceType: ec2InstanceType('ml.m5.xlarge'),
          volumeSizeInGb: 50,
        },
      },
      processingInputs: [
        {
          inputName: 'input-data',
          s3Input: {
            s3Uri: sfn.JsonPath.stringAt('$.inputDataUri'),
            localPath: '/opt/ml/processing/input/data',
            s3DataType: tasks.S3DataType.S3_PREFIX,
            s3InputMode: tasks.S3DataDistributionType.FULLY_REPLICATED,
          },
        },
        {
          inputName: 'code',
          s3Input: {
            s3Uri: sfn.JsonPath.stringAt('$.codeUri'),
            localPath: '/opt/ml/processing/input/code',
            s3DataType: tasks.S3DataType.S3_PREFIX,
            s3InputMode: tasks.S3DataDistributionType.FULLY_REPLICATED,
          },
        },
      ],
      processingOutputConfig: {
        outputs: [
          {
            outputName: 'output',
            s3Output: {
              s3Uri: sfn.JsonPath.stringAt('$.outputUri'),
              localPath: '/opt/ml/processing/output',
              s3UploadMode: tasks.S3DataDistributionType.FULLY_REPLICATED,
            },
          },
        ],
      },
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    });

    const storeResults = new tasks.LambdaInvoke(this, 'StoreResults', {
      lambdaFunction: storeResultsFn,
      outputPath: '$.Payload',
    });

    const checkThreshold = new sfn.Choice(this, 'CheckThreshold')
      .when(
        sfn.Condition.numberGreaterThan('$.mape', 10),
        new tasks.SnsPublish(this, 'SendAlert', {
          topic: alertTopic,
          message: sfn.TaskInput.fromJsonPathAt('$.alertMessage'),
          subject: 'Goldwind Backtest MAPE Threshold Exceeded',
        })
      )
      .otherwise(new sfn.Succeed(this, 'Success'));

    // State machine definition
    const definition = prepareData
      .next(runBacktest)
      .next(storeResults)
      .next(checkThreshold);

    const stateMachine = new sfn.StateMachine(this, 'BacktestWorkflow', {
      stateMachineName: 'backtest-workflow',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(4),
    });

    this.stateMachineArn = stateMachine.stateMachineArn;

    // EventBridge scheduled rule: run backtesting daily at 02:00 UTC
    new events.Rule(this, 'DailyBacktestRule', {
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.SfnStateMachine(stateMachine, {
        input: events.RuleTargetInput.fromObject({
          algorithmId: 'default',
          dateRange: { start: 'auto', end: 'auto' },
          modelVersion: 'latest',
        }),
      })],
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
    });

    new cdk.CfnOutput(this, 'BacktestResultsTableName', {
      value: this.backtestResultsTable.tableName,
    });
  }
}

function ec2InstanceType(instanceType: string): cdk.aws_ec2.InstanceType {
  return new cdk.aws_ec2.InstanceType(instanceType);
}
