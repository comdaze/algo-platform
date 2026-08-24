# 金风天润算法平台 (Goldwind Tianrun Algorithm Platform)

A unified MLOps platform for wind power forecasting algorithm development, training, deployment, and monitoring.

## Project Structure

```
goldwind-algo-platform/
├── infrastructure/          # AWS CDK infrastructure (TypeScript)
│   ├── bin/                 # CDK app entry point
│   ├── lib/                 # CDK constructs and stacks
│   ├── cdk.json             # CDK configuration (aws-cn partition)
│   └── package.json
├── frontend/                # React frontend (Vite + Cloudscape Design)
│   ├── src/                 # Application source code
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── lambdas/                 # Lambda function handlers
│   ├── metadata-crud/       # Algorithm metadata CRUD operations
│   ├── rollback/            # Model endpoint rollback
│   ├── callback-handler/    # SageMaker pipeline callbacks
│   ├── api-handler/         # REST API routing
│   └── backtesting/         # Algorithm backtesting
├── containers/              # Docker container definitions
│   ├── mlflow/              # MLflow tracking server
│   ├── grafana/             # Grafana monitoring dashboards
│   └── evidently/           # Evidently model monitoring
├── ml_pipeline/             # Python SageMaker ML pipelines
│   ├── pipeline.py          # Pipeline definition
│   ├── run_pipeline.py      # Pipeline execution entry point
│   └── requirements.txt     # Python dependencies
├── buildspecs/              # AWS CodeBuild specifications
│   ├── build.yml            # Build and test
│   ├── pipeline.yml         # ML pipeline execution
│   └── deploy.yml           # CDK deployment
├── configuration/           # Project configuration
│   └── projectConfig.json   # Region, project name, etc.
├── scripts/                 # Utility scripts
│   ├── deploy.sh            # Deployment helper
│   └── run_pipeline.sh      # Pipeline execution helper
├── package.json             # Root workspace configuration
└── tsconfig.json            # Root TypeScript configuration
```

## Target Region

This platform is configured for AWS China (Ningxia) region: **cn-northwest-1** (aws-cn partition).

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- AWS CDK CLI
- AWS credentials configured for cn-northwest-1

### Installation

```bash
# Install all dependencies
npm install

# Build infrastructure
cd infrastructure && npm run build

# Build frontend
cd frontend && npm run build
```

### Development

```bash
# Start frontend dev server
cd frontend && npm run dev

# Run tests
npm test

# Deploy infrastructure
cd infrastructure && npx cdk deploy --all
```

## Architecture

The platform combines:
- **SageMaker Pipelines** for ML model training and evaluation
- **MLflow** on ECS Fargate for experiment tracking
- **Evidently** for model performance monitoring
- **Cloudscape Design** React frontend for the algorithm management UI
- **DynamoDB** for algorithm metadata storage
- **CodePipeline** for CI/CD automation
