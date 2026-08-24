import React from 'react';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// Mock data for dashboard
const summaryData = {
  totalAlgorithms: 24,
  activeDeployments: 18,
  activeAlerts: 3,
  averageMape: 4.8,
};

const mapeTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().slice(0, 10),
    value: 4 + Math.random() * 3,
  };
});

const recentExecutions = [
  { id: '1', pipeline: 'train-heilongjiang', status: 'Succeeded', startTime: '2024-01-15 10:00', duration: '25m' },
  { id: '2', pipeline: 'train-xinjiang', status: 'Failed', startTime: '2024-01-15 09:30', duration: '12m' },
  { id: '3', pipeline: 'train-inner-mongolia', status: 'Executing', startTime: '2024-01-15 09:00', duration: '45m' },
  { id: '4', pipeline: 'evaluate-all', status: 'Succeeded', startTime: '2024-01-14 22:00', duration: '1h 10m' },
  { id: '5', pipeline: 'retrain-ningxia', status: 'Succeeded', startTime: '2024-01-14 20:00', duration: '30m' },
];

const Dashboard: React.FC = () => {
  const chartOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: mapeTrendData.map((d) => d.date),
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: 'MAPE',
        type: 'line',
        smooth: true,
        data: mapeTrendData.map((d) => d.value.toFixed(2)),
        areaStyle: { opacity: 0.1 },
      },
    ],
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Dashboard</Header>
      <Grid
        gridDefinition={[
          { colspan: 3 },
          { colspan: 3 },
          { colspan: 3 },
          { colspan: 3 },
        ]}
      >
        <Container>
          <Box variant="awsui-key-label">Total Algorithms</Box>
          <Box variant="h1">{summaryData.totalAlgorithms}</Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Active Deployments</Box>
          <StatusIndicator type="success">
            <Box variant="h1">{summaryData.activeDeployments}</Box>
          </StatusIndicator>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Active Alerts</Box>
          <Box variant="h1" color={summaryData.activeAlerts > 0 ? 'text-status-error' : undefined}>
            {summaryData.activeAlerts}
          </Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Average MAPE</Box>
          <Box variant="h1">{summaryData.averageMape}%</Box>
        </Container>
      </Grid>

      <Container header={<Header variant="h2">MAPE Trend (Last 30 Days)</Header>}>
        <ReactECharts option={chartOption} style={{ height: '300px' }} />
      </Container>

      <Container header={<Header variant="h2">Recent Pipeline Executions</Header>}>
        <Table
          columnDefinitions={[
            { id: 'pipeline', header: 'Pipeline', cell: (item) => item.pipeline },
            {
              id: 'status',
              header: 'Status',
              cell: (item) => {
                const typeMap: Record<string, 'success' | 'error' | 'in-progress'> = {
                  Succeeded: 'success',
                  Failed: 'error',
                  Executing: 'in-progress',
                };
                return (
                  <StatusIndicator type={typeMap[item.status] || 'pending'}>
                    {item.status}
                  </StatusIndicator>
                );
              },
            },
            { id: 'startTime', header: 'Start Time', cell: (item) => item.startTime },
            { id: 'duration', header: 'Duration', cell: (item) => item.duration },
          ]}
          items={recentExecutions}
          variant="embedded"
        />
      </Container>
    </SpaceBetween>
  );
};

export default Dashboard;
