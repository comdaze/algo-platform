import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface ModelDeployConstructProps {
  readonly projectName: string;
  readonly vpc: ec2.IVpc;
}

export class ModelDeployConstruct extends Construct {
  readonly endpointName: string;
  readonly endpointArn: string;

  constructor(scope: Construct, id: string, props: ModelDeployConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // SageMaker model execution role
    const modelExecutionRole = new iam.Role(this, 'ModelExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Custom Resource Lambda role
    const pipelineModelFunctionRole = new iam.Role(this, 'PipelineModelFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    pipelineModelFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:CreateModel',
          'sagemaker:DeleteModel',
          'sagemaker:DescribeModelPackage',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:model/${props.projectName}*`,
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:model-package/*`,
        ],
      })
    );

    pipelineModelFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [modelExecutionRole.roleArn],
      })
    );

    // Custom Resource Lambda for creating SageMaker model from model package
    const pipelineModelFunction = new lambda.Function(this, 'PipelineModelFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { SageMaker } = require('@aws-sdk/client-sagemaker');
const sagemaker = new SageMaker({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const props = event.ResourceProperties;
  const requestType = event.RequestType;

  if (requestType === 'Create' || requestType === 'Update') {
    const date = new Date();
    const modelName = props.projectName + '-' + date.getTime();
    const modelPackage = await sagemaker.describeModelPackage({
      ModelPackageName: props.modelPackageName,
    });
    await sagemaker.createModel({
      ModelName: modelName,
      Containers: (modelPackage.InferenceSpecification?.Containers || []).map((c) => ({
        Image: c.Image,
        ModelDataUrl: c.ModelDataUrl,
        Environment: c.Environment,
      })),
      ExecutionRoleArn: props.sagemakerExecutionRole,
    });
    return { PhysicalResourceId: modelName, Data: { ModelName: modelName } };
  } else if (requestType === 'Delete') {
    const modelName = event.PhysicalResourceId;
    try { await sagemaker.deleteModel({ ModelName: modelName }); } catch (e) { console.log('Delete error:', e); }
    return { PhysicalResourceId: modelName };
  }
  return { PhysicalResourceId: event.PhysicalResourceId || 'unknown' };
};
      `),
      timeout: cdk.Duration.minutes(2),
      role: pipelineModelFunctionRole,
    });

    const pipelineModelProvider = new cr.Provider(this, 'PipelineModelProvider', {
      onEventHandler: pipelineModelFunction,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    const modelPackageNameParam = new cdk.CfnParameter(this, 'ModelPackageName', {
      type: 'String',
      default: `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:model-package/${props.projectName}/1`,
    });

    const pipelineModelResource = new cdk.CustomResource(this, 'PipelineModelResource', {
      serviceToken: pipelineModelProvider.serviceToken,
      properties: {
        modelPackageName: modelPackageNameParam.valueAsString,
        sagemakerExecutionRole: modelExecutionRole.roleArn,
        projectName: props.projectName,
      },
    });

    pipelineModelResource.node.addDependency(modelExecutionRole);

    // Endpoint Config
    const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'EndpointConfig', {
      productionVariants: [
        {
          initialInstanceCount: 1,
          initialVariantWeight: 1.0,
          instanceType: 'ml.g4dn.xlarge',
          modelName: pipelineModelResource.ref,
          variantName: 'AllTraffic',
        },
      ],
    });

    endpointConfig.node.addDependency(pipelineModelResource);

    // Endpoint
    const endpoint = new sagemaker.CfnEndpoint(this, 'Endpoint', {
      endpointConfigName: endpointConfig.getAtt('EndpointConfigName').toString(),
    });

    endpoint.node.addDependency(endpointConfig);

    this.endpointName = endpoint.getAtt('EndpointName').toString();
    this.endpointArn = endpoint.ref;

    new cdk.CfnOutput(this, 'EndpointNameOutput', {
      value: this.endpointName,
    });

    new cdk.CfnOutput(this, 'EndpointArnOutput', {
      value: this.endpointArn,
    });
  }
}
