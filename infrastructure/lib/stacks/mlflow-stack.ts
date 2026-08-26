import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { MlflowConstruct } from '../constructs/mlflow-construct';

export interface MlflowStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
}

export class MlflowStack extends Stack {
  readonly mlflowHost: string;

  constructor(scope: Construct, id: string, props: MlflowStackProps) {
    super(scope, id, props);

    const mlflow = new MlflowConstruct(this, 'MlflowConstruct', {
      vpc: props.vpc,
    });

    // Authority (host:port) the nginx reverse-proxy targets for /mlflow/*.
    this.mlflowHost = `${mlflow.loadBalancerDnsName}:5000`;

    new CfnOutput(this, 'MlflowTrackingUri', {
      value: mlflow.mlflowTrackingUri,
    });
  }
}
