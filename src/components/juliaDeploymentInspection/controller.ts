import React from "react";

interface JuliaDeploymentInspectionActionState {
  tone: "active" | "error";
  message: string;
}

interface UseJuliaDeploymentInspectionControllerOptions {
  locale: "en" | "zh";
  onCopyToml?: () => Promise<void>;
  onDownloadJson?: () => void;
}

export function useJuliaDeploymentInspectionController({
  locale,
  onCopyToml,
  onDownloadJson,
}: UseJuliaDeploymentInspectionControllerOptions): {
  actionState: JuliaDeploymentInspectionActionState | null;
  handleCopyToml: () => Promise<void>;
  handleDownloadJson: () => void;
} {
  const [actionState, setActionState] = React.useState<JuliaDeploymentInspectionActionState | null>(
    null,
  );

  const handleCopyToml = React.useCallback(async () => {
    if (!onCopyToml) {
      return;
    }
    try {
      await onCopyToml();
      setActionState({
        tone: "active",
        message: locale === "zh" ? "TOML 已复制" : "TOML copied",
      });
    } catch (error) {
      console.warn("Failed to copy Julia deployment artifact TOML", error);
      setActionState({
        tone: "error",
        message: locale === "zh" ? "TOML 复制失败" : "TOML copy failed",
      });
    }
  }, [locale, onCopyToml]);

  const handleDownloadJson = React.useCallback(() => {
    if (!onDownloadJson) {
      return;
    }
    try {
      onDownloadJson();
      setActionState({
        tone: "active",
        message: locale === "zh" ? "JSON 已下载" : "JSON downloaded",
      });
    } catch (error) {
      console.warn("Failed to download Julia deployment artifact JSON", error);
      setActionState({
        tone: "error",
        message: locale === "zh" ? "JSON 下载失败" : "JSON download failed",
      });
    }
  }, [locale, onDownloadJson]);

  return {
    actionState,
    handleCopyToml,
    handleDownloadJson,
  };
}
