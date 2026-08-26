import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import Alert from '@cloudscape-design/components/alert';
import Spinner from '@cloudscape-design/components/spinner';
import PipelineDAG from '../../components/PipelineDAG';
import type { PipelineStep } from '../../types';
import { getExecution, type WorkflowStepView } from '../../api/workflows';

const WorkflowDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [steps, setSteps] = useState<WorkflowStepView[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStepView | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getExecution(id)
      .then((data) => {
        if (!active) return;
        setSteps(data.steps);
        setStatus(data.execution.pipelineExecutionStatus || '');
        setError(null);
      })
      .catch((e) => active && setError(e?.message || 'Failed to load execution'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const handleNodeClick = (stepName: string) => {
    setSelectedStep(steps.find((s) => s.name === stepName) || null);
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={status ? `Status: ${status}` : undefined}>
        Pipeline Execution Detail
      </Header>
      {error && (
        <Alert type="error" header="Failed to load execution" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Spinner size="large" />
      ) : steps.length === 0 ? (
        <Box textAlign="center" padding="l" color="text-body-secondary">
          No step data for this execution.
        </Box>
      ) : (
        <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
          <Container header={<Header variant="h2">Pipeline DAG</Header>}>
            <PipelineDAG steps={steps as unknown as PipelineStep[]} onNodeClick={handleNodeClick} />
          </Container>
          <Container header={<Header variant="h2">Step Details</Header>}>
            {selectedStep ? (
              <SpaceBetween size="m">
                <div>
                  <Box variant="awsui-key-label">Step Name</Box>
                  <div>{selectedStep.name}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Status</Box>
                  <div>{selectedStep.status}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">Start Time</Box>
                  <div>{selectedStep.startTime || 'N/A'}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">End Time</Box>
                  <div>{selectedStep.endTime || 'N/A'}</div>
                </div>
              </SpaceBetween>
            ) : (
              <Box color="text-body-secondary">Click a node in the DAG to see step details</Box>
            )}
          </Container>
        </Grid>
      )}
    </SpaceBetween>
  );
};

export default WorkflowDetail;
