import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { FrontendServiceConstruct } from '../constructs/frontend-service-construct';
import { ApiGatewayConstruct } from '../constructs/api-gateway-construct';

export interface FrontendStackProps extends StackProps {
  readonly vpc: ec2.IVpc;
  readonly metadataTable: dynamodb.ITable;
  readonly deploymentHistoryTable: dynamodb.ITable;
  readonly sageMakerExecutionRole: iam.IRole;
  readonly backtestStateMachineArn: string;
  readonly rollbackFunctionArn: string;
  readonly grafanaHost: string;
  readonly mlflowHost: string;
  readonly automlImageUri: string;
  readonly automlProcessingRoleArn: string;
  readonly automlRunsTable: dynamodb.ITable;
  readonly automlJobSecurityGroupId: string;
  readonly automlDataBucket: s3.IBucket;
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const apiGateway = new ApiGatewayConstruct(this, 'ApiGateway', {
      vpc: props.vpc,
      metadataTable: props.metadataTable,
      deploymentHistoryTable: props.deploymentHistoryTable,
      sageMakerExecutionRole: props.sageMakerExecutionRole,
      backtestStateMachineArn: props.backtestStateMachineArn,
      rollbackFunctionArn: props.rollbackFunctionArn,
      automlImageUri: props.automlImageUri,
      automlProcessingRoleArn: props.automlProcessingRoleArn,
      automlRunsTable: props.automlRunsTable,
      automlJobSecurityGroupId: props.automlJobSecurityGroupId,
      automlDataBucket: props.automlDataBucket,
      mlflowHost: props.mlflowHost,
    });

    const frontendService = new FrontendServiceConstruct(this, 'FrontendService', {
      vpc: props.vpc,
      apiHost: apiGateway.apiHost,
      grafanaHost: props.grafanaHost,
      mlflowHost: props.mlflowHost,
    });

    new CfnOutput(this, 'FrontendUrl', {
      value: `http://${frontendService.loadBalancerDnsName}`,
      description: 'Frontend ALB URL (reachable only from IPs in the allowlist prefix list); /api/* is proxied to the private API',
    });

    new CfnOutput(this, 'FrontendAllowlistPrefixListId', {
      value: frontendService.allowlistPrefixListId,
      description: 'Add your public IP CIDRs to this managed prefix list to grant access',
    });

    new CfnOutput(this, 'ApiGatewayUrl', {
      value: apiGateway.apiUrl,
      description: 'Private API Gateway invoke URL (reachable only in-VPC via the interface endpoint)',
    });
  }
}
