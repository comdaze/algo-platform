import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as path from 'path';

export interface FrontendServiceConstructProps {
  readonly vpc: ec2.IVpc;
  readonly apiHost: string;
  readonly grafanaHost: string;
  readonly mlflowHost: string;
}

/**
 * Frontend hosting via an nginx container (image in ECR) behind an
 * internet-facing ALB on Fargate. Inbound is restricted to a customer-managed
 * prefix list — you add your allowed public IP CIDRs to it manually; the ALB
 * is unreachable until you do.
 *
 * NOTE: access control is network-level (SG + prefix list) only; there is no
 * application-layer auth, and the listener is plain HTTP (no TLS). Add an ACM
 * cert + HTTPS listener before serving anything sensitive.
 */
export class FrontendServiceConstruct extends Construct {
  readonly loadBalancerDnsName: string;
  readonly allowlistPrefixListId: string;

  constructor(scope: Construct, id: string, props: FrontendServiceConstructProps) {
    super(scope, id);

    const cluster = new ecs.Cluster(this, 'FrontendCluster', {
      vpc: props.vpc,
      clusterName: 'algo-frontend-cluster',
    });

    // Customer-managed prefix list for the ALB allowlist. Starts EMPTY —
    // add your public IP CIDRs manually (console/CLI) to grant access.
    const allowlist = new ec2.PrefixList(this, 'FrontendAllowlist', {
      prefixListName: 'algo-frontend-allowlist',
      addressFamily: ec2.AddressFamily.IP_V4,
      maxEntries: 20,
    });

    // ALB security group — inbound ONLY from the allowlist prefix list on :80.
    const albSg = new ec2.SecurityGroup(this, 'FrontendAlbSg', {
      vpc: props.vpc,
      description: 'algo frontend ALB - ingress restricted to the allowlist prefix list',
      allowAllOutbound: true,
    });
    albSg.addIngressRule(
      ec2.Peer.prefixList(allowlist.prefixListId),
      ec2.Port.tcp(80),
      'HTTP from allowlisted public IPs (managed prefix list)'
    );

    // Service security group — inbound only from the ALB.
    const serviceSg = new ec2.SecurityGroup(this, 'FrontendServiceSg', {
      vpc: props.vpc,
      description: 'algo frontend nginx service',
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(albSg, ec2.Port.tcp(80), 'from ALB');

    const taskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    taskDef.addContainer('NginxContainer', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../../frontend'), {
        file: 'Dockerfile.nginx',
      }),
      portMappings: [{ containerPort: 80 }],
      environment: {
        // Injected into nginx.conf.template via the entrypoint envsubst.
        API_HOST: props.apiHost,
        // Internal upstreams for the reverse-proxied embeds (in-VPC only).
        GRAFANA_HOST: props.grafanaHost,
        MLFLOW_HOST: props.mlflowHost,
        // Substitute ONLY these three vars — protects nginx's own $uri/$1/$host
        // /$http_* etc. Anchored alternation so nothing else is touched.
        NGINX_ENVSUBST_FILTER: '^(API_HOST|GRAFANA_HOST|MLFLOW_HOST)$',
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'frontend-nginx' }),
    });

    const service = new ecs.FargateService(this, 'FrontendService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      securityGroups: [serviceSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Internet-facing ALB in the public subnets.
    const alb = new elbv2.ApplicationLoadBalancer(this, 'FrontendAlb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // open:false so CDK does NOT add a 0.0.0.0/0 ingress rule — the prefix-list
    // rule above is the only inbound path.
    const listener = alb.addListener('HttpListener', { port: 80, open: false });
    listener.addTargets('FrontendTarget', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/healthz',
        interval: cdk.Duration.seconds(30),
      },
    });

    this.loadBalancerDnsName = alb.loadBalancerDnsName;
    this.allowlistPrefixListId = allowlist.prefixListId;
  }
}
