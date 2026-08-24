export interface Algorithm {
  id: string;
  name: string;
  province: string;
  variety: string;
  status: 'draft' | 'staging' | 'production' | 'archived';
  mape: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlgorithmListResponse {
  items: Algorithm[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ModelVersion {
  id: string;
  algorithmId: string;
  algorithmName: string;
  version: string;
  stage: 'None' | 'Staging' | 'Production' | 'Archived';
  mape: number;
  rmse: number;
  mae: number;
  hyperparameters: Record<string, string | number>;
  mlflowRunId?: string;
  mlflowModelUri?: string;
  createdAt: string;
}

export interface PipelineStep {
  name: string;
  status: 'Succeeded' | 'Failed' | 'Executing' | 'NotStarted' | 'Stopping';
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, string>;
}

export interface PipelineExecution {
  id: string;
  pipelineName: string;
  executionId: string;
  status: 'Executing' | 'Succeeded' | 'Failed' | 'Stopping' | 'Stopped';
  startTime: string;
  endTime?: string;
  duration?: string;
  steps: PipelineStep[];
  pendingApproval?: boolean;
}

export interface MetricsDataPoint {
  date: string;
  value: number;
  province?: string;
}

export interface MetricsData {
  mape: MetricsDataPoint[];
  rmse: MetricsDataPoint[];
  mae: MetricsDataPoint[];
  driftScore: number;
}

export interface DriftFeature {
  featureName: string;
  drifted: boolean;
  pValue: number;
  statistic: number;
}

export interface DriftReport {
  id: string;
  timestamp: string;
  datasetDriftDetected: boolean;
  driftScore: number;
  featuresDrifted: number;
  totalFeatures: number;
  features: DriftFeature[];
  htmlReportUrl?: string;
}

export interface BacktestConfig {
  algorithmId: string;
  modelVersion: string;
  startDate: string;
  endDate: string;
}

export interface BacktestMetricsByProvince {
  province: string;
  mape: number;
  rmse: number;
  mae: number;
}

export interface BacktestResult {
  id: string;
  algorithmId: string;
  modelVersion: string;
  startDate: string;
  endDate: string;
  overallMape: number;
  overallRmse: number;
  overallMae: number;
  predictions: Array<{ date: string; predicted: number; actual: number }>;
  metricsByProvince: BacktestMetricsByProvince[];
  status: 'running' | 'completed' | 'failed';
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  dismissed?: boolean;
}
