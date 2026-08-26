import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import * as fs from 'fs';

export class FrontendHostingConstruct extends Construct {
  readonly websiteBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Company security policy forbids any public S3 access, and CloudFront is
    // not available in the AWS China partition. So the bucket is fully PRIVATE
    // (Block Public Access = all on, no public bucket policy, no S3 website
    // endpoint). The built assets live here privately; serving to users is done
    // through a separate private/internal mechanism, never a public endpoint.
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload the built frontend assets into the private bucket if present.
    const distPath = path.join(__dirname, '..', '..', '..', 'frontend', 'dist');
    if (fs.existsSync(distPath)) {
      new s3deploy.BucketDeployment(this, 'DeployWebsite', {
        sources: [s3deploy.Source.asset(distPath)],
        destinationBucket: this.websiteBucket,
      });
    }
  }
}
