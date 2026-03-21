import type { ReactNode } from 'react';
import type { MainViewCopy } from './mainViewCopy';
import type {
  MainViewGraphOptions,
  MainViewGraphSelection,
  MainViewRelationship,
  MainViewSelectedFile,
} from './mainViewProps';
import type { MainViewLocale } from './mainViewTypes';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../StatusBar';

export function buildMainViewDiagramPanelProps(params: {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  focusEpoch: number;
  copy: Pick<MainViewCopy, 'noDiagramFile'>;
  panelLoadingFallback: ReactNode;
  onNodeClick: (name: string, type: string, id: string) => void;
}): {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  focusEpoch: number;
  noDiagramFile: string;
  panelLoadingFallback: ReactNode;
  onNodeClick: (name: string, type: string, id: string) => void;
} {
  return {
    selectedFile: params.selectedFile,
    locale: params.locale,
    focusEpoch: params.focusEpoch,
    noDiagramFile: params.copy.noDiagramFile,
    panelLoadingFallback: params.panelLoadingFallback,
    onNodeClick: params.onNodeClick,
  };
}

export function buildMainViewReferencesPanelProps(params: {
  selectedFile?: MainViewSelectedFile | null;
  relationships: MainViewRelationship[];
  copy: MainViewCopy;
}): {
  selectedFile?: MainViewSelectedFile | null;
  relationships: MainViewRelationship[];
  copy: MainViewCopy;
} {
  return {
    selectedFile: params.selectedFile,
    relationships: params.relationships,
    copy: params.copy,
  };
}

export function buildMainViewGraphPanelProps(params: {
  centerNodeId: string | null;
  enabled: boolean;
  options: MainViewGraphOptions;
  locale: MainViewLocale;
  panelLoadingFallback: ReactNode;
  onGraphFileSelect?: (selection: MainViewGraphSelection) => void;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}): {
  centerNodeId: string | null;
  enabled: boolean;
  options: MainViewGraphOptions;
  locale: MainViewLocale;
  panelLoadingFallback: ReactNode;
  onGraphFileSelect?: (selection: MainViewGraphSelection) => void;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
} {
  return {
    centerNodeId: params.centerNodeId,
    enabled: params.enabled,
    options: params.options,
    locale: params.locale,
    panelLoadingFallback: params.panelLoadingFallback,
    onGraphFileSelect: params.onGraphFileSelect,
    onSidebarSummaryChange: params.onSidebarSummaryChange,
    onGraphRuntimeStatusChange: params.onGraphRuntimeStatusChange,
  };
}

export function buildMainViewContentPanelProps(params: {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  copy: Pick<MainViewCopy, 'noContentFile'>;
  panelLoadingFallback: ReactNode;
  onBiLinkClick?: (link: string) => void;
}): {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  noContentFile: string;
  panelLoadingFallback: ReactNode;
  onBiLinkClick?: (link: string) => void;
} {
  return {
    selectedFile: params.selectedFile,
    locale: params.locale,
    noContentFile: params.copy.noContentFile,
    panelLoadingFallback: params.panelLoadingFallback,
    onBiLinkClick: params.onBiLinkClick,
  };
}
