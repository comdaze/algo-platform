import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PipelineConstruct } from '../constructs/pipeline-construct';

export interface PipelineStackProps extends StackProps {
  readonly projectName: string;
  readonly dataManifestBucket: s3.IBucket;
  readonly sageMakerArtifactBucket: s3.IBucket;
  readonly sageMakerExecutionRole: iam.IRole;
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const pipelineConstruct = new PipelineConstruct(this, 'PipelineConstruct', {
      projectName: props.projectName,
      dataManifestBucket: props.dataManifestBucket,
      sageMakerArtifactBucket: props.sageMakerArtifactBucket,
      sageMakerExecutionRole: props.sageMakerExecutionRole,
    });

    new CfnOutput(this, 'PipelineName', {
      value: pipelineConstruct.pipeline.pipelineName,
    });
  }
}
