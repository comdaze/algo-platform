import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tabs from '@cloudscape-design/components/tabs';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import StatusBadge from '../../components/StatusBadge';
import MapeChart from '../../components/MapeChart';
import CoverageMap from './CoverageMap';
import type { Algorithm, ModelVersion } from '../../types';

// Mock data
const mockAlgorithm: Algorithm = {
  id: '1',
  name: 'Wind Power Forecast - Heilongjiang',
  province: 'Heilongjiang',
  variety: 'Wind',
  status: 'production',
  mape: 4.2,
  description: 'Wind power forecasting model for Heilongjiang province',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
};

const mockVersions: ModelVersion[] = [
  { id: 'v1', algorithmId: '1', algorithmName: 'Wind Power Forecast', version: '1.0.0', stage: 'Archived', mape: 6.5, rmse: 12.3, mae: 8.1, hyperparameters: { learning_rate: 0.01, epochs: 100 }, createdAt: '2024-01-01' },
  { id: 'v2', algorithmId: '1', algorithmName: 'Wind Power Forecast', version: '2.0.0', stage: 'Staging', mape: 5.2, rmse: 10.1, mae: 7.0, hyperparameters: { learning_rate: 0.005, epochs: 200 }, createdAt: '2024-01-08' },
  { id: 'v3', algorithmId: '1', algorithmName: 'Wind Power Forecast', version: '3.0.0', stage: 'Production', mape: 4.2, rmse: 8.5, mae: 5.8, hyperparameters: { learning_rate: 0.001, epochs: 300 }, createdAt: '2024-01-15' },
];

const metricsData = mockVersions.map((v) => ({
  date: v.createdAt,
  value: v.mape,
  province: 'MAPE',
}));

const AlgorithmDetail: React.FC = () => {
  const { id: _id } = useParams<{ id: string }>();

  return (
    <SpaceBetween size="l">
      <Header variant="h1">
        {mockAlgorithm.name} <StatusBadge status={mockAlgorithm.status} />
      </Header>

      <Tabs
        tabs={[
          {
            label: 'Overview',
            id: 'overview',
            content: (
              <Container header={<Header variant="h2">Algorithm Details</Header>}>
                <ColumnLayout columns={2} variant="text-grid">
                  <SpaceBetween size="l">
                    <div>
                      <Box variant="awsui-key-label">ID</Box>
                      <div>{mockAlgorithm.id}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Province</Box>
                      <div>{mockAlgorithm.province}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Variety</Box>
                      <div>{mockAlgorithm.variety}</div>
                    </div>
                  </SpaceBetween>
                  <SpaceBetween size="l">
                    <div>
                      <Box variant="awsui-key-label">Created</Box>
                      <div>{mockAlgorithm.createdAt}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Updated</Box>
                      <div>{mockAlgorithm.updatedAt}</div>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Current MAPE</Box>
                      <div>{mockAlgorithm.mape}%</div>
                    </div>
                  </SpaceBetween>
                </ColumnLayout>
              </Container>
            ),
          },
          {
            label: 'Versions',
            id: 'versions',
            content: (
              <Table
                header={<Header variant="h2">Model Versions</Header>}
                columnDefinitions={[
                  { id: 'version', header: 'Version', cell: (item) => item.version },
                  { id: 'stage', header: 'Stage', cell: (item) => item.stage },
                  { id: 'mape', header: 'MAPE (%)', cell: (item) => `${item.mape}%` },
                  { id: 'rmse', header: 'RMSE', cell: (item) => item.rmse.toFixed(2) },
                  { id: 'mae', header: 'MAE', cell: (item) => item.mae.toFixed(2) },
                  { id: 'createdAt', header: 'Created', cell: (item) => item.createdAt },
                ]}
                items={mockVersions}
              />
            ),
          },
          {
            label: 'Metrics',
            id: 'metrics',
            content: (
              <Container header={<Header variant="h2">MAPE/RMSE Over Versions</Header>}>
                <MapeChart data={metricsData} title="Model Performance Over Versions" />
              </Container>
            ),
          },
          {
            label: 'Coverage',
            id: 'coverage',
            content: (
              <Container header={<Header variant="h2">Province Coverage Map</Header>}>
                <CoverageMap />
              </Container>
            ),
          },
        ]}
      />
    </SpaceBetween>
  );
};

export default AlgorithmDetail;
