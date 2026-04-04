import type { UiJuliaDeploymentArtifact } from "../../api";
import type { JuliaDeploymentInspectionLocale } from "./types";

function readLaunchArgValue(args: string[], flag: string): string | null {
  const inlinePrefix = `${flag}=`;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument.startsWith(inlinePrefix)) {
      return argument.slice(inlinePrefix.length);
    }
    if (argument === flag) {
      return args[index + 1] ?? null;
    }
  }
  return null;
}

export function formatJuliaArtifactChipLabel(
  artifact: UiJuliaDeploymentArtifact,
  locale: JuliaDeploymentInspectionLocale,
): string {
  const strategy = readLaunchArgValue(artifact.launch.args, "--analyzer-strategy");
  if (strategy) {
    return locale === "zh" ? `Julia 重排 ${strategy}` : `Julia rerank ${strategy}`;
  }
  return locale === "zh" ? "Julia 重排" : "Julia rerank";
}

export function formatJuliaArtifactPopoverLines(
  artifact: UiJuliaDeploymentArtifact,
  locale: JuliaDeploymentInspectionLocale,
): string[] {
  const strategy = readLaunchArgValue(artifact.launch.args, "--analyzer-strategy");
  const serviceMode = readLaunchArgValue(artifact.launch.args, "--service-mode");
  const lines: string[] = [];

  lines.push(
    locale === "zh"
      ? `Artifact schema ${artifact.artifactSchemaVersion} · 生成于 ${artifact.generatedAt}`
      : `Artifact schema ${artifact.artifactSchemaVersion} · Generated ${artifact.generatedAt}`,
  );

  if (artifact.schemaVersion) {
    lines.push(`Arrow schema ${artifact.schemaVersion}`);
  }
  if (serviceMode) {
    lines.push(locale === "zh" ? `服务模式 ${serviceMode}` : `Service mode ${serviceMode}`);
  }
  if (strategy) {
    lines.push(locale === "zh" ? `分析策略 ${strategy}` : `Analyzer strategy ${strategy}`);
  }
  if (artifact.baseUrl) {
    lines.push(`Base URL ${artifact.baseUrl}`);
  }
  if (artifact.route) {
    lines.push(
      locale === "zh" ? `Flight 路由 ${artifact.route}` : `Flight route ${artifact.route}`,
    );
  }
  if (artifact.healthRoute) {
    lines.push(
      locale === "zh" ? `健康检查 ${artifact.healthRoute}` : `Health route ${artifact.healthRoute}`,
    );
  }
  if (typeof artifact.timeoutSecs === "number") {
    lines.push(
      locale === "zh" ? `超时 ${artifact.timeoutSecs}s` : `Timeout ${artifact.timeoutSecs}s`,
    );
  }
  lines.push(`Launcher ${artifact.launch.launcherPath}`);

  return lines;
}
