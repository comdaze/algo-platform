import React, { useEffect, useMemo, useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { getDriftReport } from '../../api/monitoring';
import { useLang } from '../../i18n';

// Illustrative only — there is no backend per-province time-series source yet.
const provinces = ['Heilongjiang', 'Xinjiang', 'Inner Mongolia', 'Ningxia'];
const generateTimeSeries = (days: number) =>
  Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toISOString().slice(0, 10);
  });

const MonitoringDashboard: React.FC = () => {
  const { t } = useLang();
  const [timeRange, setTimeRange] = useState('30d');
  const [driftScore, setDriftScore] = useState<number>(0);

  const loadDrift = () => {
    getDriftReport()
      .then((r) => setDriftScore(r.driftScore))
      .catch(() => setDriftScore(0));
  };
  useEffect(loadDrift, []);

  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const dates = useMemo(() => generateTimeSeries(days), [days]);

  const mapeOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: provinces, bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: provinces.map((province) => ({
        name: province,
        type: 'line',
        smooth: true,
        data: dates.map(() => (3 + Math.random() * 5).toFixed(2)),
      })),
    }),
    [dates]
  );

  const driftOption: EChartsOption = useMemo(
    () => ({
      tooltip: { formatter: '{b}: {c}' },
      series: [
        {
          type: 'gauge',
          detail: { formatter: '{value}', fontSize: 20 },
          data: [{ value: Number(driftScore.toFixed(2)), name: 'Drift Score' }],
          max: 1,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.3, '#1d8102'],
                [0.7, '#f2a900'],
                [1, '#d13212'],
              ],
            },
          },
        },
      ],
    }),
    [driftScore]
  );

  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description={t('page.monitoring.desc')}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <SegmentedControl
                selectedId={timeRange}
                onChange={({ detail }) => setTimeRange(detail.selectedId)}
                options={[
                  { text: '7d', id: '7d' },
                  { text: '30d', id: '30d' },
                  { text: '90d', id: '90d' },
                ]}
              />
              <Button iconName="refresh" onClick={loadDrift} />
            </SpaceBetween>
          }
        >
          {t('page.monitoring.title')}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container
          header={
            <Header variant="h2" description="Illustrative — no backend per-province time-series source yet">
              Model Accuracy (MAPE per Province)
            </Header>
          }
        >
          <ReactECharts option={mapeOption} style={{ height: '400px' }} />
        </Container>

        <Container
          header={
            <Header variant="h2" description="Live — from the drift monitoring endpoint">
              Drift Detection
            </Header>
          }
        >
          <ReactECharts option={driftOption} style={{ height: '300px' }} notMerge />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default MonitoringDashboard;
