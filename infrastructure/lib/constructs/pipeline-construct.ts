import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export interface PipelineConstructProps {
  readonly projectName: string;
  readonly dataManifestBucket: s3.IBucket;
  readonly sageMakerArtifactBucket: s3.IBucket;
  readonly sageMakerExecutionRole: iam.IRole;
}

export class PipelineConstruct extends Construct {
  readonly pipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.pipeline = new codepipeline.Pipeline(this, 'MLOpsPipeline', {
      restartExecutionOnUpdate: true,
    });

    const sourceCodeOutput = new codepipeline.Artifact('SourceCodeOutput');
    const sourceDataOutput = new codepipeline.Artifact('SourceDataOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');
    const pipelineOutput = new codepipeline.Artifact('PipelineOutput');

    // Source stage - CodeCommit
    const sourceRepo = new codecommit.Repository(this, 'SourceRepository', {
      repositoryName: props.projectName,
    });

    const sourceCode = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'SourceCode',
      output: sourceCodeOutput,
      repository: sourceRepo,
      branch: 'main',
    });

    const sourceData = new codepipeline_actions.S3SourceAction({
      actionName: 'SourceData',
      output: sourceDataOutput,
      bucket: props.dataManifestBucket,
      bucketKey: 'manifest.json.zip',
    });

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [sourceCode, sourceData],
    });

    // CI stage
    const buildProject = new codebuild.PipelineProject(this, 'CIBuild', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/build.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
    });

    const build = new codepipeline_actions.CodeBuildAction({
      actionName: 'CIBuild',
      project: buildProject,
      input: sourceCodeOutput,
      extraInputs: [sourceDataOutput],
      outputs: [buildOutput],
    });

    this.pipeline.addStage({
      stageName: 'CI',
      actions: [build],
    });

    // MLPipeline stage
    const mlPipelineRole = new iam.Role(this, 'MLPipelineRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    mlPipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:CreateBucket', 's3:GetObject', 's3:PutObject', 's3:ListBucket'],
        resources: [
          props.sageMakerArtifactBucket.bucketArn,
          `${props.sageMakerArtifactBucket.bucketArn}/*`,
        ],
      })
    );

    mlPipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:CreatePipeline',
          'sagemaker:ListTags',
          'sagemaker:AddTags',
          'sagemaker:UpdatePipeline',
          'sagemaker:DescribePipeline',
          'sagemaker:StartPipelineExecution',
          'sagemaker:DescribePipelineExecution',
          'sagemaker:ListPipelineExecutionSteps',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:pipeline/${props.projectName}`,
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:pipeline/${props.projectName}/*`,
        ],
      })
    );

    mlPipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.sageMakerExecutionRole.roleArn],
      })
    );

    const mlPipelineProject = new codebuild.PipelineProject(this, 'MLPipeline', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/pipeline.yml'),
      role: mlPipelineRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
    });

    const mlPipelineAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'MLPipeline',
      project: mlPipelineProject,
      input: buildOutput,
      outputs: [pipelineOutput],
      environmentVariables: {
        SAGEMAKER_ARTIFACT_BUCKET: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.sageMakerArtifactBucket.bucketName,
        },
        SAGEMAKER_PIPELINE_ROLE_ARN: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.sageMakerExecutionRole.roleArn,
        },
        SAGEMAKER_PROJECT_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.projectName,
        },
      },
    });

    this.pipeline.addStage({
      stageName: 'MLPipeline',
      actions: [mlPipelineAction],
    });

    // Approval stage
    const deploymentApprovalTopic = new sns.Topic(this, 'ModelDeploymentApprovalTopic', {
      topicName: 'ModelDeploymentApprovalTopic',
    });

    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approval',
      runOrder: 1,
      notificationTopic: deploymentApprovalTopic,
      additionalInformation: `A new model version for project ${props.projectName} is waiting for approval`,
    });

    this.pipeline.addStage({
      stageName: 'Approval',
      actions: [manualApprovalAction],
    });

    // Deploy stage
    const deployRole = new iam.Role(this, 'DeployRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DeleteChangeSet',
          'cloudformation:GetTemplate',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:cloudformation:${stack.region}:${stack.account}:stack/CDKToolkit/*`,
          `arn:${cdk.Aws.PARTITION}:cloudformation:${stack.region}:${stack.account}:stack/Deployment-${props.projectName}/*`,
        ],
      })
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*Object', 's3:ListBucket', 's3:GetBucketLocation'],
        resources: [`arn:${cdk.Aws.PARTITION}:s3:::cdktoolkit-stagingbucket-*`],
      })
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:${cdk.Aws.PARTITION}:ssm:${stack.region}:${stack.account}:parameter/cdk-bootstrap/*`,
        ],
      })
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole', 'iam:PassRole'],
        resources: [`arn:${cdk.Aws.PARTITION}:iam::${stack.account}:role/cdk*`],
      })
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sagemaker:*Endpoint*'],
        resources: ['*'],
      })
    );

    const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/deploy.yml'),
      role: deployRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
    });

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      project: deployProject,
      input: buildOutput,
      extraInputs: [pipelineOutput],
    });

    this.pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });
  }
}
