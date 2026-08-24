import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface ApiGatewayConstructProps {
  readonly metadataTable: dynamodb.ITable;
  readonly deploymentHistoryTable: dynamodb.ITable;
  readonly sageMakerExecutionRole: iam.IRole;
  readonly backtestStateMachineArn: string;
  readonly rollbackFunctionArn: string;
}

export class ApiGatewayConstruct extends Construct {
  readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // Single Lambda handler using NodejsFunction with esbuild bundling
    const apiHandler = new lambdaNodejs.NodejsFunction(this, 'ApiHandler', {
      entry: path.join(__dirname, '../../../lambdas/api-handler/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        METADATA_TABLE: props.metadataTable.tableName,
        DEPLOYMENT_HISTORY_TABLE: props.deploymentHistoryTable.tableName,
        REGION: stack.region,
        BACKTEST_STATE_MACHINE_ARN: props.backtestStateMachineArn,
        ROLLBACK_FUNCTION_NAME: cdk.Fn.select(
          6,
          cdk.Fn.split(':', props.rollbackFunctionArn)
        ),
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    // IAM Permissions: DynamoDB read/write on both tables
    props.metadataTable.grantReadWriteData(apiHandler);
    props.deploymentHistoryTable.grantReadWriteData(apiHandler);

    // IAM Permissions: SageMaker describe/list pipelines and executions
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:ListPipelineExecutions',
          'sagemaker:DescribePipelineExecution',
          'sagemaker:ListPipelineExecutionSteps',
          'sagemaker:SendPipelineExecutionStepSuccess',
          'sagemaker:ListPipelines',
          'sagemaker:DescribePipeline',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:pipeline/*`,
        ],
      })
    );

    // IAM Permissions: Step Functions start execution
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'states:StartExecution',
          'states:DescribeExecution',
        ],
        resources: [
          props.backtestStateMachineArn,
          `${props.backtestStateMachineArn}:*`,
          `arn:${cdk.Aws.PARTITION}:states:${stack.region}:${stack.account}:execution:*:*`,
        ],
      })
    );

    // IAM Permissions: Lambda invoke (for rollback function)
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [props.rollbackFunctionArn],
      })
    );

    // API Gateway REST API (REGIONAL for China region) with IAM authorization
    const api = new apigateway.RestApi(this, 'AlgoPlatformApi', {
      restApiName: 'goldwind-algo-platform-api',
      description: 'BFF API for Goldwind Algorithm Platform',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(apiHandler);

    // /algorithms: GET, POST
    const algorithms = api.root.addResource('algorithms');
    algorithms.addMethod('GET', lambdaIntegration);
    algorithms.addMethod('POST', lambdaIntegration);

    // /algorithms/{id}: GET, PUT, DELETE
    const algorithmById = algorithms.addResource('{id}');
    algorithmById.addMethod('GET', lambdaIntegration);
    algorithmById.addMethod('PUT', lambdaIntegration);
    algorithmById.addMethod('DELETE', lambdaIntegration);

    // /workflows: GET
    const workflows = api.root.addResource('workflows');
    workflows.addMethod('GET', lambdaIntegration);

    // /workflows/{id}: GET
    const workflowById = workflows.addResource('{id}');
    workflowById.addMethod('GET', lambdaIntegration);

    // /workflows/{id}/approve: POST
    const workflowApprove = workflowById.addResource('approve');
    workflowApprove.addMethod('POST', lambdaIntegration);

    // /monitoring: parent resource
    const monitoring = api.root.addResource('monitoring');

    // /monitoring/metrics: GET
    const metrics = monitoring.addResource('metrics');
    metrics.addMethod('GET', lambdaIntegration);

    // /monitoring/drift: GET
    const drift = monitoring.addResource('drift');
    drift.addMethod('GET', lambdaIntegration);

    // /monitoring/backtest: POST
    const backtest = monitoring.addResource('backtest');
    backtest.addMethod('POST', lambdaIntegration);

    // /monitoring/backtest/{id}: GET
    const backtestById = backtest.addResource('{id}');
    backtestById.addMethod('GET', lambdaIntegration);

    // /rollback: POST
    const rollback = api.root.addResource('rollback');
    rollback.addMethod('POST', lambdaIntegration);

    this.apiUrl = api.url;
  }
}
