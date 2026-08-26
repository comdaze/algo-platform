import React, { useEffect, useState } from 'react';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Algorithm } from '../../types';
import { listAlgorithms } from '../../api/algorithms';
import { listExecutions, type WorkflowExecution } from '../../api/workflows';

// Illustrative only — there is no backend time-series metrics source yet.
const mapeTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return { date: date.toISOString().slice(0, 10), value: 4 + Math.random() * 3 };
});

const statusTypeMap: Record<string, 'success' | 'error' | 'in-progress' | 'stopped' | 'pending'> = {
  Succeeded: 'success',
  Failed: 'error',
  Executing: 'in-progress',
  Stopping: 'in-progress',
  Stopped: 'stopped',
};

const Dashboard: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  useEffect(() => {
    listAlgorithms().then(setAlgorithms).catch(() => setAlgorithms([]));
    listExecutions().then(setExecutions).catch(() => setExecutions([]));
  }, []);

  const totalAlgorithms = algorithms.length;
  const activeDeployments = algorithms.filter((a) => a.status === 'production').length;
  const activeAlerts = algorithms.filter((a) => a.mape > 8).length;
  const averageMape =
    algorithms.length > 0
      ? (algorithms.reduce((sum, a) => sum + (a.mape || 0), 0) / algorithms.length).toFixed(1)
      : '-';

  const chartOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: mapeTrendData.map((d) => d.date) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: 'MAPE',
        type: 'line',
        smooth: true,
        data: mapeTrendData.map((d) => Number(d.value.toFixed(2))),
        areaStyle: { opacity: 0.1 },
      },
    ],
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Dashboard</Header>
      <Grid gridDefinition={[{ colspan: 3 }, { colspan: 3 }, { colspan: 3 }, { colspan: 3 }]}>
        <Container>
          <Box variant="awsui-key-label">Total Algorithms</Box>
          <Box variant="h1">{totalAlgorithms}</Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Production Deployments</Box>
          <StatusIndicator type="success">
            <Box variant="h1">{activeDeployments}</Box>
          </StatusIndicator>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Algorithms Over 8% MAPE</Box>
          <Box variant="h1" color={activeAlerts > 0 ? 'text-status-error' : undefined}>
            {activeAlerts}
          </Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Average MAPE</Box>
          <Box variant="h1">{averageMape}%</Box>
        </Container>
      </Grid>

      <Container
        header={
          <Header variant="h2" description="Illustrative — no backend time-series metrics source yet">
            MAPE Trend (Last 30 Days)
          </Header>
        }
      >
        <ReactECharts option={chartOption} style={{ height: '300px' }} />
      </Container>

      <Container header={<Header variant="h2">Recent Pipeline Executions</Header>}>
        <Table
          columnDefinitions={[
            { id: 'pipeline', header: 'Pipeline', cell: (item) => item.pipelineName },
            {
              id: 'status',
              header: 'Status',
              cell: (item) => (
                <StatusIndicator type={statusTypeMap[item.status] || 'pending'}>{item.status}</StatusIndicator>
              ),
            },
            { id: 'startTime', header: 'Start Time', cell: (item) => item.startTime || '-' },
          ]}
          items={executions.slice(0, 5)}
          variant="embedded"
          empty={
            <Box textAlign="center" padding="m" color="text-body-secondary">
              No recent executions
            </Box>
          }
        />
      </Container>
    </SpaceBetween>
  );
};

export default Dashboard;
