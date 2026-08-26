import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

export interface MonitoringConstructProps {
  readonly vpc: ec2.IVpc;
  readonly dataBucket: s3.IBucket;
}

export class MonitoringConstruct extends Construct {
  readonly grafanaUrl: string;
  readonly evidentlyReportBucket: s3.Bucket;
  readonly grafanaService: ecs.FargateService;
  readonly evidentlyService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // ECS Cluster for monitoring services
    const cluster = new ecs.Cluster(this, 'MonitoringCluster', {
      vpc: props.vpc,
      clusterName: 'algo-monitoring-cluster',
    });

    // Secrets Manager secret for Grafana admin password
    const grafanaAdminPassword = new secretsmanager.Secret(this, 'GrafanaAdminPassword', {
      secretName: 'algo/grafana/admin-password',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 16,
      },
    });

    // --- Grafana Service ---
    const grafanaTaskDef = new ecs.FargateTaskDefinition(this, 'GrafanaTaskDef', {
      cpu: 2048,
      memoryLimitMiB: 4096,
    });

    grafanaTaskDef.addContainer('GrafanaContainer', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../../containers/grafana')),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        // Served behind the frontend nginx at /grafana/ (same origin as the SPA).
        // serve_from_sub_path needs the PATH portion of root_url to be /grafana/;
        // the domain is irrelevant for sub-path routing (the iframe is same-origin),
        // so a literal localhost host is fine and avoids the invalid %(http_host)s
        // variable (only %(protocol)s/%(domain)s/%(http_port)s are valid — an
        // invalid var makes root_url unparseable and silently disables sub-path).
        GF_SERVER_ROOT_URL: 'http://localhost:3000/grafana/',
        GF_SERVER_SERVE_FROM_SUB_PATH: 'true',
        // Allow the dashboards to be rendered inside the platform's <iframe>.
        GF_SECURITY_ALLOW_EMBEDDING: 'true',
        // Anonymous read-only access so the embedded panels render without a login.
        GF_AUTH_ANONYMOUS_ENABLED: 'true',
        GF_AUTH_ANONYMOUS_ORG_ROLE: 'Viewer',
      },
      secrets: {
        GF_SECURITY_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(grafanaAdminPassword),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'grafana',
      }),
    });

    // Grafana ALB Security Group - restricted to VPC CIDR for internal access only
    const grafanaAlbSg = new ec2.SecurityGroup(this, 'GrafanaAlbSg', {
      vpc: props.vpc,
      description: 'Security group for Grafana ALB',
      allowAllOutbound: true,
    });
    // Restrict access to internal VPC traffic only (10.0.0.0/8 covers typical private ranges).
    // For production, configure TLS termination with an ACM certificate on port 443.
    grafanaAlbSg.addIngressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.tcp(80), 'Allow HTTP from internal network');

    // Grafana Service Security Group
    const grafanaServiceSg = new ec2.SecurityGroup(this, 'GrafanaServiceSg', {
      vpc: props.vpc,
      description: 'Security group for Grafana service',
      allowAllOutbound: true,
    });
    grafanaServiceSg.addIngressRule(grafanaAlbSg, ec2.Port.tcp(3000), 'Allow from ALB');

    // ALB for Grafana - internal-facing to prevent public exposure
    const grafanaAlb = new elbv2.ApplicationLoadBalancer(this, 'GrafanaAlb', {
      vpc: props.vpc,
      internetFacing: false,
      securityGroup: grafanaAlbSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // TODO: Configure TLS termination with an ACM certificate for production.
    // Currently using HTTP on an internal ALB restricted to VPC access.
    const grafanaListener = grafanaAlb.addListener('GrafanaListener', {
      port: 80,
    });

    this.grafanaService = new ecs.FargateService(this, 'GrafanaService', {
      cluster,
      taskDefinition: grafanaTaskDef,
      desiredCount: 1,
      securityGroups: [grafanaServiceSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    grafanaListener.addTargets('GrafanaTarget', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.grafanaService],
      healthCheck: {
        // With serve_from_sub_path, the health endpoint is under /grafana.
        // Accept 200 OR 302 so a redirect can never stall the ECS rollout
        // (a responding Grafana is healthy either way).
        path: '/grafana/api/health',
        healthyHttpCodes: '200,302',
        interval: cdk.Duration.seconds(30),
      },
    });

    // Grafana Auto-scaling
    const grafanaScaling = this.grafanaService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2,
    });
    grafanaScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    this.grafanaUrl = grafanaAlb.loadBalancerDnsName;

    // --- Evidently Service ---
    this.evidentlyReportBucket = new s3.Bucket(this, 'EvidentlyReportBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    const evidentlyTaskDef = new ecs.FargateTaskDefinition(this, 'EvidentlyTaskDef', {
      cpu: 2048,
      memoryLimitMiB: 4096,
    });

    evidentlyTaskDef.addContainer('EvidentlyContainer', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../../containers/evidently')),
      portMappings: [{ containerPort: 8000 }],
      environment: {
        REPORT_BUCKET: this.evidentlyReportBucket.bucketName,
        REFERENCE_DATA_PATH: 's3://reference-data/reference.csv',
        CURRENT_DATA_PATH: 's3://current-data/current.csv',
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'evidently',
      }),
    });

    // Grant S3 write to Evidently task role
    this.evidentlyReportBucket.grantReadWrite(evidentlyTaskDef.taskRole);

    // Evidently Security Group - only from VPC CIDR
    const evidentlySg = new ec2.SecurityGroup(this, 'EvidentlySg', {
      vpc: props.vpc,
      description: 'Security group for Evidently service',
      allowAllOutbound: true,
    });
    evidentlySg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(8000),
      'Allow from VPC CIDR'
    );

    this.evidentlyService = new ecs.FargateService(this, 'EvidentlyService', {
      cluster,
      taskDefinition: evidentlyTaskDef,
      desiredCount: 0,
      securityGroups: [evidentlySg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // EventBridge rule to run Evidently every 6 hours
    new events.Rule(this, 'EvidentlyScheduleRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      targets: [new targets.EcsTask({
        cluster,
        taskDefinition: evidentlyTaskDef,
        taskCount: 1,
        subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [evidentlySg],
      })],
    });

    new cdk.CfnOutput(this, 'GrafanaUrl', {
      value: grafanaAlb.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'EvidentlyReportBucketName', {
      value: this.evidentlyReportBucket.bucketName,
    });
  }
}
