import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import PipelineDAG from '../../components/PipelineDAG';
import type { PipelineStep } from '../../types';

const mockSteps: PipelineStep[] = [
  { name: 'PreprocessData', status: 'Succeeded', startTime: '2024-01-15 10:00', endTime: '2024-01-15 10:05' },
  { name: 'TrainModel', status: 'Succeeded', startTime: '2024-01-15 10:05', endTime: '2024-01-15 10:15' },
  { name: 'EvaluateModel', status: 'Succeeded', startTime: '2024-01-15 10:15', endTime: '2024-01-15 10:18' },
  { name: 'CheckMAPE', status: 'Succeeded', startTime: '2024-01-15 10:18', endTime: '2024-01-15 10:19' },
  { name: 'RegisterModel', status: 'Executing', startTime: '2024-01-15 10:19' },
  { name: 'H20Training', status: 'NotStarted' },
];

const WorkflowDetail: React.FC = () => {
  const { id: _id } = useParams<{ id: string }>();
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null);

  const handleNodeClick = (stepName: string) => {
    const step = mockSteps.find((s) => s.name === stepName) || null;
    setSelectedStep(step);
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Pipeline Execution Detail</Header>
      <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
        <Container header={<Header variant="h2">Pipeline DAG</Header>}>
          <PipelineDAG steps={mockSteps} onNodeClick={handleNodeClick} />
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
    </SpaceBetween>
  );
};

export default WorkflowDetail;
