import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@cloudscape-design/components/header';
import Grid from '@cloudscape-design/components/grid';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ModelVersion } from '../../types';

// Mock version data for comparison
const mockVersionsMap: Record<string, ModelVersion> = {
  v1: { id: 'v1', algorithmId: '1', algorithmName: 'Wind Forecast - HLJ', version: '3.0.0', stage: 'Production', mape: 4.2, rmse: 8.5, mae: 5.8, hyperparameters: { learning_rate: 0.001, epochs: 300, batch_size: 64, hidden_layers: 3 }, createdAt: '2024-01-15' },
  v2: { id: 'v2', algorithmId: '1', algorithmName: 'Wind Forecast - HLJ', version: '2.0.0', stage: 'Archived', mape: 5.2, rmse: 10.1, mae: 7.0, hyperparameters: { learning_rate: 0.005, epochs: 200, batch_size: 32, hidden_layers: 2 }, createdAt: '2024-01-08' },
};

const VersionCompare: React.FC = () => {
  const [searchParams] = useSearchParams();
  const aId = searchParams.get('a') || 'v1';
  const bId = searchParams.get('b') || 'v2';

  const versionA = mockVersionsMap[aId] || mockVersionsMap['v1'];
  const versionB = mockVersionsMap[bId] || mockVersionsMap['v2'];

  // Mock MAPE evaluation data
  const evaluationDates = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const mapeA = [4.5, 4.3, 4.1, 4.2, 4.0];
  const mapeB = [5.8, 5.5, 5.3, 5.1, 5.2];

  const chartOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: [`Version ${versionA.version}`, `Version ${versionB.version}`] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: evaluationDates },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [
        { name: `Version ${versionA.version}`, type: 'line', data: mapeA, smooth: true },
        { name: `Version ${versionB.version}`, type: 'line', data: mapeB, smooth: true },
      ],
    }),
    [versionA.version, versionB.version]
  );

  const allParamKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(versionA.hyperparameters),
      ...Object.keys(versionB.hyperparameters),
    ]);
    return Array.from(keys);
  }, [versionA, versionB]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Version Comparison</Header>
      <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
        <Container header={<Header variant="h2">Version {versionA.version}</Header>}>
          <SpaceBetween size="m">
            <div><Box variant="awsui-key-label">Algorithm</Box><div>{versionA.algorithmName}</div></div>
            <div><Box variant="awsui-key-label">Stage</Box><div>{versionA.stage}</div></div>
            <div><Box variant="awsui-key-label">MAPE</Box><div>{versionA.mape}%</div></div>
            <div><Box variant="awsui-key-label">RMSE</Box><div>{versionA.rmse}</div></div>
            <div><Box variant="awsui-key-label">MAE</Box><div>{versionA.mae}</div></div>
            <div><Box variant="awsui-key-label">Created</Box><div>{versionA.createdAt}</div></div>
            <Header variant="h3">Hyperparameters</Header>
            {allParamKeys.map((key) => {
              const valA = String(versionA.hyperparameters[key] ?? 'N/A');
              const valB = String(versionB.hyperparameters[key] ?? 'N/A');
              const isDiff = valA !== valB;
              return (
                <div key={key} style={isDiff ? { backgroundColor: '#f2f8fd', padding: '4px', borderRadius: '4px' } : {}}>
                  <Box variant="awsui-key-label">{key}</Box>
                  <div>{valA}</div>
                </div>
              );
            })}
          </SpaceBetween>
        </Container>
        <Container header={<Header variant="h2">Version {versionB.version}</Header>}>
          <SpaceBetween size="m">
            <div><Box variant="awsui-key-label">Algorithm</Box><div>{versionB.algorithmName}</div></div>
            <div><Box variant="awsui-key-label">Stage</Box><div>{versionB.stage}</div></div>
            <div><Box variant="awsui-key-label">MAPE</Box><div>{versionB.mape}%</div></div>
            <div><Box variant="awsui-key-label">RMSE</Box><div>{versionB.rmse}</div></div>
            <div><Box variant="awsui-key-label">MAE</Box><div>{versionB.mae}</div></div>
            <div><Box variant="awsui-key-label">Created</Box><div>{versionB.createdAt}</div></div>
            <Header variant="h3">Hyperparameters</Header>
            {allParamKeys.map((key) => {
              const valA = String(versionA.hyperparameters[key] ?? 'N/A');
              const valB = String(versionB.hyperparameters[key] ?? 'N/A');
              const isDiff = valA !== valB;
              return (
                <div key={key} style={isDiff ? { backgroundColor: '#fdf2f0', padding: '4px', borderRadius: '4px' } : {}}>
                  <Box variant="awsui-key-label">{key}</Box>
                  <div>{valB}</div>
                </div>
              );
            })}
          </SpaceBetween>
        </Container>
      </Grid>
      <Container header={<Header variant="h2">MAPE Comparison Over Evaluation Periods</Header>}>
        <ReactECharts option={chartOption} style={{ height: '400px' }} />
      </Container>
    </SpaceBetween>
  );
};

export default VersionCompare;
