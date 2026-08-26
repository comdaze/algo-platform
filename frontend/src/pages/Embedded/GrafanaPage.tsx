import React from 'react';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import EmbeddedFrame from './EmbeddedFrame';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Embedded Grafana. `?kiosk` hides Grafana's top/side chrome; the `theme`
 * param follows the platform's global theme (dark by default). Same origin as
 * the SPA (nginx reverse-proxies /grafana/ → internal ALB).
 */
const GrafanaPage: React.FC = () => {
  const { isDark } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  return (
    <SpaceBetween size="m">
      <Header variant="h1" description="内嵌 Grafana 监控看板（直达看板 · kiosk 模式，主题跟随平台）">
        监控看板 · Grafana
      </Header>
      {/* Deep-link straight to the provisioned dashboard (uid=algo-accuracy) in
          kiosk mode — no Grafana home/list chrome. key forces reload on theme change. */}
      <EmbeddedFrame key={theme} title="Grafana" src={`/grafana/d/algo-accuracy?kiosk&theme=${theme}`} />
    </SpaceBetween>
  );
};

export default GrafanaPage;
