import React from 'react';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { HIDE_MLFLOW_CHROME } from './MlflowPage';

/**
 * Embedded MLflow Model Registry (#/models). Same origin as the SPA; MLflow's
 * own top nav is hidden so navigation happens via the platform left menu.
 */
const MlflowModelsPage: React.FC = () => (
  <SpaceBetween size="m">
    <Header variant="h1" description="内嵌 MLflow 模型注册表（已隐藏 MLflow 自身顶栏，与平台同源）">
      模型注册 · MLflow Models
    </Header>
    <EmbeddedFrame title="MLflow Models" src="/mlflow/#/models" injectCss={HIDE_MLFLOW_CHROME} />
  </SpaceBetween>
);

export default MlflowModelsPage;
