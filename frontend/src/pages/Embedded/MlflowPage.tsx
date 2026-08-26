import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
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

const MLFLOW_SRC = '/mlflow/';

const MlflowPage: React.FC = () => {
  const [nonce, setNonce] = useState(0);
  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description="内嵌 MLflow 实验追踪（已隐藏 MLflow 自身顶栏，与平台同源）"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                刷新
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(MLFLOW_SRC, '_blank', 'noopener')}
              >
                在新标签打开
              </Button>
            </SpaceBetween>
          }
        >
          实验追踪 · MLflow
        </Header>
      }
    >
      <Container disableContentPaddings>
        <EmbeddedFrame key={nonce} title="MLflow Experiments" src={MLFLOW_SRC} injectCss={HIDE_MLFLOW_CHROME} />
      </Container>
    </ContentLayout>
  );
};

export default MlflowPage;
