import React from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Link from '@cloudscape-design/components/link';
import type { DriftFeature } from '../../types';

// Mock drift data
const mockDriftFeatures: DriftFeature[] = [
  { featureName: 'wind_speed', drifted: true, pValue: 0.002, statistic: 0.45 },
  { featureName: 'temperature', drifted: false, pValue: 0.15, statistic: 0.12 },
  { featureName: 'humidity', drifted: true, pValue: 0.01, statistic: 0.38 },
  { featureName: 'pressure', drifted: false, pValue: 0.42, statistic: 0.08 },
  { featureName: 'direction', drifted: false, pValue: 0.22, statistic: 0.11 },
  { featureName: 'turbulence', drifted: true, pValue: 0.005, statistic: 0.52 },
  { featureName: 'power_output_lag_1', drifted: false, pValue: 0.35, statistic: 0.09 },
  { featureName: 'power_output_lag_24', drifted: false, pValue: 0.61, statistic: 0.05 },
];

const DriftReportPage: React.FC = () => {
  const featuresDrifted = mockDriftFeatures.filter((f) => f.drifted).length;
  const totalFeatures = mockDriftFeatures.length;
  const driftScore = 0.35;
  const datasetDriftDetected = featuresDrifted > totalFeatures * 0.3;

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Drift Report</Header>
      <Grid gridDefinition={[{ colspan: 4 }, { colspan: 4 }, { colspan: 4 }]}>
        <Container>
          <Box variant="awsui-key-label">Features Drifted</Box>
          <Box variant="h1">{featuresDrifted} / {totalFeatures}</Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Drift Score</Box>
          <Box variant="h1">{driftScore.toFixed(2)}</Box>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Dataset Drift Detected</Box>
          <StatusIndicator type={datasetDriftDetected ? 'error' : 'success'}>
            {datasetDriftDetected ? 'Yes' : 'No'}
          </StatusIndicator>
        </Container>
      </Grid>

      <Container
        header={
          <Header
            variant="h2"
            actions={
              <Link href="/reports/drift-latest.html" external>
                View Full HTML Report
              </Link>
            }
          >
            Feature Drift Details
          </Header>
        }
      >
        <Table
          columnDefinitions={[
            { id: 'featureName', header: 'Feature', cell: (item) => item.featureName },
            {
              id: 'drifted',
              header: 'Drift Status',
              cell: (item) => (
                <StatusIndicator type={item.drifted ? 'error' : 'success'}>
                  {item.drifted ? 'Drifted' : 'Not Drifted'}
                </StatusIndicator>
              ),
            },
            { id: 'pValue', header: 'P-Value', cell: (item) => item.pValue.toFixed(4) },
            { id: 'statistic', header: 'Statistic', cell: (item) => item.statistic.toFixed(4) },
          ]}
          items={mockDriftFeatures}
          variant="embedded"
        />
      </Container>
    </SpaceBetween>
  );
};

export default DriftReportPage;
