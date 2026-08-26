import React, { useEffect, useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Alert from '@cloudscape-design/components/alert';
import { getDriftReport, type DriftReportView } from '../../api/monitoring';

const DriftReportPage: React.FC = () => {
  const [report, setReport] = useState<DriftReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDriftReport()
      .then((r) => active && (setReport(r), setError(null)))
      .catch((e) => active && setError(e?.message || 'Failed to load drift report'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const features = report?.features ?? [];
  const featuresDrifted = features.filter((f) => f.drifted).length;
  const totalFeatures = features.length;
  const driftScore = report?.driftScore ?? 0;
  const datasetDriftDetected = driftScore > (report?.threshold ?? 0.1);

  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header variant="h1" description={report?.timestamp ? `As of ${report.timestamp}` : 'Evidently data-drift report'}>
          Drift Report
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" header="Failed to load drift report" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Grid gridDefinition={[{ colspan: { default: 12, xs: 4 } }, { colspan: { default: 12, xs: 4 } }, { colspan: { default: 12, xs: 4 } }]}>
          <Container>
            <Box variant="awsui-key-label">Features Drifted</Box>
            <Box variant="h1">
              {featuresDrifted} / {totalFeatures}
            </Box>
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

        <Container header={<Header variant="h2">Feature Drift Details</Header>}>
          <Table
            loading={loading}
            loadingText="Loading drift report..."
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
            items={features}
            variant="embedded"
            empty={
              <Box textAlign="center" padding="m" color="text-body-secondary">
                No feature drift data (Evidently reports appear here once monitoring has run).
              </Box>
            }
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default DriftReportPage;
