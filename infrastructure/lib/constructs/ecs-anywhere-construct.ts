import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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

    const clusterName = props.clusterName || 'goldwind-h20-cluster';

    // ECS Cluster with EXTERNAL capacity provider
    this.cluster = new ecs.Cluster(this, 'EcsAnywhereCluster', {
      vpc: props.vpc,
      clusterName,
      enableFargateCapacityProviders: false,
    });

    this.cluster.addDefaultCapacityProviderStrategy([
      { capacityProvider: 'FARGATE' },
    ]);

    // IAM role for ECS Anywhere external instances
    this.ecsExternalInstanceRole = new iam.Role(this, 'EcsExternalInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
      ],
    });

    // SSM Activation for external instance registration
    const ssmActivation = new ssm.CfnActivation(this, 'SsmActivation', {
      iamRole: this.ecsExternalInstanceRole.roleName,
      registrationLimit: 10,
      defaultInstanceName: `${clusterName}-external-instance`,
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
      value: ssmActivation.attrActivationId,
    });
  }
}
