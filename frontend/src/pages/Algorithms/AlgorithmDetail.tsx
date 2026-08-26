import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tabs from '@cloudscape-design/components/tabs';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import Spinner from '@cloudscape-design/components/spinner';
import Alert from '@cloudscape-design/components/alert';
import StatusBadge from '../../components/StatusBadge';
import MapeChart from '../../components/MapeChart';
import CoverageMap from './CoverageMap';
import type { Algorithm, ModelVersion } from '../../types';
import { getAlgorithm } from '../../api/algorithms';

// Versions/metrics have no backend endpoint yet — kept as illustrative mock.
const mockVersions: ModelVersion[] = [
  { id: 'v1', algorithmId: '1', algorithmName: 'Model', version: '1.0.0', stage: 'Archived', mape: 6.5, rmse: 12.3, mae: 8.1, hyperparameters: { learning_rate: 0.01, epochs: 100 }, createdAt: '2026-01-01' },
  { id: 'v2', algorithmId: '1', algorithmName: 'Model', version: '2.0.0', stage: 'Staging', mape: 5.2, rmse: 10.1, mae: 7.0, hyperparameters: { learning_rate: 0.005, epochs: 200 }, createdAt: '2026-01-08' },
  { id: 'v3', algorithmId: '1', algorithmName: 'Model', version: '3.0.0', stage: 'Production', mape: 4.2, rmse: 8.5, mae: 5.8, hyperparameters: { learning_rate: 0.001, epochs: 300 }, createdAt: '2026-01-15' },
];
const metricsData = mockVersions.map((v) => ({ date: v.createdAt, value: v.mape, province: 'MAPE' }));

const AlgorithmDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [algo, setAlgo] = useState<Algorithm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getAlgorithm(id)
      .then((a) => active && (setAlgo(a), setError(null)))
      .catch((e) => active && setError(e?.message || 'Failed to load algorithm'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1">
        {algo ? algo.name : 'Algorithm'} {algo && <StatusBadge status={algo.status} />}
      </Header>
      {error && (
        <Alert type="error" header="Failed to load algorithm" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Tabs
        tabs={[
          {
            label: 'Overview',
            id: 'overview',
            content: (
              <Container header={<Header variant="h2">Algorithm Details</Header>}>
                {loading || !algo ? (
                  <Spinner />
                ) : (
                  <ColumnLayout columns={2} variant="text-grid">
                    <SpaceBetween size="l">
                      <div>
                        <Box variant="awsui-key-label">ID</Box>
                        <div>{algo.id}</div>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Province</Box>
                        <div>{algo.province}</div>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Variety</Box>
                        <div>{algo.variety}</div>
                      </div>
                    </SpaceBetween>
                    <SpaceBetween size="l">
                      <div>
                        <Box variant="awsui-key-label">Created</Box>
                        <div>{algo.createdAt || 'N/A'}</div>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Updated</Box>
                        <div>{algo.updatedAt || 'N/A'}</div>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Current MAPE</Box>
                        <div>{algo.mape}%</div>
                      </div>
                    </SpaceBetween>
                  </ColumnLayout>
                )}
              </Container>
            ),
          },
          {
            label: 'Versions',
            id: 'versions',
            content: (
              <Table
                header={<Header variant="h2" description="Illustrative — MLflow version backend not wired yet">Model Versions</Header>}
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
