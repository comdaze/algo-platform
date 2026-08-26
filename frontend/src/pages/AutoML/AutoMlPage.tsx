import React, { useCallback, useEffect, useState } from 'react';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import Textarea from '@cloudscape-design/components/textarea';
import Button from '@cloudscape-design/components/button';
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { startAutoml, listAutoml, getAutoml, type AutoMlRun } from '../../api/automl';

const INSTANCES = [
  { label: 'ml.g5.xlarge (GPU, 推荐)', value: 'ml.g5.xlarge' },
  { label: 'ml.g4dn.xlarge (GPU, 更便宜)', value: 'ml.g4dn.xlarge' },
  { label: 'ml.m5.2xlarge (CPU, 表格任务)', value: 'ml.m5.2xlarge' },
];

function statusColor(s?: string): 'green' | 'red' | 'blue' | 'grey' {
  if (s === 'Completed') return 'green';
  if (s === 'Failed' || s === 'Stopped') return 'red';
  if (s === 'InProgress') return 'blue';
  return 'grey';
}

const AutoMlPage: React.FC = () => {
  const [datasetS3Uri, setDatasetS3Uri] = useState('');
  const [task, setTask] = useState('');
  const [instanceType, setInstanceType] = useState('ml.g5.xlarge');
  const [runs, setRuns] = useState<AutoMlRun[]>([]);
  const [selected, setSelected] = useState<AutoMlRun | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await listAutoml());
    } catch {
      /* ignore list errors */
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Poll the selected run while it is in progress.
  useEffect(() => {
    if (!selected || selected.status !== 'InProgress') return;
    const t = setInterval(async () => {
      try {
        const r = await getAutoml(selected.runId);
        setSelected(r);
        if (r.status !== 'InProgress') loadRuns();
      } catch {
        /* ignore */
      }
    }, 15000);
    return () => clearInterval(t);
  }, [selected, loadRuns]);

  const onRun = async () => {
    if (!datasetS3Uri.startsWith('s3://')) {
      setFlash([{ type: 'error', content: '请填写数据集的 S3 路径（s3://...，目录含 train.csv[/ test.csv]）', dismissible: true, onDismiss: () => setFlash([]) }]);
      return;
    }
    setSubmitting(true);
    setFlash([]);
    try {
      const r = await startAutoml({ datasetS3Uri, task, instanceType });
      setFlash([{ type: 'success', content: `已触发 AutoML 作业 ${r.runId}（SageMaker Processing 起 GPU 运行，跑完自动销毁）`, dismissible: true, onDismiss: () => setFlash([]) }]);
      setSelected(r);
      await loadRuns();
    } catch (e) {
      setFlash([{ type: 'error', content: e instanceof Error ? e.message : '触发失败', dismissible: true, onDismiss: () => setFlash([]) }]);
    } finally {
      setSubmitting(false);
    }
  };

  const vm = selected?.summary?.validation_metrics as Record<string, unknown> | undefined;

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="AutoGluon Assistant (MLZero) 触发式 AutoML：给数据集 + 任务说明，SageMaker Processing 起 GPU 自动写代码/训练/预测，跑完自动销毁（无闲置成本）。LLM 走「设置」页配置的端点。"
      >
        AutoML 助手 · MLZero
      </Header>
      {flash.length > 0 && <Flashbar items={flash} />}

      <Container header={<Header variant="h2">新建 AutoML 运行</Header>}>
        <Form actions={<Button variant="primary" onClick={onRun} loading={submitting}>运行 AutoML</Button>}>
          <SpaceBetween size="l">
            <FormField label="数据集 S3 路径" description="目录，含 train.csv（可选 test.csv），如 s3://bucket/automl-input/wind/">
              <Input value={datasetS3Uri} onChange={({ detail }) => setDatasetS3Uri(detail.value)} placeholder="s3://.../dataset-dir/" />
            </FormField>
            <FormField label="任务说明（可选）" description="用自然语言描述目标与评估指标">
              <Textarea value={task} onChange={({ detail }) => setTask(detail.value)} placeholder="回归预测 power_output（风机功率 kW），报告验证 RMSE / MAPE。" />
            </FormField>
            <FormField label="计算实例">
              <Select
                selectedOption={INSTANCES.find((i) => i.value === instanceType) || INSTANCES[0]}
                options={INSTANCES}
                onChange={({ detail }) => setInstanceType(detail.selectedOption.value || 'ml.g5.xlarge')}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Container>

      {selected && (
        <Container header={<Header variant="h2">运行详情：{selected.runId}</Header>}>
          <SpaceBetween size="m">
            <Box>状态：<Badge color={statusColor(selected.status)}>{selected.status}</Badge>{selected.status === 'InProgress' ? ' （每 15s 自动刷新）' : ''}</Box>
            {selected.failureReason && <Alert type="error" header="失败原因">{selected.failureReason}</Alert>}
            {vm && (
              <ColumnLayout columns={3} variant="text-grid">
                <div><Box variant="awsui-key-label">Validation RMSE</Box>{String(vm.validation_rmse ?? '-')}</div>
                <div><Box variant="awsui-key-label">Validation MAPE (%)</Box>{String(vm.validation_mape_percent ?? '-')}</div>
                <div><Box variant="awsui-key-label">Target</Box>{String(vm.target ?? '-')}</div>
              </ColumnLayout>
            )}
            {selected.summary?.model_dir && <Box color="text-body-secondary">模型产物：{selected.outputS3}/{selected.summary.model_dir}</Box>}
            {selected.summary?.results_csv && <Box color="text-body-secondary">预测结果：{selected.outputS3}/{selected.summary.results_csv}</Box>}
            {selected.summary?.mlflow_model?.version && (
              <Box>已注册 MLflow：<Badge color="green">{selected.summary.mlflow_model.name} v{selected.summary.mlflow_model.version}</Badge></Box>
            )}
            {selected.summary?.mlflow_register_error && (
              <Alert type="warning" header="MLflow 注册未成功（模型与指标仍在 S3）">{selected.summary.mlflow_register_error}</Alert>
            )}
            {selected.status === 'Completed' && !vm && <Alert type="info">作业完成，但未解析到 validation_metrics（查看 S3 输出的 summary.json）。</Alert>}
          </SpaceBetween>
        </Container>
      )}

      <Table
        header={<Header variant="h2" actions={<Button iconName="refresh" onClick={loadRuns}>刷新</Button>}>历史运行</Header>}
        items={runs}
        trackBy="runId"
        selectionType="single"
        selectedItems={selected ? runs.filter((r) => r.runId === selected.runId) : []}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems[0] || null)}
        columnDefinitions={[
          { id: 'runId', header: 'Run', cell: (r) => r.runId },
          { id: 'status', header: '状态', cell: (r) => <Badge color={statusColor(r.status)}>{r.status}</Badge> },
          { id: 'dataset', header: '数据集', cell: (r) => r.datasetS3Uri || '-' },
          { id: 'instance', header: '实例', cell: (r) => r.instanceType || '-' },
          { id: 'createdAt', header: '创建时间', cell: (r) => r.createdAt || '-' },
        ]}
        empty={<Box textAlign="center" color="inherit">暂无运行。填写上方表单触发一次。</Box>}
        variant="container"
      />
    </SpaceBetween>
  );
};

export default AutoMlPage;
