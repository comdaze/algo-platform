import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { HIDE_MLFLOW_CHROME, applyMlflowThemePref } from './MlflowPage';
import { useTheme } from '../../theme/ThemeContext';
import { useLang } from '../../i18n';

/**
 * Embedded MLflow Model Registry (#/models). Same origin as the SPA; MLflow's
 * own top nav is hidden and its theme follows the platform (see MlflowPage).
 */
const MODELS_SRC = '/mlflow/#/models';

const MlflowModelsPage: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useLang();
  const theme = isDark ? 'dark' : 'light';
  const [nonce, setNonce] = useState(0);
  applyMlflowThemePref(isDark);
  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description={t('page.mlflowModels.desc')}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                {t('btn.refresh')}
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(MODELS_SRC, '_blank', 'noopener')}
              >
                {t('btn.openNewTab')}
              </Button>
            </SpaceBetween>
          }
        >
          {t('page.mlflowModels.title')}
        </Header>
      }
    >
      <Container disableContentPaddings>
        <EmbeddedFrame key={`${theme}-${nonce}`} title="MLflow Models" src={MODELS_SRC} injectCss={HIDE_MLFLOW_CHROME} />
      </Container>
    </ContentLayout>
  );
};

export default MlflowModelsPage;
