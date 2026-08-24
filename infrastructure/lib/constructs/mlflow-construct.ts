import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as path from 'path';

export interface MlflowConstructProps {
  readonly vpc: ec2.IVpc;
}

export class MlflowConstruct extends Construct {
  readonly loadBalancerDnsName: string;
  readonly mlflowTrackingUri: string;

  constructor(scope: Construct, id: string, props: MlflowConstructProps) {
    super(scope, id);

    const { vpc } = props;

    const dbName = 'mlflowdb';
    const port = 3306;
    const username = 'master';

    // ==================================================
    // ================== SECRET ========================
    // ==================================================
    const dbPasswordSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'mlflow/dbPassword',
      generateSecretString: {
        passwordLength: 20,
        excludePunctuation: true,
      },
    });

    // ==================================================
    // ================= S3 BUCKET ======================
    // ==================================================
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ==================================================
    // ================= IAM ROLE =======================
    // ==================================================
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Scoped-down S3 permissions: only the artifact bucket for MLflow storage
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
        resources: [artifactBucket.bucketArn, `${artifactBucket.bucketArn}/*`],
      })
    );

    // ==================================================
    // ================== DATABASE  =====================
    // ==================================================
    const sgRds = new ec2.SecurityGroup(this, 'SgRds', {
      vpc,
      securityGroupName: 'mlflow-sg-rds',
    });
    sgRds.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/16'),
      ec2.Port.tcp(port),
      'Allow MySQL from VPC'
    );

    const database = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_05_2,
      }),
      defaultDatabaseName: dbName,
      credentials: rds.Credentials.fromUsername(username, {
        password: dbPasswordSecret.secretValue,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      vpc,
      securityGroups: [sgRds],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==================================================
    // =============== FARGATE SERVICE ==================
    // ==================================================
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'mlflow',
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      taskRole,
      cpu: 4096,
      memoryLimitMiB: 8192,
    });

    const container = taskDefinition.addContainer('MlflowContainer', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../../../containers/mlflow')
      ),
      environment: {
        BUCKET: `s3://${artifactBucket.bucketName}`,
        HOST: database.clusterEndpoint.hostname,
        PORT: String(port),
        DATABASE: dbName,
        USERNAME: username,
      },
      secrets: {
        PASSWORD: ecs.Secret.fromSecretsManager(dbPasswordSecret),
      },
      logging: ecs.LogDriver.awsLogs({ streamPrefix: 'mlflow' }),
    });

    container.addPortMappings({
      containerPort: 5000,
      hostPort: 5000,
      protocol: ecs.Protocol.TCP,
    });

    const fargateService = new ecs_patterns.NetworkLoadBalancedFargateService(
      this,
      'MlflowService',
      {
        serviceName: 'mlflow',
        cluster,
        taskDefinition,
        listenerPort: 5000,
      }
    );

    // Setup security group
    fargateService.service.connections.securityGroups[0].addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/16'),
      ec2.Port.tcp(5000),
      'Allow inbound from VPC for mlflow'
    );

    // Setup autoscaling policy
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ==================================================
    // =================== OUTPUTS ======================
    // ==================================================
    this.loadBalancerDnsName = fargateService.loadBalancer.loadBalancerDnsName;
    this.mlflowTrackingUri = `http://${fargateService.loadBalancer.loadBalancerDnsName}:5000`;
  }
}
