import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { AutoMlConstruct } from '../constructs/automl-construct';

export interface AutoMlStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
  readonly dataBucket: s3.IBucket;
}

export class AutoMlStack extends Stack {
  readonly imageUri: string;
  readonly processingRole: iam.IRole;
  readonly runsTable: dynamodb.ITable;
  readonly jobSecurityGroupId: string;

  constructor(scope: Construct, id: string, props: AutoMlStackProps) {
    super(scope, id, props);

    const automl = new AutoMlConstruct(this, 'AutoMl', {
      vpc: props.vpc,
      dataBucket: props.dataBucket,
    });

    this.imageUri = automl.imageUri;
    this.processingRole = automl.processingRole;
    this.runsTable = automl.runsTable;
    this.jobSecurityGroupId = automl.jobSecurityGroup.securityGroupId;
  }
}
