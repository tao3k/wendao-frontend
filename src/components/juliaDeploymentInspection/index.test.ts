import { describe, expect, it, vi } from "vitest";
import {
  copyJuliaDeploymentArtifactToml,
  downloadJuliaDeploymentArtifactJson,
  formatJuliaArtifactChipLabel,
  formatJuliaArtifactPopoverLines,
} from "./index";

const SAMPLE_ARTIFACT = {
  artifactSchemaVersion: "v1",
  generatedAt: "2026-03-27T12:00:00Z",
  baseUrl: "http://127.0.0.1:18080",
  route: "/rerank",
  healthRoute: "/healthz",
  schemaVersion: "v1",
  timeoutSecs: 30,
  launch: {
    launcherPath: ".data/WendaoAnalyzer/scripts/run_analyzer_service.sh",
    args: ["--service-mode", "stream", "--analyzer-strategy", "similarity_only"],
  },
};

describe("juliaDeploymentInspection", () => {
  it("formats the chip label from the analyzer strategy", () => {
    expect(formatJuliaArtifactChipLabel(SAMPLE_ARTIFACT, "en")).toBe(
      "Julia rerank similarity_only",
    );
  });

  it("formats popover lines from artifact metadata and launch args", () => {
    expect(formatJuliaArtifactPopoverLines(SAMPLE_ARTIFACT, "en")).toEqual(
      expect.arrayContaining([
        "Artifact schema v1 · Generated 2026-03-27T12:00:00Z",
        "Arrow schema v1",
        "Service mode stream",
        "Analyzer strategy similarity_only",
        "Base URL http://127.0.0.1:18080",
        "Flight route /rerank",
        "Health route /healthz",
        "Timeout 30s",
        "Launcher .data/WendaoAnalyzer/scripts/run_analyzer_service.sh",
      ]),
    );
  });

  it("copies artifact TOML through the provided clipboard runtime", async () => {
    const getArtifactToml = vi.fn().mockResolvedValue('artifact_schema_version = "v1"');
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await copyJuliaDeploymentArtifactToml(getArtifactToml, clipboard);

    expect(getArtifactToml).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).toHaveBeenCalledWith('artifact_schema_version = "v1"');
  });

  it("downloads artifact JSON through the provided DOM runtime", () => {
    const downloadRuntime = {
      createObjectURL: vi.fn().mockReturnValue("blob:artifact"),
      revokeObjectURL: vi.fn(),
    };
    const click = vi.fn();
    const documentObject = {
      createElement: vi.fn().mockReturnValue({
        href: "",
        download: "",
        click,
      }),
    } as unknown as Document;

    downloadJuliaDeploymentArtifactJson(SAMPLE_ARTIFACT, downloadRuntime, documentObject);

    expect(downloadRuntime.createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(downloadRuntime.revokeObjectURL).toHaveBeenCalledWith("blob:artifact");
  });
});
