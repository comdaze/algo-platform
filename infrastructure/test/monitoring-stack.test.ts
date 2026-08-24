import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

describe('MonitoringStack', () => {
  let app: cdk.App;
  let stack: MonitoringStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();

    const env = { region: 'cn-northwest-1', account: '123456789012' };

    // Create prerequisite stacks
    const vpcStack = new cdk.Stack(app, 'VpcStack', { env });
    const vpc = new ec2.Vpc(vpcStack, 'Vpc');

    const dataStack = new cdk.Stack(app, 'DataStack', { env });
    const sageMakerExecutionRole = new iam.Role(dataStack, 'SageMakerRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
    });
    const dataBucket = new s3.Bucket(dataStack, 'DataBucket');
    const artifactBucket = new s3.Bucket(dataStack, 'ArtifactBucket');

    stack = new MonitoringStack(app, 'TestMonitoringStack', {
      env,
      vpc,
      sageMakerExecutionRole,
      dataBucket,
      artifactBucket,
    });

    template = Template.fromStack(stack);
  });

  test('creates Grafana ECS service', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      LaunchType: 'FARGATE',
    });
  });

  test('creates DynamoDB table for backtest results', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'goldwind-backtest-results',
      KeySchema: [
        { AttributeName: 'algorithmId', KeyType: 'HASH' },
        { AttributeName: 'backtestId', KeyType: 'RANGE' },
      ],
    });
  });

  test('creates Step Functions state machine', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineName: 'backtest-workflow',
    });
  });

  test('creates SNS topics for alerts', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'goldwind-model-alerts',
    });
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'goldwind-drift-alerts',
    });
  });

  test('creates Application Load Balancer for Grafana', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
      Type: 'application',
    });
  });

  test('has CfnOutputs', () => {
    template.hasOutput('GrafanaUrl', {});
    template.hasOutput('StateMachineArn', {});
    template.hasOutput('ModelAlertsTopicArn', {});
    template.hasOutput('DriftAlertsTopicArn', {});
  });
});
