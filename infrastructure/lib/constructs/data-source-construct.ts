import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class DataSourceConstruct extends Construct {
  readonly dataBucket: s3.Bucket;
  readonly dataManifestBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dataBucket = new s3.Bucket(this, 'DataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
    });

    this.dataManifestBucket = new s3.Bucket(this, 'DataManifestBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
    });

    const newDataTopic = new sns.Topic(this, 'NewDataTopic');

    this.dataBucket.addObjectCreatedNotification(
      new s3n.SnsDestination(newDataTopic)
    );
  }
}
