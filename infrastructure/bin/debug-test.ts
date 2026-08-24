import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

const app = new cdk.App();
const env = { region: 'cn-northwest-1', account: '123456789012' };
const vpcStack = new cdk.Stack(app, 'VpcStack', { env });
const vpc = new ec2.Vpc(vpcStack, 'Vpc');
const dataStack = new cdk.Stack(app, 'DataStack', { env });
const role = new iam.Role(dataStack, 'Role', { assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com') });
const bucket1 = new s3.Bucket(dataStack, 'B1');
const bucket2 = new s3.Bucket(dataStack, 'B2');

try {
  const ms = new MonitoringStack(app, 'MS', { env, vpc, sageMakerExecutionRole: role, dataBucket: bucket1, artifactBucket: bucket2 });
  console.log('Stack created OK');
  app.synth();
  console.log('Synth OK');
} catch (e: any) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
