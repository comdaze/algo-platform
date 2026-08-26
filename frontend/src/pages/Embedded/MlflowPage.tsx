import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { useTheme } from '../../theme/ThemeContext';
import { useLang } from '../../i18n';

/**
 * Embedded MLflow. MLflow has no kiosk mode, so we inject same-origin CSS to
 * hide its top nav/branding bar so the content blends into the platform. Same
 * origin as the SPA (nginx proxies /mlflow/ → internal NLB; MLflow runs with
 * --static-prefix /mlflow).
 */
export const HIDE_MLFLOW_CHROME = `
  /* MLflow 2.x top navigation / branding bar */
  header,
  [data-testid="mlflow-header"],
  .mlflow-header { display: none !important; }
  /* reclaim the space the header occupied */
  body { padding-top: 0 !important; }
`;

/**
 * Make embedded MLflow follow the platform light/dark theme (like Grafana's
 * ?theme=). MLflow (Databricks Du Bois) initialises on load from
 * localStorage["_mlflow_dark_mode_toggle_enabled"] ("true"/"false"), falling
 * back to prefers-color-scheme. Because /mlflow/ is reverse-proxied under the
 * SPA's OWN origin, the SPA and the iframe share localStorage, so writing that
 * key here (+ the Du Bois "databricks-dark-mode-pref") and reloading the iframe
 * boots MLflow in the platform's theme. Called during render so keys are set
 * before the iframe document boots.
 */
export function applyMlflowThemePref(isDark: boolean): void {
  try {
    localStorage.setItem('_mlflow_dark_mode_toggle_enabled', isDark ? 'true' : 'false');
    localStorage.setItem('databricks-dark-mode-pref', isDark ? 'dark' : 'light');
  } catch {
    /* ignore storage errors */
  }
}

const MLFLOW_SRC = '/mlflow/';

const MlflowPage: React.FC = () => {
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
          description={t('page.mlflow.desc')}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                {t('btn.refresh')}
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(MLFLOW_SRC, '_blank', 'noopener')}
              >
                {t('btn.openNewTab')}
              </Button>
            </SpaceBetween>
          }
        >
          {t('page.mlflow.title')}
        </Header>
      }
    >
      <Container disableContentPaddings>
        <EmbeddedFrame key={`${theme}-${nonce}`} title="MLflow Experiments" src={MLFLOW_SRC} injectCss={HIDE_MLFLOW_CHROME} />
      </Container>
    </ContentLayout>
  );
};

export default MlflowPage;
