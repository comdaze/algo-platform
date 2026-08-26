import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';

export interface CallbackConstructProps {
  readonly sageMakerExecutionRole: iam.IRole;
}

export class CallbackConstruct extends Construct {
  readonly callbackQueueUrl: string;
  readonly callbackQueueArn: string;

  constructor(scope: Construct, id: string, props: CallbackConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // SQS Queue for receiving training completion messages from ECS tasks
    const callbackQueue = new sqs.Queue(this, 'CallbackQueue', {
      queueName: 'algo-callback-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(7),
    });

    this.callbackQueueUrl = callbackQueue.queueUrl;
    this.callbackQueueArn = callbackQueue.queueArn;

    // Lambda function for callback handling
    const callbackHandler = new lambda.Function(this, 'CallbackHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/callback-handler')),
      timeout: cdk.Duration.seconds(60),
      environment: {
        REGION: stack.region,
      },
    });

    // Lambda permissions to call SageMaker pipeline step APIs
    callbackHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:SendPipelineExecutionStepSuccess',
          'sagemaker:SendPipelineExecutionStepFailure',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:pipeline/*`,
        ],
      })
    );

    // Trigger Lambda from SQS
    callbackHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(callbackQueue, {
        batchSize: 1,
      })
    );

    // EventBridge rule matching ECS task state change to STOPPED -> publishes to SQS
    const ecsTaskStoppedRule = new events.Rule(this, 'EcsTaskStoppedRule', {
      eventPattern: {
        source: ['aws.ecs'],
        detailType: ['ECS Task State Change'],
        detail: {
          lastStatus: ['STOPPED'],
        },
      },
    });

    ecsTaskStoppedRule.addTarget(new targets.SqsQueue(callbackQueue));

    new cdk.CfnOutput(this, 'CallbackQueueUrl', {
      value: callbackQueue.queueUrl,
    });

    new cdk.CfnOutput(this, 'CallbackQueueArn', {
      value: callbackQueue.queueArn,
    });
  }
}
