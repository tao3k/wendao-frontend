import type { UiJuliaDeploymentArtifact } from "../../api";
import type {
  JuliaDeploymentInspectionClipboard,
  JuliaDeploymentInspectionDownloadRuntime,
} from "./types";

export async function copyJuliaDeploymentArtifactToml(
  getArtifactToml: () => Promise<string>,
  clipboard: JuliaDeploymentInspectionClipboard | undefined,
): Promise<void> {
  const toml = await getArtifactToml();
  if (!clipboard?.writeText) {
    throw new Error("clipboard unavailable");
  }
  await clipboard.writeText(toml);
}

export function downloadJuliaDeploymentArtifactJson(
  artifact: UiJuliaDeploymentArtifact | null,
  downloadRuntime: JuliaDeploymentInspectionDownloadRuntime | undefined,
  documentObject: Document | undefined,
): void {
  if (!artifact || !downloadRuntime || !documentObject) {
    throw new Error("deployment artifact unavailable");
  }

  const blob = new Blob([JSON.stringify(artifact, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const objectUrl = downloadRuntime.createObjectURL(blob);
  const anchor = documentObject.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "julia-deployment-artifact.json";
  anchor.click();
  downloadRuntime.revokeObjectURL(objectUrl);
}
