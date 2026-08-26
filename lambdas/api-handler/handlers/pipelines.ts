import {
  SageMakerClient,
  DescribePipelineCommand,
  UpdatePipelineCommand,
} from '@aws-sdk/client-sagemaker';

const client = new SageMakerClient({ region: process.env.REGION });

const DEFAULT_PIPELINE = process.env.PIPELINE_NAME || 'AlgoWindPowerPipeline';
const PIPELINE_ROLE_ARN = process.env.SAGEMAKER_PIPELINE_ROLE_ARN || '';

// ---- Graph model (our own, editor-facing schema) -------------------------
// A node maps 1:1 to a SageMaker step; `type` is the fixed palette kind.
interface GraphNode {
  id: string;
  type: 'Preprocess' | 'Train' | 'Evaluate' | 'Condition' | 'Register' | 'Callback' | 'Step';
  label: string;
  sageMakerType: string;
  config: Record<string, unknown>;
}
interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}
interface GraphParameter {
  name: string;
  type?: string;
  defaultValue?: unknown;
}
interface PipelineGraph {
  pipelineName: string;
  exists: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  parameters: GraphParameter[];
}

function mapType(smType: string, name: string): GraphNode['type'] {
  if (smType === 'Training') return 'Train';
  if (smType === 'Condition') return 'Condition';
  if (smType === 'Callback') return 'Callback';
  if (smType === 'RegisterModel' || smType === 'Model' || /register/i.test(name)) return 'Register';
  if (smType === 'Processing') return /eval/i.test(name) ? 'Evaluate' : 'Preprocess';
  return 'Step';
}

// Collect referenced step names from any nested "Steps.<name>..." string.
function scanStepRefs(obj: unknown): string[] {
  const found = new Set<string>();
  const walk = (o: unknown): void => {
    if (typeof o === 'string') {
      const matches = o.match(/Steps\.([A-Za-z0-9_-]+)/g);
      if (matches) matches.forEach((m) => found.add(m.split('.')[1]));
    } else if (Array.isArray(o)) {
      o.forEach(walk);
    } else if (o && typeof o === 'object') {
      Object.values(o as Record<string, unknown>).forEach(walk);
    }
  };
  walk(obj);
  return [...found];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

// A definition value may be a literal or a parameter reference {"Get":"Parameters.X"}.
// Returns { param: 'X' } for a param ref, { literal: value } for a literal.
function resolveVal(v: unknown): { param?: string; literal?: unknown } {
  if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).Get === 'string') {
    const g = String((v as Record<string, unknown>).Get);
    const m = g.match(/^Parameters\.(.+)$/);
    if (m) return { param: m[1] };
    return {};
  }
  return { literal: v };
}

// Extract the editable, form-friendly config for a step (best-effort; the
// fields we know how to write back in updatePipelineGraph).
function extractConfig(step: Record<string, unknown>): Record<string, unknown> {
  const type = String(step.Type || '');
  const name = String(step.Name || '');
  const args = asRecord(step.Arguments);
  const config: Record<string, unknown> = {};

  if (type === 'Condition') {
    const conditions = Array.isArray(args.Conditions) ? args.Conditions : [];
    const first = asRecord(conditions[0]);
    if (first.RightValue !== undefined && typeof first.RightValue !== 'object') {
      config.threshold = first.RightValue;
    }
    config.operator = first.Type;
  } else if (type === 'Training') {
    const hp = asRecord(args.HyperParameters);
    config.hyperparameters = {
      num_round: hp.num_round,
      max_depth: hp.max_depth,
      eta: hp.eta,
    };
    const rc = resolveVal(asRecord(args.ResourceConfig).InstanceType);
    if (rc.param) config.instanceTypeParam = rc.param;
    else if (rc.literal !== undefined) config.instanceType = rc.literal;
  } else if (type === 'Processing') {
    const cc = asRecord(asRecord(args.ProcessingResources).ClusterConfig);
    const it = resolveVal(cc.InstanceType);
    if (it.param) config.instanceTypeParam = it.param;
    else if (it.literal !== undefined) config.instanceType = it.literal;
    const ic = resolveVal(cc.InstanceCount);
    if (ic.param) config.instanceCountParam = ic.param;
    else if (ic.literal !== undefined) config.instanceCount = ic.literal;
    // Editable literal: the --features CSV in the container arguments (Preprocess).
    const ca = asRecord(args.AppSpecification).ContainerArguments;
    if (Array.isArray(ca)) {
      const fi = ca.indexOf('--features');
      if (fi >= 0 && fi + 1 < ca.length) config.features = ca[fi + 1];
    }
  } else if (type === 'RegisterModel' || type === 'Model') {
    const mpg = resolveVal(args.ModelPackageGroupName);
    if (mpg.literal !== undefined) config.modelPackageGroupName = mpg.literal;
    else if (mpg.param) config.modelPackageGroupNameParam = mpg.param;
    const ap = resolveVal(args.ModelApprovalStatus);
    if (ap.param) config.approvalStatusParam = ap.param;
    else if (ap.literal !== undefined) config.approvalStatus = ap.literal;
  }
  return config;
}

function parseDefinition(pipelineName: string, defStr: string): PipelineGraph {
  const def = JSON.parse(defStr) as Record<string, unknown>;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const addNode = (step: Record<string, unknown>) => {
    const name = String(step.Name || '');
    if (!name || seen.has(name)) return;
    seen.add(name);
    const smType = String(step.Type || '');
    nodes.push({
      id: name,
      type: mapType(smType, name),
      label: name,
      sageMakerType: smType,
      config: extractConfig(step),
    });
  };
  const addEdge = (from: string, to: string, label?: string) => {
    if (from && to && from !== to && !edges.some((e) => e.from === from && e.to === to)) {
      edges.push({ from, to, label });
    }
  };

  const handleStep = (step: Record<string, unknown>) => {
    addNode(step);
    const name = String(step.Name || '');
    const smType = String(step.Type || '');
    const args = asRecord(step.Arguments);
    if (smType === 'Condition') {
      // Refs from the condition predicate only (not the nested branch steps).
      scanStepRefs(args.Conditions).forEach((r) => addEdge(r, name));
      const ifSteps = Array.isArray(args.IfSteps) ? args.IfSteps : [];
      const elseSteps = Array.isArray(args.ElseSteps) ? args.ElseSteps : [];
      ifSteps.forEach((s) => {
        const child = asRecord(s);
        handleStep(child);
        addEdge(name, String(child.Name || ''), 'if true');
      });
      elseSteps.forEach((s) => {
        const child = asRecord(s);
        handleStep(child);
        addEdge(name, String(child.Name || ''), 'if false');
      });
    } else {
      scanStepRefs(step.Arguments).forEach((r) => addEdge(r, name));
    }
  };

  const steps = Array.isArray(def.Steps) ? def.Steps : [];
  steps.forEach((s) => handleStep(asRecord(s)));

  const rawParams = Array.isArray(def.Parameters) ? def.Parameters : [];
  const parameters: GraphParameter[] = rawParams.map((p) => {
    const pr = asRecord(p);
    return { name: String(pr.Name || ''), type: pr.Type as string, defaultValue: pr.DefaultValue };
  });

  return { pipelineName, exists: true, nodes, edges, parameters };
}

// A default template graph so the editor renders even before the pipeline
// is created (matches the fixed palette / known pipeline shape).
function defaultTemplateGraph(pipelineName: string): PipelineGraph {
  const nodes: GraphNode[] = [
    { id: 'PreprocessData', type: 'Preprocess', label: 'PreprocessData', sageMakerType: 'Processing', config: { instanceTypeParam: 'ProcessingInstanceType', instanceCountParam: 'ProcessingInstanceCount', features: 'wind_speed,wind_direction,temperature,humidity,pressure,turbine_id' } },
    { id: 'TrainModel', type: 'Train', label: 'TrainModel', sageMakerType: 'Training', config: { instanceTypeParam: 'TrainingInstanceType', hyperparameters: { num_round: '200', max_depth: '8', eta: '0.1' } } },
    { id: 'EvaluateModel', type: 'Evaluate', label: 'EvaluateModel', sageMakerType: 'Processing', config: { instanceTypeParam: 'ProcessingInstanceType', instanceCountParam: 'ProcessingInstanceCount' } },
    { id: 'CheckMAPE', type: 'Condition', label: 'CheckMAPE', sageMakerType: 'Condition', config: { threshold: 8.0, operator: 'LessThanOrEqualTo' } },
    { id: 'RegisterModel', type: 'Register', label: 'RegisterModel', sageMakerType: 'RegisterModel', config: { modelPackageGroupName: 'AlgoWindPowerModelPackageGroup', approvalStatusParam: 'ModelApprovalStatus' } },
  ];
  const edges: GraphEdge[] = [
    { from: 'PreprocessData', to: 'TrainModel' },
    { from: 'TrainModel', to: 'EvaluateModel' },
    { from: 'PreprocessData', to: 'EvaluateModel' },
    { from: 'EvaluateModel', to: 'CheckMAPE' },
    { from: 'CheckMAPE', to: 'RegisterModel', label: 'if true' },
  ];
  return {
    pipelineName,
    exists: false,
    nodes,
    edges,
    parameters: [
      { name: 'ProcessingInstanceType', type: 'String', defaultValue: 'ml.t3.medium' },
      { name: 'ProcessingInstanceCount', type: 'Integer', defaultValue: 1 },
      { name: 'TrainingInstanceType', type: 'String', defaultValue: 'ml.g5.xlarge' },
      { name: 'ModelApprovalStatus', type: 'String', defaultValue: 'PendingManualApproval' },
    ],
  };
}

// GET /pipelines — return the current pipeline as an editable graph.
export async function getPipelineGraph(queryParams: Record<string, string | undefined>) {
  const pipelineName = queryParams.pipelineName || DEFAULT_PIPELINE;
  try {
    const res = await client.send(new DescribePipelineCommand({ PipelineName: pipelineName }));
    const defStr = res.PipelineDefinition;
    if (!defStr) {
      return { statusCode: 200, body: JSON.stringify(defaultTemplateGraph(pipelineName)) };
    }
    return { statusCode: 200, body: JSON.stringify(parseDefinition(pipelineName, defStr)) };
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'ResourceNotFound' || name === 'ResourceNotFoundException' || name === 'ValidationException') {
      // No pipeline yet — hand back the editable template.
      return { statusCode: 200, body: JSON.stringify(defaultTemplateGraph(pipelineName)) };
    }
    throw err;
  }
}

// Apply the editor's bounded edits onto the REAL definition, then UpdatePipeline.
// v1 edits: pipeline parameter defaults, the condition threshold, and the
// training hyperparameters. Starting from the live valid definition guarantees
// the produced definition is schema-valid.
export async function updatePipelineGraph(body: Record<string, unknown>) {
  const pipelineName = (body.pipelineName as string) || DEFAULT_PIPELINE;
  const nodes = Array.isArray(body.nodes) ? (body.nodes as Array<Record<string, unknown>>) : [];
  const paramEdits = Array.isArray(body.parameters) ? (body.parameters as Array<Record<string, unknown>>) : [];

  let defStr: string | undefined;
  try {
    const res = await client.send(new DescribePipelineCommand({ PipelineName: pipelineName }));
    defStr = res.PipelineDefinition;
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'ResourceNotFound' || name === 'ResourceNotFoundException' || name === 'ValidationException') {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: `Pipeline "${pipelineName}" does not exist yet. Create it first (run ml_pipeline/run_pipeline.py), then edit it here.`,
        }),
      };
    }
    throw err;
  }
  if (!defStr) {
    return { statusCode: 409, body: JSON.stringify({ message: 'Pipeline has no definition to edit.' }) };
  }
  if (!PIPELINE_ROLE_ARN) {
    return { statusCode: 500, body: JSON.stringify({ message: 'SAGEMAKER_PIPELINE_ROLE_ARN not configured on the API.' }) };
  }

  const def = JSON.parse(defStr) as Record<string, unknown>;

  // 1) Parameter default overrides.
  if (paramEdits.length && Array.isArray(def.Parameters)) {
    const byName = new Map(paramEdits.map((p) => [String(p.name), p.defaultValue]));
    (def.Parameters as Array<Record<string, unknown>>).forEach((p) => {
      if (byName.has(String(p.Name))) p.DefaultValue = byName.get(String(p.Name));
    });
  }

  // 2 & 3) Per-node edits: threshold (Condition) + hyperparameters (Training).
  const nodeById = new Map(nodes.map((n) => [String(n.id), asRecord(n.config)]));

  const applyToStep = (step: Record<string, unknown>) => {
    const name = String(step.Name || '');
    const type = String(step.Type || '');
    const cfg = nodeById.get(name);
    const args = asRecord(step.Arguments);
    if (cfg) {
      if (type === 'Condition' && cfg.threshold !== undefined) {
        const conditions = Array.isArray(args.Conditions) ? args.Conditions : [];
        const first = asRecord(conditions[0]);
        const t = Number(cfg.threshold);
        if (!Number.isNaN(t)) first.RightValue = t;
      }
      if (type === 'Training' && cfg.hyperparameters && typeof cfg.hyperparameters === 'object') {
        const hp = asRecord(args.HyperParameters);
        const edits = asRecord(cfg.hyperparameters);
        Object.keys(edits).forEach((k) => {
          if (edits[k] !== undefined && edits[k] !== null && edits[k] !== '') hp[k] = String(edits[k]);
        });
        args.HyperParameters = hp;
      }
      if (type === 'Processing' && typeof cfg.features === 'string' && cfg.features !== '') {
        const appSpec = asRecord(args.AppSpecification);
        const ca = appSpec.ContainerArguments;
        if (Array.isArray(ca)) {
          const fi = ca.indexOf('--features');
          if (fi >= 0 && fi + 1 < ca.length) ca[fi + 1] = String(cfg.features);
        }
      }
      if ((type === 'RegisterModel' || type === 'Model') && typeof cfg.modelPackageGroupName === 'string' && cfg.modelPackageGroupName !== '') {
        // Only overwrite when the current value is a literal (never clobber a
        // parameter reference with a literal).
        if (typeof args.ModelPackageGroupName === 'string') {
          args.ModelPackageGroupName = cfg.modelPackageGroupName;
        }
      }
    }
    // Recurse into condition branches.
    if (type === 'Condition') {
      const ifSteps = Array.isArray(args.IfSteps) ? args.IfSteps : [];
      const elseSteps = Array.isArray(args.ElseSteps) ? args.ElseSteps : [];
      ifSteps.forEach((s) => applyToStep(asRecord(s)));
      elseSteps.forEach((s) => applyToStep(asRecord(s)));
    }
  };

  const steps = Array.isArray(def.Steps) ? def.Steps : [];
  steps.forEach((s) => applyToStep(asRecord(s)));

  await client.send(
    new UpdatePipelineCommand({
      PipelineName: pipelineName,
      PipelineDefinition: JSON.stringify(def),
      RoleArn: PIPELINE_ROLE_ARN,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Pipeline updated', pipelineName }),
  };
}
