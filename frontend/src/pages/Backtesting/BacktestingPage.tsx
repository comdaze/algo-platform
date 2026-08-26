import React, { useEffect, useState } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import Box from '@cloudscape-design/components/box';
import Alert from '@cloudscape-design/components/alert';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { listAlgorithms } from '../../api/algorithms';
import { triggerBacktest, getBacktestResult, type BacktestStatus } from '../../api/monitoring';

const sfnStatusMap: Record<string, 'success' | 'error' | 'in-progress' | 'stopped' | 'pending'> = {
  SUCCEEDED: 'success',
  FAILED: 'error',
  RUNNING: 'in-progress',
  TIMED_OUT: 'error',
  ABORTED: 'stopped',
};

const BacktestingPage: React.FC = () => {
  const [algoOptions, setAlgoOptions] = useState<SelectProps.Option[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SelectProps.Option | null>(null);
  const [modelVersion, setModelVersion] = useState('latest');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execArn, setExecArn] = useState<string | null>(null);
  const [status, setStatus] = useState<BacktestStatus | null>(null);

  useEffect(() => {
    listAlgorithms()
      .then((data) => setAlgoOptions(data.map((a) => ({ label: a.name, value: a.id }))))
      .catch(() => setAlgoOptions([]));
  }, []);

  // Poll the execution status until it reaches a terminal state.
  useEffect(() => {
    if (!execArn) return;
    let active = true;
    const tick = () => {
      getBacktestResult(execArn)
        .then((s) => {
          if (!active) return;
          setStatus(s);
          if (s.status && !['RUNNING'].includes(s.status)) return; // terminal -> stop
          timer = setTimeout(tick, 5000);
        })
        .catch(() => {
          if (active) timer = setTimeout(tick, 8000);
        });
    };
    let timer = setTimeout(tick, 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [execArn]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setStatus(null);
    setExecArn(null);
    try {
      const res = await triggerBacktest({
        algorithmId: selectedAlgorithm?.value,
        modelVersion,
        dateRange: { start: 'auto', end: 'auto' },
      });
      setExecArn(res.executionArn || null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Failed to start backtest');
    } finally {
      setRunning(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Backtesting</Header>
      {error && (
        <Alert type="error" header="Backtest error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Container header={<Header variant="h2">Configure Backtest</Header>}>
        <Form
          actions={
            <Button variant="primary" onClick={handleRun} loading={running} disabled={!selectedAlgorithm}>
              Run Backtest
            </Button>
          }
        >
          <SpaceBetween size="l">
            <FormField label="Algorithm">
              <Select
                selectedOption={selectedAlgorithm}
                onChange={({ detail }) => setSelectedAlgorithm(detail.selectedOption)}
                options={algoOptions}
                placeholder="Select algorithm"
                empty="No algorithms"
              />
            </FormField>
            <FormField label="Model Version">
              <Input value={modelVersion} onChange={({ detail }) => setModelVersion(detail.value)} />
            </FormField>
          </SpaceBetween>
        </Form>
      </Container>

      {(execArn || status) && (
        <Container header={<Header variant="h2">Execution</Header>}>
          <SpaceBetween size="m">
            <div>
              <Box variant="awsui-key-label">Status</Box>
              <StatusIndicator type={sfnStatusMap[status?.status || 'RUNNING'] || 'in-progress'}>
                {status?.status || 'RUNNING'}
              </StatusIndicator>
            </div>
            <div>
              <Box variant="awsui-key-label">Execution ARN</Box>
              <Box variant="code">{execArn}</Box>
            </div>
            {status?.output != null && (
              <div>
                <Box variant="awsui-key-label">Output</Box>
                <Box variant="code">{JSON.stringify(status.output)}</Box>
              </div>
            )}
            <Box variant="small" color="text-body-secondary">
              The backtest runs as a Step Functions execution (SageMaker processing job). It will fail downstream
              until reference/backtest data and the processing image are provided — the trigger and status wiring
              are live.
            </Box>
          </SpaceBetween>
        </Container>
      )}
    </SpaceBetween>
  );
};

export default BacktestingPage;
