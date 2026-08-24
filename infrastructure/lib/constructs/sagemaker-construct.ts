import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface SageMakerConstructProps {
  readonly dataBucket: s3.IBucket;
}

export class SageMakerConstruct extends Construct {
  readonly sagemakerExecutionRole: iam.Role;
  readonly sagemakerArtifactBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SageMakerConstructProps) {
    super(scope, id);

    this.sagemakerArtifactBucket = new s3.Bucket(this, 'SageMakerArtifactBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // NOTE: AmazonSageMakerFullAccess is used here for development convenience.
    // For production, scope this down to only the specific SageMaker actions required
    // (e.g., CreateTrainingJob, CreateProcessingJob, CreateModel, etc.) on specific resources.
    this.sagemakerExecutionRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Allow read access to data bucket
    this.sagemakerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [props.dataBucket.bucketArn, `${props.dataBucket.bucketArn}/*`],
      })
    );

    // Allow read/write access to artifact bucket
    this.sagemakerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
        resources: [
          this.sagemakerArtifactBucket.bucketArn,
          `${this.sagemakerArtifactBucket.bucketArn}/*`,
        ],
      })
    );
  }
}
