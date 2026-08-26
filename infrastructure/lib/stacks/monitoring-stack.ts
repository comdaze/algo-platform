import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MonitoringConstruct } from '../constructs/monitoring-construct';
import { BacktestingConstruct } from '../constructs/backtesting-construct';
import { AlertingConstruct } from '../constructs/alerting-construct';

export interface MonitoringStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
  readonly sageMakerExecutionRole: iam.IRole;
  readonly dataBucket: s3.IBucket;
  readonly artifactBucket: s3.IBucket;
}

export class MonitoringStack extends Stack {
  readonly backtestStateMachineArn: string;
  readonly grafanaHost: string;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const monitoring = new MonitoringConstruct(this, 'Monitoring', {
      vpc: props.vpc,
      dataBucket: props.dataBucket,
    });

    this.grafanaHost = monitoring.grafanaUrl;

    const backtesting = new BacktestingConstruct(this, 'Backtesting', {
      sageMakerExecutionRole: props.sageMakerExecutionRole,
      dataBucket: props.dataBucket,
      artifactBucket: props.artifactBucket,
    });

    const alerting = new AlertingConstruct(this, 'Alerting', {
      backtestResultsTable: backtesting.backtestResultsTable,
    });

    this.backtestStateMachineArn = backtesting.stateMachineArn;

    new CfnOutput(this, 'GrafanaUrl', {
      value: monitoring.grafanaUrl,
    });

    new CfnOutput(this, 'StateMachineArn', {
      value: backtesting.stateMachineArn,
    });

    new CfnOutput(this, 'ModelAlertsTopicArn', {
      value: alerting.modelAlertsTopic.topicArn,
    });

    new CfnOutput(this, 'DriftAlertsTopicArn', {
      value: alerting.driftAlertsTopic.topicArn,
    });
  }
}
