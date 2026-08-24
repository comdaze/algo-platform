import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { MlflowConstruct } from '../constructs/mlflow-construct';

export interface MlflowStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
}

export class MlflowStack extends Stack {
  constructor(scope: Construct, id: string, props: MlflowStackProps) {
    super(scope, id, props);

    const mlflow = new MlflowConstruct(this, 'MlflowConstruct', {
      vpc: props.vpc,
    });

    new CfnOutput(this, 'MlflowTrackingUri', {
      value: mlflow.mlflowTrackingUri,
    });
  }
}
