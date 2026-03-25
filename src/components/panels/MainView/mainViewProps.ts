import type { AcademicNode, AcademicTopology } from '../../../types';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../StatusBar';
import type { MainViewLocale, MainViewTab } from './mainViewTypes';

export interface MainViewSelectedFile {
  path: string;
  category: string;
  content?: string;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
}

export interface MainViewRelationship {
  from?: string;
  to?: string;
  type: string;
}

export interface MainViewRequestedTab {
  tab: MainViewTab;
  nonce: number;
}

export interface MainViewGraphSelection {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
  graphPath?: string;
}

export interface MainViewGraphOptions {
  direction: 'both';
  hops: number;
  limit: number;
}

export interface MainViewProps {
  locale?: MainViewLocale;
  topology?: AcademicTopology;
  isVfsLoading: boolean;
  selectedFile?: MainViewSelectedFile | null;
  graphCenterNodeId?: string | null;
  relationships?: MainViewRelationship[];
  selectedNode?: AcademicNode | null;
  requestedTab?: MainViewRequestedTab | null;
  onGraphFileSelect?: (selection: MainViewGraphSelection) => void;
  onGraphCenterNodeInvalid?: (nodeId: string) => void;
  onNodeClick: (name: string, type: string, id: string) => void;
  onBiLinkClick?: (link: string) => void;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}
