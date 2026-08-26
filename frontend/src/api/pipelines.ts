import apiClient from './client';

export type PipelineNodeType =
  | 'Preprocess'
  | 'Train'
  | 'Evaluate'
  | 'Condition'
  | 'Register'
  | 'Callback'
  | 'Step';

export interface PipelineGraphNode {
  id: string;
  type: PipelineNodeType;
  label: string;
  sageMakerType: string;
  config: Record<string, unknown>;
}

export interface PipelineGraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface PipelineParameter {
  name: string;
  type?: string;
  defaultValue?: unknown;
}

export interface PipelineGraph {
  pipelineName: string;
  exists: boolean;
  nodes: PipelineGraphNode[];
  edges: PipelineGraphEdge[];
  parameters: PipelineParameter[];
}

// GET /pipelines — the current pipeline as an editable graph (or a template
// when the pipeline does not exist yet).
export async function getPipelineGraph(): Promise<PipelineGraph> {
  const res = await apiClient.get<PipelineGraph>('/pipelines');
  return res.data;
}

// PUT /pipelines — save bounded edits (node config + parameter defaults);
// the backend applies them onto the real definition and calls UpdatePipeline.
export async function savePipelineGraph(graph: {
  pipelineName: string;
  nodes: PipelineGraphNode[];
  parameters: PipelineParameter[];
}): Promise<{ message: string; pipelineName: string }> {
  const res = await apiClient.put<{ message: string; pipelineName: string }>('/pipelines', graph);
  return res.data;
}
