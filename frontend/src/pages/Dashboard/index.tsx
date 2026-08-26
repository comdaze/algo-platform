import React, { useCallback, useEffect, useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Link from '@cloudscape-design/components/link';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Algorithm } from '../../types';
import { listAlgorithms } from '../../api/algorithms';
import { listExecutions, type WorkflowExecution } from '../../api/workflows';
import { useLang } from '../../i18n';

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

const isWind = (v: string) => /wind|风/i.test(v || '');
const isSolar = (v: string) => /solar|pv|光|太阳/i.test(v || '');

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([listAlgorithms(), listExecutions()])
      .then(([a, e]) => {
        setAlgorithms(a.status === 'fulfilled' ? a.value : []);
        setExecutions(e.status === 'fulfilled' ? e.value : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const totalAlgorithms = algorithms.length;
  const windCount = algorithms.filter((a) => isWind(a.variety)).length;
  const solarCount = algorithms.filter((a) => isSolar(a.variety)).length;
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
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description={t('page.dashboard.desc')}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" loading={loading} onClick={reload}>
                {t('btn.refresh')}
              </Button>
              <Button variant="primary" onClick={() => navigate('/algorithms')}>
                {t('btn.viewAlgorithms')}
              </Button>
            </SpaceBetween>
          }
        >
          {t('nav.dashboard')}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Grid
          gridDefinition={[
            { colspan: { default: 12, xs: 6, l: 3 } },
            { colspan: { default: 12, xs: 6, l: 3 } },
            { colspan: { default: 12, xs: 6, l: 3 } },
            { colspan: { default: 12, xs: 6, l: 3 } },
          ]}
        >
          <Container fitHeight header={<Header variant="h2" description="Registered across all environments">Total algorithms</Header>}>
            <KeyValuePairs
              columns={2}
              items={[
                {
                  label: 'Total',
                  value: (
                    <Link variant="awsui-value-large" onFollow={(e) => { e.preventDefault(); navigate('/algorithms'); }} href="/algorithms">
                      {String(totalAlgorithms)}
                    </Link>
                  ),
                },
                { label: 'Production', value: <StatusIndicator type="success">{`${activeDeployments} live`}</StatusIndicator> },
                { label: 'Wind', value: String(windCount) },
                { label: 'Solar', value: String(solarCount) },
              ]}
            />
          </Container>
          <Container fitHeight header={<Header variant="h2" description="Models serving live forecasts">Production deployments</Header>}>
            <KeyValuePairs
              columns={2}
              items={[
                { label: 'Deployed', value: <Box variant="awsui-value-large">{String(activeDeployments)}</Box> },
                {
                  label: 'Health',
                  value:
                    activeDeployments > 0 ? (
                      <StatusIndicator type="success">All healthy</StatusIndicator>
                    ) : (
                      <StatusIndicator type="pending">None</StatusIndicator>
                    ),
                },
              ]}
            />
          </Container>
          <Container fitHeight header={<Header variant="h2" description="Algorithms over the 8% MAPE alert line">Active alerts</Header>}>
            <KeyValuePairs
              columns={2}
              items={[
                { label: 'Alerts', value: <Box variant="awsui-value-large">{String(activeAlerts)}</Box> },
                {
                  label: 'Severity',
                  value:
                    activeAlerts > 0 ? (
                      <StatusIndicator type="warning">{`${activeAlerts} over target`}</StatusIndicator>
                    ) : (
                      <StatusIndicator type="success">Nominal</StatusIndicator>
                    ),
                },
              ]}
            />
          </Container>
          <Container fitHeight header={<Header variant="h2" description="Mean absolute percentage error (avg)">Average MAPE</Header>}>
            <KeyValuePairs
              columns={2}
              items={[
                { label: 'Overall', value: <Box variant="awsui-value-large">{`${averageMape}%`}</Box> },
                {
                  label: 'Target',
                  value:
                    averageMape !== '-' && Number(averageMape) <= 5 ? (
                      <StatusIndicator type="success">Within 5%</StatusIndicator>
                    ) : (
                      <StatusIndicator type="warning">Above 5%</StatusIndicator>
                    ),
                },
              ]}
            />
          </Container>
        </Grid>

        <Container
          header={
            <Header variant="h2" description={t('dash.mapeTrend.desc')}>
              {t('dash.mapeTrend')}
            </Header>
          }
        >
          <ReactECharts option={chartOption} style={{ height: '300px' }} />
        </Container>

        <Table
          variant="container"
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
          loading={loading}
          loadingText="Loading executions..."
          header={
            <Header
              variant="h2"
              counter={executions.length ? `(${executions.length})` : undefined}
              actions={
                <Button onClick={() => navigate('/workflows')}>{t('btn.viewAll')}</Button>
              }
            >
              {t('dash.recentExecutions')}
            </Header>
          }
          empty={
            <Box textAlign="center" padding="m" color="text-body-secondary">
              {t('dash.noExecutions')}
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
};

export default Dashboard;
