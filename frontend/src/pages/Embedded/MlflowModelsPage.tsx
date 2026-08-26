import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { HIDE_MLFLOW_CHROME } from './MlflowPage';

/**
 * Embedded MLflow Model Registry (#/models). Same origin as the SPA; MLflow's
 * own top nav is hidden so navigation happens via the platform left menu.
 */
const MODELS_SRC = '/mlflow/#/models';

const MlflowModelsPage: React.FC = () => {
  const [nonce, setNonce] = useState(0);
  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description="内嵌 MLflow 模型注册表（已隐藏 MLflow 自身顶栏，与平台同源）"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                刷新
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(MODELS_SRC, '_blank', 'noopener')}
              >
                在新标签打开
              </Button>
            </SpaceBetween>
          }
        >
          模型注册 · MLflow Models
        </Header>
      }
    >
      <Container disableContentPaddings>
        <EmbeddedFrame key={nonce} title="MLflow Models" src={MODELS_SRC} injectCss={HIDE_MLFLOW_CHROME} />
      </Container>
    </ContentLayout>
  );
};

export default MlflowModelsPage;
