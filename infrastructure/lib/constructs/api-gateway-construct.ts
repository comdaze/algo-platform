import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export interface ApiGatewayConstructProps {
  readonly vpc: ec2.IVpc;
  readonly metadataTable: dynamodb.ITable;
  readonly deploymentHistoryTable: dynamodb.ITable;
  readonly sageMakerExecutionRole: iam.IRole;
  readonly backtestStateMachineArn: string;
  readonly rollbackFunctionArn: string;
  readonly automlImageUri: string;
  readonly automlProcessingRoleArn: string;
  readonly automlRunsTable: dynamodb.ITable;
  readonly automlJobSecurityGroupId: string;
  readonly automlDataBucket: s3.IBucket;
  readonly mlflowHost: string;
}

export class ApiGatewayConstruct extends Construct {
  readonly apiUrl: string;
  readonly apiHost: string;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    // Global LLM config for MLZero / OpenAI-compatible endpoints. A single JSON
    // secret { endpointUrl, modelId, provider, apiKey }; the API reads/writes it.
    // Placeholder value on create; real values set via PUT /settings/llm.
    const llmSecret = new secretsmanager.Secret(this, 'LlmConfig', {
      secretName: 'algo/llm/config',
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({ endpointUrl: '', modelId: '', provider: 'openai', apiKey: '' })
      ),
    });

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
        PIPELINE_NAME: 'AlgoWindPowerPipeline',
        SAGEMAKER_PIPELINE_ROLE_ARN: props.sageMakerExecutionRole.roleArn,
        LLM_SECRET_ARN: llmSecret.secretArn,
        AUTOML_IMAGE_URI: props.automlImageUri,
        AUTOML_PROCESSING_ROLE_ARN: props.automlProcessingRoleArn,
        AUTOML_RUNS_TABLE: props.automlRunsTable.tableName,
        AUTOML_JOB_SG: props.automlJobSecurityGroupId,
        AUTOML_JOB_SUBNETS: props.vpc.privateSubnets.map((s) => s.subnetId).join(','),
        AUTOML_DATA_BUCKET: props.automlDataBucket.bucketName,
        AUTOML_DEFAULT_INSTANCE: 'ml.g5.xlarge',
        AUTOML_MLFLOW_TRACKING_URI: `http://${props.mlflowHost}`,
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

    // IAM Permissions: read/write the LLM config secret (GET/PUT /settings/llm)
    llmSecret.grantRead(apiHandler);
    llmSecret.grantWrite(apiHandler);

    // IAM Permissions: AutoML (MLZero) — trigger/describe SageMaker Processing jobs,
    // pass the scoped processing role, track runs, read job outputs.
    props.automlRunsTable.grantReadWriteData(apiHandler);
    props.automlDataBucket.grantReadWrite(apiHandler);
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:CreateProcessingJob',
          'sagemaker:DescribeProcessingJob',
          'sagemaker:ListProcessingJobs',
          'sagemaker:AddTags',
        ],
        resources: ['*'],
      })
    );
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.automlProcessingRoleArn],
        conditions: { StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' } },
      })
    );

    // IAM Permissions: SageMaker describe/list pipelines and executions
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sagemaker:ListPipelineExecutions',
          'sagemaker:DescribePipelineExecution',
          'sagemaker:ListPipelineExecutionSteps',
          'sagemaker:SendPipelineExecutionStepSuccess',
          'sagemaker:StartPipelineExecution',
          'sagemaker:ListPipelines',
          'sagemaker:DescribePipeline',
          'sagemaker:UpdatePipeline',
          'sagemaker:CreatePipeline',
        ],
        resources: [
          `arn:${cdk.Aws.PARTITION}:sagemaker:${stack.region}:${stack.account}:pipeline/*`,
        ],
      })
    );

    // iam:PassRole — UpdatePipeline/CreatePipeline require passing the pipeline
    // execution role in the request.
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.sageMakerExecutionRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
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

    // Interface VPC endpoint so the API is reachable ONLY privately, from
    // inside the VPC (the nginx reverse proxy). No public endpoint.
    const apiEndpointSg = new ec2.SecurityGroup(this, 'ApiVpcEndpointSg', {
      vpc: props.vpc,
      description: 'algo private API GW interface endpoint',
      allowAllOutbound: true,
    });
    apiEndpointSg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'HTTPS from within the VPC (nginx proxy)'
    );

    const apiVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'ApiVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [apiEndpointSg],
    });

    // Private REST API: reachable only through the interface endpoint above.
    // No IAM signing needed from the browser — access is controlled upstream at
    // the ALB (prefix-list allowlist); the API has no public surface at all.
    const api = new apigateway.RestApi(this, 'AlgoPlatformApi', {
      restApiName: 'algo-platform-api',
      description: 'BFF API for Algorithm Platform (private)',
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiVpcEndpoint],
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
            conditions: {
              StringEquals: { 'aws:SourceVpce': apiVpcEndpoint.vpcEndpointId },
            },
          }),
        ],
      }),
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.NONE,
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

    // /workflows: GET, POST
    const workflows = api.root.addResource('workflows');
    workflows.addMethod('GET', lambdaIntegration);
    workflows.addMethod('POST', lambdaIntegration);

    // /workflows/{id}: GET
    const workflowById = workflows.addResource('{id}');
    workflowById.addMethod('GET', lambdaIntegration);

    // /workflows/{id}/approve: POST
    const workflowApprove = workflowById.addResource('approve');
    workflowApprove.addMethod('POST', lambdaIntegration);

    // /pipelines: GET (current graph) + PUT (save edits -> UpdatePipeline)
    const pipelines = api.root.addResource('pipelines');
    pipelines.addMethod('GET', lambdaIntegration);
    pipelines.addMethod('PUT', lambdaIntegration);

    // /settings/llm: GET (masked config) + PUT (save; key kept if omitted)
    const settings = api.root.addResource('settings');
    const settingsLlm = settings.addResource('llm');
    settingsLlm.addMethod('GET', lambdaIntegration);
    settingsLlm.addMethod('PUT', lambdaIntegration);

    // /automl: GET (list runs) + POST (trigger a run); /automl/{id}: GET (status+results)
    const automl = api.root.addResource('automl');
    automl.addMethod('GET', lambdaIntegration);
    automl.addMethod('POST', lambdaIntegration);
    const automlById = automl.addResource('{id}');
    automlById.addMethod('GET', lambdaIntegration);

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
    this.apiHost = `${api.restApiId}.execute-api.${stack.region}.${cdk.Aws.URL_SUFFIX}`;
  }
}
