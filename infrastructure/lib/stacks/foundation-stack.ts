import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { VpcConstruct } from '../constructs/vpc-construct';

export class FoundationStack extends Stack {
  readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct');
    this.vpc = vpcConstruct.vpc;

    new CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
    });
  }
}
