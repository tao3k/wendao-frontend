import type { RepoIndexStatus, VfsStatus } from '../../StatusBar';

export type FileTreeLocale = 'en' | 'zh';

export interface FileSelectionMetadata {
  projectName?: string;
  rootLabel?: string;
  graphPath?: string;
}

export type OnFileSelect = (
  path: string,
  category: string,
  metadata?: FileSelectionMetadata
) => void;

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  category: 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';
  projectName?: string;
  rootLabel?: string;
  sourceHint?: string;
  children?: FileNode[];
  level: number;
  isProjectGroup?: boolean;
  isProjectPlaceholder?: boolean;
  isRepoProject?: boolean;
}

export interface FileTreeProps {
  onFileSelect: OnFileSelect;
  selectedPath?: string | null;
  locale?: FileTreeLocale;
  onStatusChange?: (status: { vfsStatus: VfsStatus; repoIndexStatus: RepoIndexStatus | null }) => void;
}

export interface FileTreeCopy {
  toolbarTitle: string;
  rootsSuffix: string;
  emptyProjectHint: string;
  gatewayBlocked: string;
  gatewayHint: string;
  retry: string;
}

export interface ConfiguredProjectGroup {
  name: string;
  root?: string;
  dirs?: string[];
  sourceHint?: string;
  isRepoProject?: boolean;
}
