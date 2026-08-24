import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class MetadataConstruct extends Construct {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // DynamoDB Table
    this.table = new dynamodb.Table(this, 'AlgorithmMetadataTable', {
      partitionKey: { name: 'algorithmId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function for standalone CRUD (used by pipeline/internal services)
    const crudFunction = new lambda.Function(this, 'MetadataCrudFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../lambdas/metadata-crud')
      ),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });

    // Grant Lambda read/write on DynamoDB table
    this.table.grantReadWriteData(crudFunction);

    // The canonical API surface is the ApiGatewayConstruct in FrontendStack.
    // This construct only provides the table and internal CRUD Lambda.
  }
}
