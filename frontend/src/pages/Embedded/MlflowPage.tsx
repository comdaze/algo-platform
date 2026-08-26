import React from 'react';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';

/**
 * Embedded MLflow. MLflow has no kiosk mode, so we inject same-origin CSS to
 * hide its dark top nav/branding bar (logo, GitHub/Docs, theme toggle) so the
 * content blends into the platform. Same origin as the SPA (nginx proxies
 * /mlflow/ → internal NLB; MLflow runs with --static-prefix /mlflow).
 */
export const HIDE_MLFLOW_CHROME = `
  /* MLflow 2.x top navigation / branding bar */
  header,
  [data-testid="mlflow-header"],
  .mlflow-header { display: none !important; }
  /* reclaim the space the header occupied */
  body { padding-top: 0 !important; }
`;

const MlflowPage: React.FC = () => (
  <SpaceBetween size="m">
    <Header variant="h1" description="内嵌 MLflow 实验追踪（已隐藏 MLflow 自身顶栏，与平台同源）">
      实验追踪 · MLflow
    </Header>
    <EmbeddedFrame title="MLflow Experiments" src="/mlflow/" injectCss={HIDE_MLFLOW_CHROME} />
  </SpaceBetween>
);

export default MlflowPage;
