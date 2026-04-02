export type JuliaDeploymentInspectionLocale = 'en' | 'zh';

export interface JuliaDeploymentInspectionClipboard {
  writeText(text: string): Promise<void>;
}

export interface JuliaDeploymentInspectionDownloadRuntime {
  createObjectURL(object: Blob): string;
  revokeObjectURL(url: string): void;
}
