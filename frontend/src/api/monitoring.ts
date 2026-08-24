import apiClient from './client';
import type { MetricsData, DriftReport, BacktestConfig, BacktestResult } from '../types';

export async function getMetrics(timeRange: string): Promise<MetricsData> {
  const response = await apiClient.get<MetricsData>('/monitoring/metrics', {
    params: { timeRange },
  });
  return response.data;
}

export async function getDriftReport(): Promise<DriftReport> {
  const response = await apiClient.get<DriftReport>('/monitoring/drift');
  return response.data;
}

export async function triggerBacktest(params: BacktestConfig): Promise<BacktestResult> {
  const response = await apiClient.post<BacktestResult>('/monitoring/backtest', params);
  return response.data;
}

export async function getBacktestResults(id: string): Promise<BacktestResult> {
  const response = await apiClient.get<BacktestResult>(`/monitoring/backtest/${id}`);
  return response.data;
}
