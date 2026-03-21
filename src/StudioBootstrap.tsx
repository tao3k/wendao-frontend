import React, { useCallback, useEffect, useState } from 'react';
import App from './App';
import { api } from './api';
import { getConfig, resetConfig, toUiConfig } from './config/loader';

type UiLocale = 'en' | 'zh';
type BootstrapStep = 'health' | 'config';

type BootstrapState =
  | { status: 'loading'; gatewayBind?: string; step: BootstrapStep }
  | { status: 'ready' }
  | { status: 'blocked'; gatewayBind?: string; error: string };

const UI_LOCALE_STORAGE_KEY = 'qianji-ui-locale';

const BOOTSTRAP_COPY: Record<
  UiLocale,
  {
    tag: string;
    loadingTitles: Record<BootstrapStep, string>;
    blockedTitle: string;
    loadingDescriptions: Record<BootstrapStep, string>;
    blockedDescription: string;
    checkingLabel: string;
    retryLabel: string;
    errorFallback: string;
  }
> = {
  en: {
    tag: 'Studio bootstrap',
    loadingTitles: {
      health: 'Checking gateway health',
      config: 'Syncing workspace config',
    },
    blockedTitle: 'Studio startup blocked',
    loadingDescriptions: {
      health: 'Qianji Studio now requires a healthy Wendao gateway before the workspace can start.',
      config: 'Gateway health is ready. Syncing workspace configuration before entering Studio.',
    },
    blockedDescription:
      'Qianji Studio will not enter the workspace until gateway health and config sync both succeed.',
    checkingLabel: 'Checking...',
    retryLabel: 'Retry studio bootstrap',
    errorFallback: 'Studio bootstrap failed',
  },
  zh: {
    tag: '工作区引导',
    loadingTitles: {
      health: '正在检查 Gateway 健康状态',
      config: '正在同步工作区配置',
    },
    blockedTitle: '工作区启动被阻止',
    loadingDescriptions: {
      health: 'Qianji Studio 现在要求 Wendao Gateway 健康后才能进入工作区。',
      config: 'Gateway 健康检查已通过，正在同步工作区配置后进入 Studio。',
    },
    blockedDescription: '只有在 Gateway 健康和配置同步都成功后，Qianji Studio 才会进入工作区。',
    checkingLabel: '检查中...',
    retryLabel: '重试工作区引导',
    errorFallback: '工作区引导失败',
  },
};

function resolveUiLocale(): UiLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  if (storedLocale === 'en' || storedLocale === 'zh') {
    return storedLocale;
  }

  const systemLocale = (window.navigator.language || '').toLowerCase();
  return systemLocale.startsWith('zh') ? 'zh' : 'en';
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function StudioBootstrap(): React.ReactElement {
  const locale = resolveUiLocale();
  const copy = BOOTSTRAP_COPY[locale];
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({
    status: 'loading',
    step: 'health',
  });
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
          setBootstrapState({ status: 'loading', gatewayBind, step: 'health' });
        }

        const uiConfig = toUiConfig(config);
        await api.health();
        if (!cancelled) {
          setBootstrapState({ status: 'loading', gatewayBind, step: 'config' });
        }
        await api.setUiConfig(uiConfig);

        if (!cancelled) {
          setBootstrapState({ status: 'ready' });
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapState({
            status: 'blocked',
            gatewayBind,
            error: toErrorMessage(error, copy.errorFallback),
          });
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [retryToken, copy.errorFallback]);

  if (bootstrapState.status === 'ready') {
    return <App />;
  }

  const activeStep = bootstrapState.status === 'loading' ? bootstrapState.step : 'health';

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
            {copy.tag}
          </span>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.15 }}>
            {bootstrapState.status === 'loading'
              ? copy.loadingTitles[activeStep]
              : copy.blockedTitle}
          </h1>
          <p style={{ margin: 0, color: 'rgba(230, 247, 255, 0.78)', lineHeight: 1.6 }}>
            {bootstrapState.status === 'loading'
              ? copy.loadingDescriptions[activeStep]
              : copy.blockedDescription}
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
                {copy.checkingLabel}
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
                {copy.retryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioBootstrap;
