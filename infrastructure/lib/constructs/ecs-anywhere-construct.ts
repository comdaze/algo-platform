import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';

export interface EcsAnywhereConstructProps {
  readonly vpc: ec2.IVpc;
  readonly clusterName?: string;
}

export class EcsAnywhereConstruct extends Construct {
  readonly cluster: ecs.Cluster;
  readonly taskDefinition: ecs.TaskDefinition;
  readonly ecsExternalInstanceRole: iam.Role;

  constructor(scope: Construct, id: string, props: EcsAnywhereConstructProps) {
    super(scope, id);

    const clusterName = props.clusterName || 'algo-h20-cluster';

    // ECS Cluster with EXTERNAL capacity provider
    this.cluster = new ecs.Cluster(this, 'EcsAnywhereCluster', {
      vpc: props.vpc,
      clusterName,
      enableFargateCapacityProviders: false,
    });

    // EXTERNAL (ECS Anywhere) instances run tasks via the EXTERNAL launch type;
    // no Fargate/ASG default capacity-provider strategy applies to this cluster.

    // IAM role for ECS Anywhere external instances
    this.ecsExternalInstanceRole = new iam.Role(this, 'EcsExternalInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
      ],
    });

    // SSM Activation for external instance registration.
    // CloudFormation has no AWS::SSM::Activation resource type, so we create the
    // hybrid activation through a custom resource calling the SSM API at deploy time.
    const ssmActivation = new cr.AwsCustomResource(this, 'SsmActivation', {
      onCreate: {
        service: 'SSM',
        action: 'createActivation',
        parameters: {
          IamRole: this.ecsExternalInstanceRole.roleName,
          RegistrationLimit: 10,
          DefaultInstanceName: `${clusterName}-external-instance`,
          Description: `ECS Anywhere activation for ${clusterName}`,
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('ActivationId'),
      },
      onDelete: {
        service: 'SSM',
        action: 'deleteActivation',
        parameters: {
          ActivationId: new cr.PhysicalResourceIdReference(),
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:CreateActivation', 'ssm:DeleteActivation'],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [this.ecsExternalInstanceRole.roleArn],
        }),
      ]),
      // Use the Lambda built-in AWS SDK (SSM is included); avoids a deploy-time
      // npm fetch that is unreliable in the China regions.
      installLatestAwsSdk: false,
    });

    ssmActivation.node.addDependency(this.ecsExternalInstanceRole);

    // TaskDefinition for EXTERNAL compatibility (H20 workloads)
    this.taskDefinition = new ecs.TaskDefinition(this, 'H20TaskDefinition', {
      compatibility: ecs.Compatibility.EXTERNAL,
      cpu: '8192',
      memoryMiB: '32768',
    });

    // Container definition with placeholder image
    this.taskDefinition.addContainer('H20Container', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/python:3.11-slim'),
      memoryLimitMiB: 32768,
      cpu: 8192,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'h20-training',
      }),
      environment: {
        CLUSTER_NAME: clusterName,
      },
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
    });

    new cdk.CfnOutput(this, 'SsmActivationId', {
      value: ssmActivation.getResponseField('ActivationId'),
    });
  }
}
