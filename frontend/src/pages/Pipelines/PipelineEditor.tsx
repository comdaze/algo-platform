import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Button from '@cloudscape-design/components/button';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Alert from '@cloudscape-design/components/alert';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';

import {
  getPipelineGraph,
  savePipelineGraph,
  type PipelineGraph,
  type PipelineGraphNode,
  type PipelineNodeType,
  type PipelineParameter,
} from '../../api/pipelines';

const TYPE_COLOR: Record<PipelineNodeType, string> = {
  Preprocess: '#e1f5fe',
  Train: '#e8f5e9',
  Evaluate: '#fff3e0',
  Condition: '#f3e5f5',
  Register: '#e0f2f1',
  Callback: '#fce4ec',
  Step: '#eceff1',
};

// Simple layered layout: x by longest-path depth, y by index within the layer.
function layout(graph: PipelineGraph): { nodes: Node[]; edges: Edge[] } {
  const depth: Record<string, number> = {};
  graph.nodes.forEach((n) => (depth[n.id] = 0));
  for (let i = 0; i < graph.nodes.length; i++) {
    graph.edges.forEach((e) => {
      if (depth[e.to] !== undefined && depth[e.from] !== undefined && depth[e.to] < depth[e.from] + 1) {
        depth[e.to] = depth[e.from] + 1;
      }
    });
  }
  const perLayer: Record<number, number> = {};
  const rfNodes: Node[] = graph.nodes.map((n) => {
    const d = depth[n.id] || 0;
    const idx = perLayer[d] || 0;
    perLayer[d] = idx + 1;
    return {
      id: n.id,
      position: { x: d * 240, y: idx * 130 },
      data: { label: `${n.id}\n(${n.type})` },
      style: {
        background: TYPE_COLOR[n.type] || TYPE_COLOR.Step,
        border: '1px solid #879596',
        borderRadius: 8,
        padding: 8,
        fontSize: 12,
        width: 180,
        whiteSpace: 'pre-line',
        textAlign: 'center',
      },
    };
  });
  const rfEdges: Edge[] = graph.edges.map((e, i) => ({
    id: `e${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    label: e.label,
    animated: e.label === 'if true',
    style: { stroke: '#5f6b7a' },
  }));
  return { nodes: rfNodes, edges: rfEdges };
}

const APPROVAL_OPTIONS = [
  { label: 'PendingManualApproval', value: 'PendingManualApproval' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];

const PipelineEditor: React.FC = () => {
  const [graph, setGraph] = useState<PipelineGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editable state kept separate from the canvas.
  const [configById, setConfigById] = useState<Record<string, Record<string, unknown>>>({});
  const [params, setParams] = useState<PipelineParameter[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await getPipelineGraph();
      setGraph(g);
      const laid = layout(g);
      setNodes(laid.nodes);
      setEdges(laid.edges);
      const cfg: Record<string, Record<string, unknown>> = {};
      g.nodes.forEach((n) => (cfg[n.id] = { ...(n.config || {}) }));
      setConfigById(cfg);
      setParams(g.parameters.map((p) => ({ ...p })));
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载流水线失败');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    load();
  }, [load]);

  const nodeMeta = useMemo(() => {
    const m: Record<string, PipelineGraphNode> = {};
    graph?.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [graph]);

  const onNodeClick = useCallback((_: unknown, node: Node) => setSelectedId(node.id), []);

  const updateConfig = (id: string, patch: Record<string, unknown>) =>
    setConfigById((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateHyperparam = (id: string, key: string, value: string) =>
    setConfigById((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        hyperparameters: { ...(prev[id]?.hyperparameters as Record<string, unknown>), [key]: value },
      },
    }));

  const onSave = async () => {
    if (!graph) return;
    setSaving(true);
    setFlash([]);
    try {
      const mergedNodes: PipelineGraphNode[] = graph.nodes.map((n) => ({
        ...n,
        config: configById[n.id] || n.config,
      }));
      const res = await savePipelineGraph({
        pipelineName: graph.pipelineName,
        nodes: mergedNodes,
        parameters: params,
      });
      setFlash([
        {
          type: 'success',
          content: `已保存并更新流水线 ${res.pipelineName}（UpdatePipeline 成功）`,
          dismissible: true,
          onDismiss: () => setFlash([]),
        },
      ]);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败';
      setFlash([
        {
          type: 'error',
          content: `保存失败：${msg}。若提示流水线不存在，请先运行 ml_pipeline/run_pipeline.py 创建。`,
          dismissible: true,
          onDismiss: () => setFlash([]),
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const renderNodeForm = () => {
    if (!selectedId) return <Box color="text-status-inactive">在画布中点选一个节点以编辑其配置。</Box>;
    const meta = nodeMeta[selectedId];
    const cfg = configById[selectedId] || {};
    if (!meta) return null;

    if (meta.type === 'Condition') {
      return (
        <SpaceBetween size="m">
          <Box variant="awsui-key-label">节点：{meta.id}（Condition · MAPE 阈值）</Box>
          <FormField label="MAPE 阈值 (RightValue)" description="MAPE ≤ 阈值 时进入 RegisterModel 分支">
            <Input
              type="number"
              value={String(cfg.threshold ?? '')}
              onChange={({ detail }) => updateConfig(selectedId, { threshold: detail.value })}
            />
          </FormField>
        </SpaceBetween>
      );
    }
    if (meta.type === 'Train') {
      const hp = (cfg.hyperparameters as Record<string, unknown>) || {};
      return (
        <SpaceBetween size="m">
          <Box variant="awsui-key-label">节点：{meta.id}（Training · XGBoost 超参）</Box>
          <ColumnLayout columns={3}>
            <FormField label="num_round">
              <Input value={String(hp.num_round ?? '')} onChange={({ detail }) => updateHyperparam(selectedId, 'num_round', detail.value)} />
            </FormField>
            <FormField label="max_depth">
              <Input value={String(hp.max_depth ?? '')} onChange={({ detail }) => updateHyperparam(selectedId, 'max_depth', detail.value)} />
            </FormField>
            <FormField label="eta">
              <Input value={String(hp.eta ?? '')} onChange={({ detail }) => updateHyperparam(selectedId, 'eta', detail.value)} />
            </FormField>
          </ColumnLayout>
          {cfg.instanceTypeParam !== undefined && (
            <Box color="text-body-secondary">实例类型：由流水线参数 <b>{String(cfg.instanceTypeParam)}</b> 控制（见下方参数区）</Box>
          )}
        </SpaceBetween>
      );
    }
    if (meta.type === 'Preprocess') {
      return (
        <SpaceBetween size="m">
          <Box variant="awsui-key-label">节点：{meta.id}（Processing · 特征工程）</Box>
          <FormField label="特征列 (--features)" description="逗号分隔的特征名，写回到容器参数">
            <Input
              value={String(cfg.features ?? '')}
              onChange={({ detail }) => updateConfig(selectedId, { features: detail.value })}
            />
          </FormField>
          {cfg.instanceTypeParam !== undefined && (
            <Box color="text-body-secondary">
              实例类型 / 数量：由流水线参数 <b>{String(cfg.instanceTypeParam)}</b> / <b>{String(cfg.instanceCountParam)}</b> 控制（见下方参数区）
            </Box>
          )}
        </SpaceBetween>
      );
    }
    if (meta.type === 'Evaluate') {
      return (
        <SpaceBetween size="s">
          <Box variant="awsui-key-label">节点：{meta.id}（Processing · 评估，产出 MAPE）</Box>
          <Box color="text-body-secondary">
            评估脚本产出 wind_power_metrics.mape.value，供 CheckMAPE 判定。
            {cfg.instanceTypeParam !== undefined && <> 实例类型由参数 <b>{String(cfg.instanceTypeParam)}</b> 控制。</>}
          </Box>
        </SpaceBetween>
      );
    }
    if (meta.type === 'Register') {
      return (
        <SpaceBetween size="m">
          <Box variant="awsui-key-label">节点：{meta.id}（RegisterModel · 模型注册）</Box>
          <FormField label="模型包组 (ModelPackageGroupName)">
            <Input
              value={String(cfg.modelPackageGroupName ?? '')}
              onChange={({ detail }) => updateConfig(selectedId, { modelPackageGroupName: detail.value })}
            />
          </FormField>
          {cfg.approvalStatusParam !== undefined && (
            <Box color="text-body-secondary">审批状态：由流水线参数 <b>{String(cfg.approvalStatusParam)}</b> 控制（见下方参数区）</Box>
          )}
        </SpaceBetween>
      );
    }
    // Read-only info for any remaining kinds (e.g. Callback).
    return (
      <SpaceBetween size="s">
        <Box variant="awsui-key-label">节点：{meta.id}（{meta.type} · {meta.sageMakerType}）</Box>
        <Box color="text-body-secondary">
          该节点类型在 v1 为只读展示（结构增删节点见后续通用编辑器）。
        </Box>
        {Object.keys(cfg).length > 0 && (
          <Box variant="code" fontSize="body-s">
            {JSON.stringify(cfg, null, 2)}
          </Box>
        )}
      </SpaceBetween>
    );
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="图形化查看/编辑 SageMaker 流水线（固定调色板：Preprocess→Train→Evaluate→Condition→Register）。保存时后端在真实定义上应用改动并 UpdatePipeline。"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={load} disabled={loading || saving}>刷新</Button>
            <Button variant="primary" onClick={onSave} loading={saving} disabled={loading || !graph}>保存到 SageMaker</Button>
          </SpaceBetween>
        }
      >
        流水线编辑器 · Pipeline Editor
      </Header>

      {flash.length > 0 && <Flashbar items={flash} />}
      {error && <Alert type="error" header="加载失败">{error}</Alert>}

      {graph && !graph.exists && (
        <Alert type="info" header="流水线尚未创建">
          当前展示的是默认模板（固定形态）。真实流水线创建后（运行 ml_pipeline/run_pipeline.py），此处将读取并可编辑真实定义；此前“保存”会返回需先创建的提示。
        </Alert>
      )}

      {graph && (
        <Box>
          流水线：<Badge color="blue">{graph.pipelineName}</Badge>{' '}
          {graph.exists ? <Badge color="green">已存在</Badge> : <Badge color="grey">模板</Badge>}
        </Box>
      )}

      <Container header={<Header variant="h2">DAG 画布</Header>}>
        <div style={{ height: 460, width: '100%', border: '1px solid #e9ebed', borderRadius: 8 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </Container>

      <Container header={<Header variant="h2">节点配置</Header>}>{renderNodeForm()}</Container>

      <ExpandableSection defaultExpanded headerText="流水线参数 (Pipeline Parameters)">
        <ColumnLayout columns={2}>
          {params.map((p, i) => (
            <FormField key={p.name} label={`${p.name} (${p.type || 'String'})`}>
              {p.name === 'ModelApprovalStatus' ? (
                <Select
                  selectedOption={APPROVAL_OPTIONS.find((o) => o.value === String(p.defaultValue)) || null}
                  options={APPROVAL_OPTIONS}
                  onChange={({ detail }) =>
                    setParams((prev) => prev.map((x, j) => (j === i ? { ...x, defaultValue: detail.selectedOption.value } : x)))
                  }
                />
              ) : (
                <Input
                  value={String(p.defaultValue ?? '')}
                  onChange={({ detail }) =>
                    setParams((prev) => prev.map((x, j) => (j === i ? { ...x, defaultValue: detail.value } : x)))
                  }
                />
              )}
            </FormField>
          ))}
        </ColumnLayout>
      </ExpandableSection>
    </SpaceBetween>
  );
};

export default PipelineEditor;
