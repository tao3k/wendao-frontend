import React, { useCallback, useEffect, useState } from 'react';
import App from './App';
import { api } from './api/client';
import { getConfig, resetConfig, toUiConfig } from './config/loader';

type BootstrapState =
  | { status: 'loading'; gatewayBind?: string }
  | { status: 'ready' }
  | { status: 'blocked'; gatewayBind?: string; error: string };

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Studio bootstrap failed';
}

export function StudioBootstrap(): React.ReactElement {
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({ status: 'loading' });
  const [retryToken, setRetryToken] = useState(0);

  const retryBootstrap = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      let gatewayBind: string | undefined;
      try {
        resetConfig();
        const config = await getConfig();
        gatewayBind = config.gateway?.bind?.trim();

        if (!cancelled) {
          setBootstrapState({ status: 'loading', gatewayBind });
        }

        const uiConfig = toUiConfig(config);
        await api.health();
        await api.setUiConfig(uiConfig);
        await api.scanVfs();

        if (!cancelled) {
          setBootstrapState({ status: 'ready' });
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapState({
            status: 'blocked',
            gatewayBind,
            error: toErrorMessage(error),
          });
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  if (bootstrapState.status === 'ready') {
    return <App />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        background:
          'radial-gradient(circle at top, rgba(0, 210, 255, 0.12), transparent 45%), #07111f',
        color: '#e6f7ff',
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          border: '1px solid rgba(125, 207, 255, 0.25)',
          borderRadius: '18px',
          padding: '28px',
          background: 'rgba(5, 14, 26, 0.9)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: '#7dcfff',
            }}
          >
            Studio bootstrap
          </span>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.15 }}>
            {bootstrapState.status === 'loading'
              ? 'Checking gateway health'
              : 'Studio startup blocked'}
          </h1>
          <p style={{ margin: 0, color: 'rgba(230, 247, 255, 0.78)', lineHeight: 1.6 }}>
            {bootstrapState.status === 'loading'
              ? 'Qianji Studio now requires a healthy Wendao gateway before the workspace can start.'
              : 'Qianji Studio will not enter the workspace until gateway health, config sync, and VFS scan all succeed.'}
          </p>
          {bootstrapState.gatewayBind ? (
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(125, 207, 255, 0.08)',
                color: '#9fdfff',
              }}
            >
              gateway.bind = {bootstrapState.gatewayBind}
            </div>
          ) : null}
          {bootstrapState.status === 'blocked' ? (
            <code
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(247, 118, 142, 0.1)',
                color: '#ffb6c1',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {bootstrapState.error}
            </code>
          ) : null}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {bootstrapState.status === 'loading' ? (
              <button
                type="button"
                disabled
                style={{
                  borderRadius: '10px',
                  border: '1px solid rgba(125, 207, 255, 0.2)',
                  background: 'rgba(125, 207, 255, 0.08)',
                  color: '#9fdfff',
                  padding: '10px 14px',
                  cursor: 'progress',
                }}
              >
                Checking...
              </button>
            ) : (
              <button
                type="button"
                onClick={retryBootstrap}
                style={{
                  borderRadius: '10px',
                  border: '1px solid rgba(125, 207, 255, 0.2)',
                  background: '#0f4c81',
                  color: '#f5fbff',
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                Retry studio bootstrap
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioBootstrap;
