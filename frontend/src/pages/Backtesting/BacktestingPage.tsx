import React, { useState, useMemo } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import DateRangePicker, { DateRangePickerProps } from '@cloudscape-design/components/date-range-picker';
import Button from '@cloudscape-design/components/button';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import Table from '@cloudscape-design/components/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { BacktestMetricsByProvince } from '../../types';

const algorithmOptions: SelectProps.Option[] = [
  { label: 'Wind Forecast - Heilongjiang', value: '1' },
  { label: 'Wind Forecast - Xinjiang', value: '2' },
  { label: 'Solar Forecast - Inner Mongolia', value: '3' },
  { label: 'Wind Forecast - Ningxia', value: '4' },
];

const versionOptions: SelectProps.Option[] = [
  { label: 'v3.0.0 (Production)', value: 'v3' },
  { label: 'v2.0.0 (Staging)', value: 'v2' },
  { label: 'v1.0.0 (Archived)', value: 'v1' },
];

// Mock backtest results
const mockPredictions = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2024-01-01');
  date.setDate(date.getDate() + i);
  const actual = 50 + Math.random() * 30;
  const predicted = actual + (Math.random() - 0.5) * 10;
  return { date: date.toISOString().slice(0, 10), actual, predicted };
});

const mockProvinceMetrics: BacktestMetricsByProvince[] = [
  { province: 'Heilongjiang', mape: 4.2, rmse: 8.5, mae: 5.8 },
  { province: 'Xinjiang', mape: 5.8, rmse: 11.2, mae: 7.5 },
  { province: 'Inner Mongolia', mape: 3.9, rmse: 7.8, mae: 5.1 },
  { province: 'Ningxia', mape: 7.1, rmse: 13.5, mae: 9.2 },
];

const BacktestingPage: React.FC = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SelectProps.Option | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SelectProps.Option | null>(null);
  const [dateRange, setDateRange] = useState<DateRangePickerProps.Value | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleRunBacktest = () => {
    setShowResults(true);
  };

  const chartOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Predicted', 'Actual'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: mockPredictions.map((p) => p.date),
      },
      yAxis: { type: 'value', name: 'MW' },
      series: [
        {
          name: 'Predicted',
          type: 'line',
          data: mockPredictions.map((p) => p.predicted.toFixed(2)),
          smooth: true,
        },
        {
          name: 'Actual',
          type: 'line',
          data: mockPredictions.map((p) => p.actual.toFixed(2)),
          smooth: true,
          lineStyle: { type: 'dashed' },
        },
      ],
    }),
    []
  );

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Backtesting</Header>
      <Container header={<Header variant="h2">Configure Backtest</Header>}>
        <Form
          actions={
            <Button
              variant="primary"
              onClick={handleRunBacktest}
              disabled={!selectedAlgorithm || !selectedVersion}
            >
              Run Backtest
            </Button>
          }
        >
          <SpaceBetween size="l">
            <FormField label="Algorithm">
              <Select
                selectedOption={selectedAlgorithm}
                onChange={({ detail }) => setSelectedAlgorithm(detail.selectedOption)}
                options={algorithmOptions}
                placeholder="Select algorithm"
              />
            </FormField>
            <FormField label="Model Version">
              <Select
                selectedOption={selectedVersion}
                onChange={({ detail }) => setSelectedVersion(detail.selectedOption)}
                options={versionOptions}
                placeholder="Select version"
              />
            </FormField>
            <FormField label="Date Range">
              <DateRangePicker
                value={dateRange}
                onChange={({ detail }) => setDateRange(detail.value)}
                relativeOptions={[
                  { key: 'previous-7-days', amount: 7, unit: 'day', type: 'relative' },
                  { key: 'previous-30-days', amount: 30, unit: 'day', type: 'relative' },
                  { key: 'previous-90-days', amount: 90, unit: 'day', type: 'relative' },
                ]}
                isValidRange={() => ({ valid: true })}
                placeholder="Select date range"
                i18nStrings={{
                  todayAriaLabel: 'Today',
                  nextMonthAriaLabel: 'Next month',
                  previousMonthAriaLabel: 'Previous month',
                  customRelativeRangeDurationLabel: 'Duration',
                  customRelativeRangeDurationPlaceholder: 'Enter duration',
                  customRelativeRangeOptionLabel: 'Custom range',
                  customRelativeRangeOptionDescription: 'Set a custom range in the past',
                  customRelativeRangeUnitLabel: 'Unit of time',
                  formatRelativeRange: (range) => `Last ${range.amount} ${range.unit}s`,
                  formatUnit: (unit, value) => (value === 1 ? unit : `${unit}s`),
                  dateTimeConstraintText: '',
                  relativeModeTitle: 'Relative range',
                  absoluteModeTitle: 'Absolute range',
                  relativeRangeSelectionHeading: 'Choose a range',
                  startDateLabel: 'Start date',
                  endDateLabel: 'End date',
                  startTimeLabel: 'Start time',
                  endTimeLabel: 'End time',
                  clearButtonLabel: 'Clear',
                  cancelButtonLabel: 'Cancel',
                  applyButtonLabel: 'Apply',
                }}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Container>

      {showResults && (
        <>
          <Grid gridDefinition={[{ colspan: 4 }, { colspan: 4 }, { colspan: 4 }]}>
            <Container>
              <Box variant="awsui-key-label">Overall MAPE</Box>
              <Box variant="h1">4.8%</Box>
            </Container>
            <Container>
              <Box variant="awsui-key-label">Overall RMSE</Box>
              <Box variant="h1">9.2</Box>
            </Container>
            <Container>
              <Box variant="awsui-key-label">Overall MAE</Box>
              <Box variant="h1">6.3</Box>
            </Container>
          </Grid>

          <Container header={<Header variant="h2">Predicted vs Actual</Header>}>
            <ReactECharts option={chartOption} style={{ height: '400px' }} />
          </Container>

          <Container header={<Header variant="h2">Metrics by Province</Header>}>
            <Table
              columnDefinitions={[
                { id: 'province', header: 'Province', cell: (item) => item.province },
                { id: 'mape', header: 'MAPE (%)', cell: (item) => `${item.mape}%` },
                { id: 'rmse', header: 'RMSE', cell: (item) => item.rmse.toFixed(2) },
                { id: 'mae', header: 'MAE', cell: (item) => item.mae.toFixed(2) },
              ]}
              items={mockProvinceMetrics}
              variant="embedded"
            />
          </Container>
        </>
      )}
    </SpaceBetween>
  );
};

export default BacktestingPage;
