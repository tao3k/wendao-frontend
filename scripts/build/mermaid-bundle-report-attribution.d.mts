export function extractNodeModulePackageName(sourcePath: string): string | null;
export function extractNodeModuleRelativePath(sourcePath: string): string | null;
export function classifyMermaidModuleFamily(sourcePath: string): string | null;
export function classifyMermaidSharedRuntimeBucket(sourcePath: string): string | null;
export function classifyMermaidSharedChunkCapability(
  sourcePath: string,
  sourceContent?: string,
): string | null;
export function classifyMermaidGrammarParserDomain(
  sourcePath: string,
  sourceContent?: string,
): string | null;
export function classifyMermaidDiagramApiConfigSegment(
  sectionPath: string | null | undefined,
): string;
export function classifyMermaidThemePresetVariant(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidShapePrimitiveFamily(sectionPath: string | null | undefined): string;
export function classifyMermaidBaseGeometricCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidDiagramSpecializedCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidRectilinearPanelCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidBoxDiagramCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidClassBoxCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidAnnotatedPanelCluster(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidHeaderPanelVariant(
  sectionPath: string | null | undefined,
): string | null;
export function classifyMermaidNoteCardVariant(
  sectionPath: string | null | undefined,
): string | null;

export interface CollectJavaScriptSourceMapPackageAssetsOptions {
  readonly distDir: string;
  readonly packageNames: readonly string[];
}

export function collectJavaScriptSourceMapPackageAssets(
  options: CollectJavaScriptSourceMapPackageAssetsOptions,
): Promise<string[]>;

export interface JavaScriptSourceMapPackageByteEntry {
  readonly packageName: string;
  readonly bytes: number;
}

export interface CollectJavaScriptSourceMapPackageByteBreakdownOptions {
  readonly distDir: string;
  readonly packageNames: readonly string[];
}

export function collectJavaScriptSourceMapPackageByteBreakdown(
  options: CollectJavaScriptSourceMapPackageByteBreakdownOptions,
): Promise<JavaScriptSourceMapPackageByteEntry[]>;

export interface MermaidSourceMapModuleFamilyByteEntry {
  readonly familyName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapModuleFamilyByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapModuleFamilyByteBreakdown(
  options: CollectMermaidSourceMapModuleFamilyByteBreakdownOptions,
): Promise<MermaidSourceMapModuleFamilyByteEntry[]>;

export interface MermaidSourceMapSharedRuntimeByteEntry {
  readonly bucketName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapSharedRuntimeByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapSharedRuntimeByteBreakdown(
  options: CollectMermaidSourceMapSharedRuntimeByteBreakdownOptions,
): Promise<MermaidSourceMapSharedRuntimeByteEntry[]>;

export interface MermaidSourceMapSharedChunkCapabilityByteEntry {
  readonly capabilityName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapSharedChunkCapabilityByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapSharedChunkCapabilityByteBreakdown(
  options: CollectMermaidSourceMapSharedChunkCapabilityByteBreakdownOptions,
): Promise<MermaidSourceMapSharedChunkCapabilityByteEntry[]>;

export interface MermaidSourceMapGrammarParserByteEntry {
  readonly parserDomain: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapGrammarParserByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapGrammarParserByteBreakdown(
  options: CollectMermaidSourceMapGrammarParserByteBreakdownOptions,
): Promise<MermaidSourceMapGrammarParserByteEntry[]>;

export interface MermaidSourceMapDiagramApiConfigByteEntry {
  readonly segmentName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapDiagramApiConfigByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapDiagramApiConfigByteBreakdown(
  options: CollectMermaidSourceMapDiagramApiConfigByteBreakdownOptions,
): Promise<MermaidSourceMapDiagramApiConfigByteEntry[]>;

export interface MermaidSourceMapThemePresetByteEntry {
  readonly themeName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapThemePresetByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapThemePresetByteBreakdown(
  options: CollectMermaidSourceMapThemePresetByteBreakdownOptions,
): Promise<MermaidSourceMapThemePresetByteEntry[]>;

export interface MermaidSourceMapShapePrimitiveByteEntry {
  readonly familyName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapShapePrimitiveByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapShapePrimitiveByteBreakdown(
  options: CollectMermaidSourceMapShapePrimitiveByteBreakdownOptions,
): Promise<MermaidSourceMapShapePrimitiveByteEntry[]>;

export interface MermaidSourceMapBaseGeometricByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapBaseGeometricByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapBaseGeometricByteBreakdown(
  options: CollectMermaidSourceMapBaseGeometricByteBreakdownOptions,
): Promise<MermaidSourceMapBaseGeometricByteEntry[]>;

export interface MermaidSourceMapDiagramSpecializedByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapDiagramSpecializedByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapDiagramSpecializedByteBreakdown(
  options: CollectMermaidSourceMapDiagramSpecializedByteBreakdownOptions,
): Promise<MermaidSourceMapDiagramSpecializedByteEntry[]>;

export interface MermaidSourceMapRectilinearPanelByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapRectilinearPanelByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapRectilinearPanelByteBreakdown(
  options: CollectMermaidSourceMapRectilinearPanelByteBreakdownOptions,
): Promise<MermaidSourceMapRectilinearPanelByteEntry[]>;

export interface MermaidSourceMapBoxDiagramByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapBoxDiagramByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapBoxDiagramByteBreakdown(
  options: CollectMermaidSourceMapBoxDiagramByteBreakdownOptions,
): Promise<MermaidSourceMapBoxDiagramByteEntry[]>;

export interface MermaidSourceMapClassBoxByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapClassBoxByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapClassBoxByteBreakdown(
  options: CollectMermaidSourceMapClassBoxByteBreakdownOptions,
): Promise<MermaidSourceMapClassBoxByteEntry[]>;

export interface MermaidSourceMapAnnotatedPanelByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapAnnotatedPanelByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapAnnotatedPanelByteBreakdown(
  options: CollectMermaidSourceMapAnnotatedPanelByteBreakdownOptions,
): Promise<MermaidSourceMapAnnotatedPanelByteEntry[]>;

export interface MermaidSourceMapHeaderPanelByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapHeaderPanelByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapHeaderPanelByteBreakdown(
  options: CollectMermaidSourceMapHeaderPanelByteBreakdownOptions,
): Promise<MermaidSourceMapHeaderPanelByteEntry[]>;

export interface MermaidSourceMapNoteCardByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapNoteCardByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapNoteCardByteBreakdown(
  options: CollectMermaidSourceMapNoteCardByteBreakdownOptions,
): Promise<MermaidSourceMapNoteCardByteEntry[]>;

export interface MermaidSourceMapErBoxByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapErBoxByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapErBoxByteBreakdown(
  options: CollectMermaidSourceMapErBoxByteBreakdownOptions,
): Promise<MermaidSourceMapErBoxByteEntry[]>;

export interface MermaidSourceMapErEntityRendererByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapErEntityRendererByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapErEntityRendererByteBreakdown(
  options: CollectMermaidSourceMapErEntityRendererByteBreakdownOptions,
): Promise<MermaidSourceMapErEntityRendererByteEntry[]>;

export interface MermaidSourceMapErAttributeTableByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapErAttributeTableByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapErAttributeTableByteBreakdown(
  options: CollectMermaidSourceMapErAttributeTableByteBreakdownOptions,
): Promise<MermaidSourceMapErAttributeTableByteEntry[]>;

export interface MermaidSourceMapErSvgRowRenderingByteEntry {
  readonly clusterName: string;
  readonly bytes: number;
}

export interface CollectMermaidSourceMapErSvgRowRenderingByteBreakdownOptions {
  readonly distDir: string;
}

export function collectMermaidSourceMapErSvgRowRenderingByteBreakdown(
  options: CollectMermaidSourceMapErSvgRowRenderingByteBreakdownOptions,
): Promise<MermaidSourceMapErSvgRowRenderingByteEntry[]>;
