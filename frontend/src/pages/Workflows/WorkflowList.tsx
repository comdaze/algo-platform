import React from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import type { PipelineExecution } from '../../types';

const mockExecutions: PipelineExecution[] = [
  { id: '1', pipelineName: 'train-heilongjiang', executionId: 'exec-001', status: 'Succeeded', startTime: '2024-01-15 10:00', endTime: '2024-01-15 10:25', duration: '25m', steps: [], pendingApproval: false },
  { id: '2', pipelineName: 'train-xinjiang', executionId: 'exec-002', status: 'Failed', startTime: '2024-01-15 09:30', endTime: '2024-01-15 09:42', duration: '12m', steps: [], pendingApproval: false },
  { id: '3', pipelineName: 'train-inner-mongolia', executionId: 'exec-003', status: 'Executing', startTime: '2024-01-15 09:00', duration: '45m+', steps: [], pendingApproval: false },
  { id: '4', pipelineName: 'retrain-ningxia', executionId: 'exec-004', status: 'Stopped', startTime: '2024-01-14 22:00', endTime: '2024-01-14 22:30', duration: '30m', steps: [], pendingApproval: true },
  { id: '5', pipelineName: 'evaluate-all', executionId: 'exec-005', status: 'Succeeded', startTime: '2024-01-14 20:00', endTime: '2024-01-14 21:10', duration: '1h 10m', steps: [], pendingApproval: false },
];

const statusTypeMap: Record<string, 'success' | 'error' | 'in-progress' | 'stopped' | 'pending'> = {
  Succeeded: 'success',
  Failed: 'error',
  Executing: 'in-progress',
  Stopping: 'in-progress',
  Stopped: 'stopped',
};

const WorkflowList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Table
      header={<Header variant="h1">Pipeline Executions</Header>}
      columnDefinitions={[
        { id: 'pipelineName', header: 'Pipeline Name', cell: (item) => item.pipelineName },
        { id: 'executionId', header: 'Execution ID', cell: (item) => item.executionId },
        {
          id: 'status',
          header: 'Status',
          cell: (item) => (
            <StatusIndicator type={statusTypeMap[item.status] || 'pending'}>
              {item.status}
            </StatusIndicator>
          ),
        },
        { id: 'startTime', header: 'Start Time', cell: (item) => item.startTime },
        { id: 'duration', header: 'Duration', cell: (item) => item.duration || '-' },
        {
          id: 'actions',
          header: 'Actions',
          cell: (item) => (
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="inline-link" onClick={() => navigate(`/workflows/${item.id}`)}>
                View
              </Button>
              {item.pendingApproval && (
                <>
                  <Button variant="inline-link">Approve</Button>
                  <Button variant="inline-link">Reject</Button>
                </>
              )}
            </SpaceBetween>
          ),
        },
      ]}
      items={mockExecutions}
      empty={<SpaceBetween size="m"><b>No executions</b></SpaceBetween>}
    />
  );
};

export default WorkflowList;
