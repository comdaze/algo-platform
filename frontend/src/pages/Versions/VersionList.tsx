import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Link from '@cloudscape-design/components/link';
import type { ModelVersion } from '../../types';

const mockVersions: ModelVersion[] = [
  { id: 'v1', algorithmId: '1', algorithmName: 'Wind Forecast - HLJ', version: '3.0.0', stage: 'Production', mape: 4.2, rmse: 8.5, mae: 5.8, hyperparameters: { lr: 0.001 }, mlflowRunId: 'run-001', createdAt: '2024-01-15' },
  { id: 'v2', algorithmId: '1', algorithmName: 'Wind Forecast - HLJ', version: '2.0.0', stage: 'Archived', mape: 5.2, rmse: 10.1, mae: 7.0, hyperparameters: { lr: 0.005 }, mlflowRunId: 'run-002', createdAt: '2024-01-08' },
  { id: 'v3', algorithmId: '2', algorithmName: 'Wind Forecast - XJ', version: '1.0.0', stage: 'Staging', mape: 5.8, rmse: 11.2, mae: 7.5, hyperparameters: { lr: 0.01 }, mlflowRunId: 'run-003', createdAt: '2024-01-10' },
  { id: 'v4', algorithmId: '3', algorithmName: 'Solar Forecast - NM', version: '2.0.0', stage: 'Production', mape: 3.9, rmse: 7.8, mae: 5.1, hyperparameters: { lr: 0.002 }, mlflowRunId: 'run-004', createdAt: '2024-01-12' },
  { id: 'v5', algorithmId: '4', algorithmName: 'Wind Forecast - NX', version: '1.0.0', stage: 'None', mape: 7.1, rmse: 13.5, mae: 9.2, hyperparameters: { lr: 0.01 }, mlflowRunId: 'run-005', createdAt: '2024-01-05' },
];

const VersionList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<ModelVersion[]>([]);

  const handleCompare = () => {
    if (selectedItems.length === 2) {
      navigate(`/versions/compare?a=${selectedItems[0].id}&b=${selectedItems[1].id}`);
    }
  };

  return (
    <Table
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={selectedItems.length !== 2}
                onClick={handleCompare}
              >
                Compare
              </Button>
            </SpaceBetween>
          }
        >
          Model Versions
        </Header>
      }
      columnDefinitions={[
        { id: 'algorithm', header: 'Algorithm', cell: (item) => item.algorithmName },
        { id: 'version', header: 'Version', cell: (item) => item.version },
        { id: 'stage', header: 'Stage', cell: (item) => item.stage },
        { id: 'mape', header: 'MAPE (%)', cell: (item) => `${item.mape}%` },
        { id: 'rmse', header: 'RMSE', cell: (item) => item.rmse.toFixed(2) },
        { id: 'mae', header: 'MAE', cell: (item) => item.mae.toFixed(2) },
        { id: 'createdAt', header: 'Created', cell: (item) => item.createdAt },
        {
          id: 'mlflow',
          header: 'MLflow',
          cell: (item) => (
            <Link href={`/mlflow/#/experiments/0/runs/${item.mlflowRunId}`} external>
              View
            </Link>
          ),
        },
      ]}
      items={mockVersions}
      selectionType="multi"
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
      empty={<SpaceBetween size="m"><b>No versions</b></SpaceBetween>}
    />
  );
};

export default VersionList;
