import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class RollbackConstruct extends Construct {
  readonly rollbackFunctionArn: string;
  readonly deploymentHistoryTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // DynamoDB table for deployment history
    this.deploymentHistoryTable = new dynamodb.Table(this, 'DeploymentHistoryTable', {
      tableName: 'algo-deployment-history',
      partitionKey: { name: 'endpointName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'deployedAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lambda function for rollback operations
    const rollbackFunction = new lambda.Function(this, 'RollbackFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambdas/rollback')),
      timeout: cdk.Duration.seconds(120),
      environment: {
        DEPLOYMENT_HISTORY_TABLE: this.deploymentHistoryTable.tableName,
        REGION: stack.region,
      },
    });

    // Permissions for SageMaker endpoint operations
    rollbackFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:DescribeEndpoint',
          'sagemaker:UpdateEndpoint',
          'sagemaker:CreateEndpointConfig',
          'sagemaker:DescribeEndpointConfig',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:endpoint/*`,
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:endpoint-config/*`,
        ],
      })
    );

    // DynamoDB read/write permissions
    this.deploymentHistoryTable.grantReadWriteData(rollbackFunction);

    this.rollbackFunctionArn = rollbackFunction.functionArn;

    new cdk.CfnOutput(this, 'RollbackFunctionArn', {
      value: rollbackFunction.functionArn,
    });

    new cdk.CfnOutput(this, 'DeploymentHistoryTableName', {
      value: this.deploymentHistoryTable.tableName,
    });
  }
}
