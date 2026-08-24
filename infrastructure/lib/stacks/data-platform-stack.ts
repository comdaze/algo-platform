import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DataSourceConstruct } from '../constructs/data-source-construct';
import { SageMakerConstruct } from '../constructs/sagemaker-construct';

export class DataPlatformStack extends Stack {
  readonly dataManifestBucket: s3.Bucket;
  readonly sageMakerArtifactBucket: s3.Bucket;
  readonly sageMakerExecutionRole: iam.Role;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dataSource = new DataSourceConstruct(this, 'DataSource');

    const sageMaker = new SageMakerConstruct(this, 'SageMaker', {
      dataBucket: dataSource.dataBucket,
    });

    this.dataManifestBucket = dataSource.dataManifestBucket;
    this.sageMakerArtifactBucket = sageMaker.sagemakerArtifactBucket;
    this.sageMakerExecutionRole = sageMaker.sagemakerExecutionRole;

    new CfnOutput(this, 'DataBucketName', {
      value: dataSource.dataBucket.bucketName,
    });

    new CfnOutput(this, 'DataManifestBucketName', {
      value: dataSource.dataManifestBucket.bucketName,
    });

    new CfnOutput(this, 'SageMakerArtifactBucketName', {
      value: sageMaker.sagemakerArtifactBucket.bucketName,
    });

    new CfnOutput(this, 'SageMakerExecutionRoleArn', {
      value: sageMaker.sagemakerExecutionRole.roleArn,
    });
  }
}
