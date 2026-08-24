import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FrontendHostingConstruct } from '../constructs/frontend-hosting-construct';
import { ApiGatewayConstruct } from '../constructs/api-gateway-construct';

export interface FrontendStackProps extends StackProps {
  readonly metadataTable: dynamodb.ITable;
  readonly deploymentHistoryTable: dynamodb.ITable;
  readonly sageMakerExecutionRole: iam.IRole;
  readonly backtestStateMachineArn: string;
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const frontendHosting = new FrontendHostingConstruct(this, 'FrontendHosting');

    const apiGateway = new ApiGatewayConstruct(this, 'ApiGateway', {
      metadataTable: props.metadataTable,
      deploymentHistoryTable: props.deploymentHistoryTable,
      sageMakerExecutionRole: props.sageMakerExecutionRole,
      backtestStateMachineArn: props.backtestStateMachineArn,
    });

    new CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${frontendHosting.distributionDomainName}`,
      description: 'CloudFront distribution URL for the frontend',
    });

    new CfnOutput(this, 'ApiGatewayUrl', {
      value: apiGateway.apiUrl,
      description: 'API Gateway URL for the BFF API',
    });
  }
}
