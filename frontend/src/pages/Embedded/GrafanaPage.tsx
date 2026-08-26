import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Embedded Grafana. `?kiosk` hides Grafana's top/side chrome; the `theme`
 * param follows the platform's global theme. Same origin as the SPA (nginx
 * reverse-proxies /grafana/ → internal ALB).
 */
const GrafanaPage: React.FC = () => {
  const { isDark } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  const [nonce, setNonce] = useState(0);
  // Deep-link straight to the provisioned dashboard (uid=algo-accuracy) in
  // kiosk mode — no Grafana home/list chrome.
  const src = `/grafana/d/algo-accuracy?kiosk&theme=${theme}`;
  return (
    <ContentLayout
      headerVariant="high-contrast"
      header={
        <Header
          variant="h1"
          description="内嵌 Grafana 监控看板（直达看板 · kiosk 模式，主题跟随平台）"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => setNonce((n) => n + 1)}>
                刷新
              </Button>
              <Button
                iconName="external"
                iconAlign="right"
                onClick={() => window.open(`/grafana/d/algo-accuracy?theme=${theme}`, '_blank', 'noopener')}
              >
                在新标签打开
              </Button>
            </SpaceBetween>
          }
        >
          监控看板 · Grafana
        </Header>
      }
    >
      <Container disableContentPaddings>
        {/* key forces a reload on theme change or manual refresh */}
        <EmbeddedFrame key={`${theme}-${nonce}`} title="Grafana" src={src} />
      </Container>
    </ContentLayout>
  );
};

export default GrafanaPage;
