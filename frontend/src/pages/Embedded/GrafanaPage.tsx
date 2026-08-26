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
 * Embedded Grafana. `?kiosk` hides Grafana's top/side chrome; the `theme`
 * param follows the platform's global theme. Same origin as the SPA (nginx
 * reverse-proxies /grafana/ → internal ALB).
 */
const GrafanaPage: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useLang();
  const theme = isDark ? 'dark' : 'light';
  const [nonce, setNonce] = useState(0);
  const src = `/grafana/d/algo-accuracy?kiosk&theme=${theme}`;
  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description={t('page.grafana.desc')}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                {t('btn.refresh')}
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(`/grafana/d/algo-accuracy?theme=${theme}`, '_blank', 'noopener')}
              >
                {t('btn.openNewTab')}
              </Button>
            </SpaceBetween>
          }
        >
          {t('page.grafana.title')}
        </Header>
      }
    >
      <Container disableContentPaddings>
        {/* key includes theme so a platform light/dark flip reloads Grafana */}
        <EmbeddedFrame key={`${theme}-${nonce}`} title="Grafana" src={src} />
      </Container>
    </ContentLayout>
  );
};

export default GrafanaPage;
