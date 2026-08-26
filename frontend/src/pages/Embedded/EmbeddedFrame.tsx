import React, { useCallback, useRef } from 'react';

interface EmbeddedFrameProps {
  title: string;
  src: string;
  /**
   * CSS injected into the embedded document (same-origin only) to hide the
   * tool's own chrome (top nav/branding) so it blends into the platform.
   * Injecting a <style> into <head> on load is declarative: it also applies to
   * chrome that the tool's SPA renders after load.
   */
  injectCss?: string;
  minHeight?: number;
}

/**
 * Same-origin iframe embed. Because /grafana/ and /mlflow/ are reverse-proxied
 * under the platform's own origin, the parent can reach contentDocument and
 * strip the embedded app's chrome for a seamless look. The try/catch keeps it
 * safe if the frame is ever cross-origin.
 */
const EmbeddedFrame: React.FC<EmbeddedFrameProps> = ({ title, src, injectCss, minHeight = 480 }) => {
  const ref = useRef<HTMLIFrameElement>(null);

  const onLoad = useCallback(() => {
    if (!injectCss) return;
    try {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const styleId = 'algo-embed-chrome-hide';
      if (doc.getElementById(styleId)) return;
      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = injectCss;
      doc.head.appendChild(style);
    } catch {
      // Cross-origin (shouldn't happen for same-origin proxied embeds) — ignore.
    }
  }, [injectCss]);

  return (
    <iframe
      ref={ref}
      title={title}
      src={src}
      onLoad={onLoad}
      style={{
        width: '100%',
        height: 'calc(100vh - 220px)',
        minHeight,
        border: '1px solid #e9ebed',
        borderRadius: 8,
      }}
    />
  );
};

export default EmbeddedFrame;
