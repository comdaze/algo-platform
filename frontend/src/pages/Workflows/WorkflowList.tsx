import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@cloudscape-design/components/table';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import { listExecutions, startExecution, type WorkflowExecution } from '../../api/workflows';

const statusTypeMap: Record<string, 'success' | 'error' | 'in-progress' | 'stopped' | 'pending'> = {
  Succeeded: 'success',
  Failed: 'error',
  Executing: 'in-progress',
  Stopping: 'in-progress',
  Stopped: 'stopped',
};

type Notice = { type: 'success' | 'error' | 'info'; text: string } | null;

const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const reload = useCallback(() => {
    setLoading(true);
    return listExecutions()
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((e) => setError(e?.message || 'Failed to load executions'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleRun = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const res = await startExecution();
      setNotice({ type: 'success', text: `Pipeline execution started: ${res.pipelineExecutionArn || 'ok'}` });
      await reload();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setNotice({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to start execution' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <SpaceBetween size="m">
      {error && (
        <Alert type="error" header="Failed to load executions" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type={notice.type} dismissible onDismiss={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      <Table
        loading={loading}
        loadingText="Loading executions..."
        header={
          <Header
            variant="h1"
            counter={!loading ? `(${items.length})` : undefined}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={reload} disabled={loading} />
                <Button variant="primary" loading={running} onClick={handleRun}>
                  Run Pipeline
                </Button>
              </SpaceBetween>
            }
          >
            Pipeline Executions
          </Header>
        }
        columnDefinitions={[
          { id: 'pipelineName', header: 'Pipeline Name', cell: (item) => item.pipelineName },
          { id: 'executionId', header: 'Execution ID', cell: (item) => item.executionId },
          {
            id: 'status',
            header: 'Status',
            cell: (item) => (
              <StatusIndicator type={statusTypeMap[item.status] || 'pending'}>{item.status}</StatusIndicator>
            ),
          },
          { id: 'startTime', header: 'Start Time', cell: (item) => item.startTime || '-' },
          {
            id: 'actions',
            header: 'Actions',
            cell: (item) => (
              <Button variant="inline-link" onClick={() => navigate(`/workflows/${encodeURIComponent(item.id)}`)}>
                View
              </Button>
            ),
          },
        ]}
        items={items}
        empty={
          <Box textAlign="center" padding="m">
            <b>No pipeline executions</b>
            <Box variant="p" color="text-body-secondary">
              Click "Run Pipeline" to start one (the SageMaker pipeline must exist first).
            </Box>
          </Box>
        }
      />
    </SpaceBetween>
  );
};

export default WorkflowList;
