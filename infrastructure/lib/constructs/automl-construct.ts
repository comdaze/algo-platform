import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

export interface AutoMlConstructProps {
  readonly vpc: ec2.IVpc;
  /** Bucket used for AutoML dataset input + job output. */
  readonly dataBucket: s3.IBucket;
}

/**
 * MLZero AutoML compute surface: an ECR repo for the BYOC image, a scoped
 * SageMaker Processing execution role, a runs-tracking table, and a job SG.
 * The job runs on-demand (triggered by the api-handler) and auto-terminates —
 * no idle GPU cost. It executes LLM-generated code, so the role is least-privilege.
 */
export class AutoMlConstruct extends Construct {
  readonly repository: ecr.Repository;
  readonly processingRole: iam.Role;
  readonly runsTable: dynamodb.Table;
  readonly jobSecurityGroup: ec2.SecurityGroup;
  readonly imageUri: string;

  constructor(scope: Construct, id: string, props: AutoMlConstructProps) {
    super(scope, id);
    const stack = cdk.Stack.of(this);

    // BYOC image (built + pushed by CodeBuild). Jobs use the :latest tag.
    this.repository = new ecr.Repository(this, 'Repo', {
      repositoryName: 'algo-mlzero',
      imageScanOnPush: true,
      emptyOnDelete: false,
    });
    this.imageUri = `${this.repository.repositoryUri}:latest`;

    // Run tracking (dataset/task/status per run; SageMaker is the live source of truth).
    this.runsTable = new dynamodb.Table(this, 'Runs', {
      partitionKey: { name: 'runId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SG for the processing job ENIs (VpcConfig). Egress-all so it can reach the
    // external LLM endpoint + HF mirror via NAT, and internal MLflow in-VPC.
    this.jobSecurityGroup = new ec2.SecurityGroup(this, 'JobSg', {
      vpc: props.vpc,
      description: 'algo mlzero AutoML processing job',
      allowAllOutbound: true,
    });

    // Existing LLM config secret (created by the Settings feature) — reference by
    // name to avoid a cross-stack cycle; the job reads it at runtime.
    const llmSecret = secretsmanager.Secret.fromSecretNameV2(this, 'LlmConfig', 'algo/llm/config');

    // SageMaker Processing execution role (least privilege).
    this.processingRole = new iam.Role(this, 'ProcessingRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'algo mlzero AutoML SageMaker Processing execution role',
    });
    props.dataBucket.grantReadWrite(this.processingRole);
    llmSecret.grantRead(this.processingRole);
    this.repository.grantPull(this.processingRole);
    this.processingRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'ecr:GetAuthorizationToken',
          'ec2:CreateNetworkInterface',
          'ec2:CreateNetworkInterfacePermission',
          'ec2:DeleteNetworkInterface',
          'ec2:DeleteNetworkInterfacePermission',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DescribeVpcs',
          'ec2:DescribeDhcpOptions',
          'ec2:DescribeRouteTables',
          'ec2:DescribeNetworkAcls',
          'ec2:DescribeSubnets',
          'ec2:DescribeSecurityGroups',
        ],
        resources: ['*'],
      })
    );

    // Status write-back: EventBridge (Processing job state change) -> Lambda that
    // updates the runs table (status + metrics) so the list reflects live state.
    const callbackFn = new lambdaNodejs.NodejsFunction(this, 'CallbackFn', {
      entry: path.join(__dirname, '../../../lambdas/automl-callback/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        AUTOML_RUNS_TABLE: this.runsTable.tableName,
        AUTOML_DATA_BUCKET: props.dataBucket.bucketName,
      },
      bundling: { externalModules: ['@aws-sdk/*'] },
    });
    this.runsTable.grantWriteData(callbackFn);
    props.dataBucket.grantRead(callbackFn);

    new events.Rule(this, 'ProcessingJobStateRule', {
      description: 'AutoML: write SageMaker Processing job status back to the runs table',
      eventPattern: {
        source: ['aws.sagemaker'],
        detailType: ['SageMaker Processing Job State Change'],
      },
      targets: [new targets.LambdaFunction(callbackFn)],
    });

    new cdk.CfnOutput(this, 'MlzeroImageUri', { value: this.imageUri });
    new cdk.CfnOutput(this, 'AutoMlRunsTable', { value: this.runsTable.tableName });
    new cdk.CfnOutput(this, 'AutoMlProcessingRoleArn', { value: this.processingRole.roleArn });
  }
}
