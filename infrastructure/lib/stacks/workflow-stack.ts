import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EcsAnywhereConstruct } from '../constructs/ecs-anywhere-construct';
import { CallbackConstruct } from '../constructs/callback-construct';
import { RollbackConstruct } from '../constructs/rollback-construct';

export interface WorkflowStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
  readonly sageMakerExecutionRole: iam.IRole;
}

export class WorkflowStack extends Stack {
  readonly deploymentHistoryTable: dynamodb.Table;
  readonly rollbackFunctionArn: string;

  constructor(scope: Construct, id: string, props: WorkflowStackProps) {
    super(scope, id, props);

    const ecsAnywhere = new EcsAnywhereConstruct(this, 'EcsAnywhere', {
      vpc: props.vpc,
    });

    const callback = new CallbackConstruct(this, 'Callback', {
      sageMakerExecutionRole: props.sageMakerExecutionRole,
    });

    const rollback = new RollbackConstruct(this, 'Rollback');

    this.deploymentHistoryTable = rollback.deploymentHistoryTable;
    this.rollbackFunctionArn = rollback.rollbackFunctionArn;

    new CfnOutput(this, 'CallbackQueueUrl', {
      value: callback.callbackQueueUrl,
    });

    new CfnOutput(this, 'RollbackFunctionArn', {
      value: rollback.rollbackFunctionArn,
    });

    new CfnOutput(this, 'EcsClusterArn', {
      value: ecsAnywhere.cluster.clusterArn,
    });
  }
}
