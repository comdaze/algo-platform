import React, { useState, useMemo } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// Mock MAPE data per province
const provinces = ['Heilongjiang', 'Xinjiang', 'Inner Mongolia', 'Ningxia'];
const generateTimeSeries = (days: number) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toISOString().slice(0, 10);
  });
};

const mockAlerts: FlashbarProps.MessageDefinition[] = [
  { type: 'error', content: 'MAPE exceeded threshold (10%) for Ningxia region', id: 'alert-1', dismissible: true },
  { type: 'warning', content: 'Data drift detected in Xinjiang input features', id: 'alert-2', dismissible: true },
  { type: 'info', content: 'Scheduled retraining triggered for Inner Mongolia model', id: 'alert-3', dismissible: true },
];

const MonitoringDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');

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
          data: [{ value: 0.35, name: 'Drift Score' }],
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
    []
  );

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
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
            <Button iconName="refresh">Refresh</Button>
          </SpaceBetween>
        }
      >
        Monitoring Dashboard
      </Header>

      <Flashbar items={mockAlerts} />

      <Container header={<Header variant="h2">Model Accuracy (MAPE per Province)</Header>}>
        <ReactECharts option={mapeOption} style={{ height: '400px' }} />
      </Container>

      <Container header={<Header variant="h2">Drift Detection</Header>}>
        <ReactECharts option={driftOption} style={{ height: '300px' }} />
      </Container>
    </SpaceBetween>
  );
};

export default MonitoringDashboard;
