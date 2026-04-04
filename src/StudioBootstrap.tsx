import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { getConfig, resetConfig, toUiConfig } from "./config/loader";

const App = lazy(() => import("./App"));

type UiLocale = "en" | "zh";

type BootstrapState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "blocked"; gatewayBind?: string; error: string };

const UI_LOCALE_STORAGE_KEY = "qianji-ui-locale";
const BOOTSTRAP_SHELL_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, rgba(0, 210, 255, 0.12), transparent 45%), #07111f",
};
const BOOTSTRAP_SUSPENSE_FALLBACK = (
  <div aria-hidden="true" data-testid="studio-bootstrap-surface" style={BOOTSTRAP_SHELL_STYLE} />
);
const BOOTSTRAP_BLOCKED_SURFACE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px",
  color: "#e6f7ff",
  background: "radial-gradient(circle at top, rgba(0, 210, 255, 0.12), transparent 45%), #07111f",
};
const BOOTSTRAP_CARD_STYLE: React.CSSProperties = {
  width: "min(640px, 100%)",
  border: "1px solid rgba(125, 207, 255, 0.25)",
  borderRadius: "18px",
  padding: "28px",
  background: "rgba(5, 14, 26, 0.9)",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
};
const BOOTSTRAP_STACK_STYLE: React.CSSProperties = { display: "grid", gap: "12px" };
const BOOTSTRAP_TAG_STYLE: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "#7dcfff",
};
const BOOTSTRAP_GATEWAY_BIND_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "13px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "rgba(125, 207, 255, 0.08)",
  color: "#9fdfff",
};
const BOOTSTRAP_TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.15,
};
const BOOTSTRAP_DESCRIPTION_STYLE: React.CSSProperties = {
  margin: 0,
  color: "rgba(230, 247, 255, 0.78)",
  lineHeight: 1.6,
};
const BOOTSTRAP_ERROR_STYLE: React.CSSProperties = {
  display: "block",
  padding: "12px 14px",
  borderRadius: "10px",
  background: "rgba(247, 118, 142, 0.1)",
  color: "#ffb6c1",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};
const BOOTSTRAP_ACTION_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginTop: "8px",
};
const BOOTSTRAP_RETRY_BUTTON_STYLE: React.CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(125, 207, 255, 0.2)",
  background: "#0f4c81",
  color: "#f5fbff",
  padding: "10px 14px",
  cursor: "pointer",
};

const BOOTSTRAP_COPY: Record<
  UiLocale,
  {
    tag: string;
    blockedTitle: string;
    blockedDescription: string;
    retryLabel: string;
    errorFallback: string;
  }
> = {
  en: {
    tag: "Studio bootstrap",
    blockedTitle: "Studio startup blocked",
    blockedDescription:
      "Qianji Studio will not enter the workspace until gateway health and config sync both succeed.",
    retryLabel: "Retry studio bootstrap",
    errorFallback: "Studio bootstrap failed",
  },
  zh: {
    tag: "工作区引导",
    blockedTitle: "工作区启动被阻止",
    blockedDescription: "只有在 Gateway 健康和配置同步都成功后，Qianji Studio 才会进入工作区。",
    retryLabel: "重试工作区引导",
    errorFallback: "工作区引导失败",
  },
};

function resolveUiLocale(): UiLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  if (storedLocale === "en" || storedLocale === "zh") {
    return storedLocale;
  }

  const systemLocale = (window.navigator.language || "").toLowerCase();
  return systemLocale.startsWith("zh") ? "zh" : "en";
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function StudioBootstrap(): React.ReactElement {
  const locale = resolveUiLocale();
  const copy = BOOTSTRAP_COPY[locale];
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({
    status: "loading",
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

        const uiConfig = toUiConfig(config);
        await api.health();
        await api.setUiConfig(uiConfig);
        try {
          await api.getUiCapabilities();
        } catch (error) {
          console.warn(
            "Gateway capabilities probe failed; continuing without capability cache.",
            error,
          );
        }

        if (!cancelled) {
          setBootstrapState({ status: "ready" });
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapState({
            status: "blocked",
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

  if (bootstrapState.status === "ready") {
    return (
      <Suspense fallback={BOOTSTRAP_SUSPENSE_FALLBACK}>
        <App />
      </Suspense>
    );
  }

  if (bootstrapState.status === "loading") {
    return (
      <div
        aria-hidden="true"
        data-testid="studio-bootstrap-surface"
        style={BOOTSTRAP_SHELL_STYLE}
      />
    );
  }

  return (
    <div data-testid="studio-bootstrap-surface" style={BOOTSTRAP_BLOCKED_SURFACE_STYLE}>
      <div style={BOOTSTRAP_CARD_STYLE}>
        <div style={BOOTSTRAP_STACK_STYLE}>
          <span style={BOOTSTRAP_TAG_STYLE}>{copy.tag}</span>
          {bootstrapState.gatewayBind ? (
            <div style={BOOTSTRAP_GATEWAY_BIND_STYLE}>
              gateway.bind = {bootstrapState.gatewayBind}
            </div>
          ) : null}
          <h1 style={BOOTSTRAP_TITLE_STYLE}>{copy.blockedTitle}</h1>
          <p style={BOOTSTRAP_DESCRIPTION_STYLE}>{copy.blockedDescription}</p>
          <code style={BOOTSTRAP_ERROR_STYLE}>{bootstrapState.error}</code>
          <div style={BOOTSTRAP_ACTION_ROW_STYLE}>
            <button type="button" onClick={retryBootstrap} style={BOOTSTRAP_RETRY_BUTTON_STYLE}>
              {copy.retryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioBootstrap;
