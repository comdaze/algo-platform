import apiClient from './client';

export interface DriftFeatureView {
  featureName: string;
  drifted: boolean;
  pValue: number;
  statistic: number;
}

export interface DriftReportView {
  timestamp?: string;
  status: string;
  driftScore: number;
  threshold: number;
  features: DriftFeatureView[];
}

export async function getDriftReport(): Promise<DriftReportView> {
  const res = await apiClient.get<{ report?: Record<string, unknown> }>('/monitoring/drift');
  const r = res.data.report || {};
  const features = ((r.features as Record<string, unknown>[]) || []).map((f) => ({
    featureName: (f.featureName as string) || (f.name as string) || '',
    drifted: Boolean(f.drifted),
    pValue: Number(f.pValue ?? 0),
    statistic: Number(f.statistic ?? 0),
  }));
  return {
    timestamp: r.timestamp as string | undefined,
    status: (r.status as string) || 'healthy',
    driftScore: Number(r.overallDriftScore ?? 0),
    threshold: Number(r.threshold ?? 0.1),
    features,
  };
}

export interface MetricRow {
  [key: string]: unknown;
}

export async function getMetrics(algorithmId?: string): Promise<MetricRow[]> {
  const res = await apiClient.get<{ metrics?: MetricRow[] }>('/monitoring/metrics', {
    params: algorithmId ? { algorithmId } : undefined,
  });
  return res.data.metrics || [];
}

export async function triggerBacktest(params: Record<string, unknown>): Promise<{ executionArn?: string }> {
  const res = await apiClient.post<{ executionArn?: string }>('/monitoring/backtest', params);
  return res.data;
}

export interface BacktestStatus {
  executionArn?: string;
  status?: string;
  startDate?: string;
  stopDate?: string;
  output?: unknown;
}

export async function getBacktestResult(executionArn: string): Promise<BacktestStatus> {
  const res = await apiClient.get<BacktestStatus>(`/monitoring/backtest/${encodeURIComponent(executionArn)}`);
  return res.data;
}
