import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface AlertingConstructProps {
  readonly backtestResultsTable: dynamodb.ITable;
}

export class AlertingConstruct extends Construct {
  readonly modelAlertsTopic: sns.Topic;
  readonly driftAlertsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: AlertingConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // SNS Topics
    this.modelAlertsTopic = new sns.Topic(this, 'ModelAlertsTopic', {
      topicName: 'goldwind-model-alerts',
    });

    this.driftAlertsTopic = new sns.Topic(this, 'DriftAlertsTopic', {
      topicName: 'goldwind-drift-alerts',
    });

    // Lambda: alert-evaluator
    const alertEvaluatorFn = new lambda.Function(this, 'AlertEvaluatorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'alert-evaluator.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/backtesting')),
      timeout: cdk.Duration.seconds(120),
      environment: {
        RESULTS_TABLE: props.backtestResultsTable.tableName,
        MODEL_ALERTS_TOPIC_ARN: this.modelAlertsTopic.topicArn,
        DRIFT_ALERTS_TOPIC_ARN: this.driftAlertsTopic.topicArn,
        MAPE_THRESHOLD: '10',
        CONSECUTIVE_DAYS_THRESHOLD: '3',
        REGION: stack.region,
      },
    });

    // Grant permissions
    props.backtestResultsTable.grantReadData(alertEvaluatorFn);
    this.modelAlertsTopic.grantPublish(alertEvaluatorFn);
    this.driftAlertsTopic.grantPublish(alertEvaluatorFn);

    // EventBridge rule: trigger alert-evaluator daily at 03:00 UTC
    new events.Rule(this, 'DailyAlertEvalRule', {
      schedule: events.Schedule.cron({ hour: '3', minute: '0' }),
      targets: [new targets.LambdaFunction(alertEvaluatorFn)],
    });

    new cdk.CfnOutput(this, 'ModelAlertsTopicArn', {
      value: this.modelAlertsTopic.topicArn,
    });

    new cdk.CfnOutput(this, 'DriftAlertsTopicArn', {
      value: this.driftAlertsTopic.topicArn,
    });
  }
}
