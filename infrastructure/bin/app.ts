#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FoundationStack } from '../lib/stacks/foundation-stack';
import { MlflowStack } from '../lib/stacks/mlflow-stack';
import { DataPlatformStack } from '../lib/stacks/data-platform-stack';
import { MetadataStack } from '../lib/stacks/metadata-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { WorkflowStack } from '../lib/stacks/workflow-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  region: 'cn-northwest-1',
  account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
};

const projectName = 'algo-platform';

const foundationStack = new FoundationStack(app, 'FoundationStack', { env });

const mlflowStack = new MlflowStack(app, 'MlflowStack', {
  env,
  vpc: foundationStack.vpc,
});
mlflowStack.addDependency(foundationStack);

const dataPlatformStack = new DataPlatformStack(app, 'DataPlatformStack', { env });

const metadataStack = new MetadataStack(app, 'MetadataStack', { env });

const pipelineStack = new PipelineStack(app, 'PipelineStack', {
  env,
  projectName,
  dataManifestBucket: dataPlatformStack.dataManifestBucket,
  sageMakerArtifactBucket: dataPlatformStack.sageMakerArtifactBucket,
  sageMakerExecutionRole: dataPlatformStack.sageMakerExecutionRole,
});
pipelineStack.addDependency(dataPlatformStack);

const workflowStack = new WorkflowStack(app, 'WorkflowStack', {
  env,
  vpc: foundationStack.vpc,
  sageMakerExecutionRole: dataPlatformStack.sageMakerExecutionRole,
});
workflowStack.addDependency(foundationStack);
workflowStack.addDependency(dataPlatformStack);

const monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
  env,
  vpc: foundationStack.vpc,
  sageMakerExecutionRole: dataPlatformStack.sageMakerExecutionRole,
  dataBucket: dataPlatformStack.dataBucket,
  artifactBucket: dataPlatformStack.sageMakerArtifactBucket,
});
monitoringStack.addDependency(foundationStack);
monitoringStack.addDependency(dataPlatformStack);

const frontendStack = new FrontendStack(app, 'FrontendStack', {
  env,
  vpc: foundationStack.vpc,
  metadataTable: metadataStack.metadataTable,
  deploymentHistoryTable: workflowStack.deploymentHistoryTable,
  sageMakerExecutionRole: dataPlatformStack.sageMakerExecutionRole,
  backtestStateMachineArn: monitoringStack.backtestStateMachineArn,
  rollbackFunctionArn: workflowStack.rollbackFunctionArn,
  grafanaHost: monitoringStack.grafanaHost,
  mlflowHost: mlflowStack.mlflowHost,
});
frontendStack.addDependency(foundationStack);
frontendStack.addDependency(metadataStack);
frontendStack.addDependency(dataPlatformStack);
frontendStack.addDependency(workflowStack);
frontendStack.addDependency(monitoringStack);
frontendStack.addDependency(mlflowStack);

app.synth();
