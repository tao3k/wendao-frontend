import type { MermaidRuntimeProviderManifest } from "../../src/components/panels/mermaidRuntime";

export interface MermaidBundleAsset {
  readonly asset: string;
  readonly size: number;
}

export interface MermaidBundlePackageBreakdownEntry {
  readonly packageName: string;
  readonly bytes: number;
}

export interface MermaidBundleModuleFamilyBreakdownEntry {
  readonly familyName: string;
  readonly bytes: number;
}

export interface MermaidBundleSharedRuntimeBreakdownEntry {
  readonly bucketName: string;
  readonly bytes: number;
}

export interface MermaidBundleSharedChunkCapabilityBreakdownEntry {
  readonly capabilityName: string;
  readonly bytes: number;
}

export interface MermaidBundleGrammarParserBreakdownEntry {
  readonly parserDomain: string;
  readonly bytes: number;
}

export interface MermaidBundleDiagramApiConfigBreakdownEntry {
  readonly segmentName: string;
  readonly bytes: number;
}

export interface MermaidBundleThemePresetBreakdownEntry {
  readonly themeName: string;
  readonly bytes: number;
}

export interface MermaidBundleShapePrimitiveBreakdownEntry {
  readonly familyName: string;
  readonly bytes: number;
}

export interface MermaidBundleBaseGeometricBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleDiagramSpecializedBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleRectilinearPanelBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleBoxDiagramBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleClassBoxBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleAnnotatedPanelBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleHeaderPanelBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleNoteCardBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleErBoxBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleErEntityRendererBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleErAttributeTableBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundleErSvgRowRenderingBreakdownEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface MermaidBundlePayloadGroupBreakdownEntry {
  readonly groupName: string;
  readonly bytes: number;
}

export interface BuildMermaidBundleReportInput {
  readonly fileSizes: Record<string, number>;
  readonly providerManifest?: MermaidRuntimeProviderManifest | null | undefined;
  readonly mermaidAttributedAssets?: readonly string[] | null | undefined;
  readonly mermaidPackageBreakdown?:
    | readonly MermaidBundlePackageBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidModuleFamilyBreakdown?:
    | readonly MermaidBundleModuleFamilyBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidSharedRuntimeBreakdown?:
    | readonly MermaidBundleSharedRuntimeBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidSharedChunkCapabilityBreakdown?:
    | readonly MermaidBundleSharedChunkCapabilityBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidGrammarParserBreakdown?:
    | readonly MermaidBundleGrammarParserBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidDiagramApiConfigBreakdown?:
    | readonly MermaidBundleDiagramApiConfigBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidThemePresetBreakdown?:
    | readonly MermaidBundleThemePresetBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidShapePrimitiveBreakdown?:
    | readonly MermaidBundleShapePrimitiveBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidBaseGeometricBreakdown?:
    | readonly MermaidBundleBaseGeometricBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidDiagramSpecializedBreakdown?:
    | readonly MermaidBundleDiagramSpecializedBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidRectilinearPanelBreakdown?:
    | readonly MermaidBundleRectilinearPanelBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidBoxDiagramBreakdown?:
    | readonly MermaidBundleBoxDiagramBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidClassBoxBreakdown?:
    | readonly MermaidBundleClassBoxBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidAnnotatedPanelBreakdown?:
    | readonly MermaidBundleAnnotatedPanelBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidHeaderPanelBreakdown?:
    | readonly MermaidBundleHeaderPanelBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidNoteCardBreakdown?:
    | readonly MermaidBundleNoteCardBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidErBoxBreakdown?: readonly MermaidBundleErBoxBreakdownEntry[] | null | undefined;
  readonly mermaidErEntityRendererBreakdown?:
    | readonly MermaidBundleErEntityRendererBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidErAttributeTableBreakdown?:
    | readonly MermaidBundleErAttributeTableBreakdownEntry[]
    | null
    | undefined;
  readonly mermaidErSvgRowRenderingBreakdown?:
    | readonly MermaidBundleErSvgRowRenderingBreakdownEntry[]
    | null
    | undefined;
}

export interface MermaidBundleReport {
  readonly providerManifest: MermaidRuntimeProviderManifest | null;
  readonly jsAssets: MermaidBundleAsset[];
  readonly mermaidAssets: MermaidBundleAsset[];
  readonly largestAsyncAsset: MermaidBundleAsset | null;
  readonly dominantMermaidAsset: MermaidBundleAsset | null;
  readonly totalMermaidBytes: number;
  readonly mermaidPackageBreakdown: MermaidBundlePackageBreakdownEntry[];
  readonly mermaidPayloadGroupBreakdown: MermaidBundlePayloadGroupBreakdownEntry[];
  readonly mermaidModuleFamilyBreakdown: MermaidBundleModuleFamilyBreakdownEntry[];
  readonly mermaidSharedRuntimeBreakdown: MermaidBundleSharedRuntimeBreakdownEntry[];
  readonly mermaidSharedChunkCapabilityBreakdown: MermaidBundleSharedChunkCapabilityBreakdownEntry[];
  readonly mermaidGrammarParserBreakdown: MermaidBundleGrammarParserBreakdownEntry[];
  readonly mermaidDiagramApiConfigBreakdown: MermaidBundleDiagramApiConfigBreakdownEntry[];
  readonly mermaidThemePresetBreakdown: MermaidBundleThemePresetBreakdownEntry[];
  readonly mermaidShapePrimitiveBreakdown: MermaidBundleShapePrimitiveBreakdownEntry[];
  readonly mermaidBaseGeometricBreakdown: MermaidBundleBaseGeometricBreakdownEntry[];
  readonly mermaidDiagramSpecializedBreakdown: MermaidBundleDiagramSpecializedBreakdownEntry[];
  readonly mermaidRectilinearPanelBreakdown: MermaidBundleRectilinearPanelBreakdownEntry[];
  readonly mermaidBoxDiagramBreakdown: MermaidBundleBoxDiagramBreakdownEntry[];
  readonly mermaidClassBoxBreakdown: MermaidBundleClassBoxBreakdownEntry[];
  readonly mermaidAnnotatedPanelBreakdown: MermaidBundleAnnotatedPanelBreakdownEntry[];
  readonly mermaidHeaderPanelBreakdown: MermaidBundleHeaderPanelBreakdownEntry[];
  readonly mermaidNoteCardBreakdown: MermaidBundleNoteCardBreakdownEntry[];
  readonly mermaidErBoxBreakdown: MermaidBundleErBoxBreakdownEntry[];
  readonly mermaidErEntityRendererBreakdown: MermaidBundleErEntityRendererBreakdownEntry[];
  readonly mermaidErAttributeTableBreakdown: MermaidBundleErAttributeTableBreakdownEntry[];
  readonly mermaidErSvgRowRenderingBreakdown: MermaidBundleErSvgRowRenderingBreakdownEntry[];
}

export function buildMermaidBundleReport(input: BuildMermaidBundleReportInput): MermaidBundleReport;
