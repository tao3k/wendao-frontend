import type { MainViewLocale } from "./mainViewTypes";

export interface MainViewCopy {
  tabDiagram: string;
  tabReferences: string;
  tabGraph: string;
  tabContent: string;
  noDiagramFile: string;
  navigator: string;
  referencesTitle: string;
  referencesHintWithFile: string;
  referencesHintWithoutFile: string;
  focusedFile: string;
  project: string;
  root: string;
  noReferences: string;
  noReferencesFile: string;
  noContentFile: string;
  panelLoading: string;
}

const MAIN_VIEW_COPY: Record<MainViewLocale, MainViewCopy> = {
  en: {
    tabDiagram: "Diagram",
    tabReferences: "References",
    tabGraph: "Graph",
    tabContent: "Content",
    noDiagramFile: "Select a file from the project tree to inspect its diagram.",
    navigator: "Navigator",
    referencesTitle: "References",
    referencesHintWithFile:
      "Use the graph tab to inspect live inbound and outbound links for the current file.",
    referencesHintWithoutFile:
      "Select a file from the project tree to inspect references and content.",
    focusedFile: "Focused file",
    project: "Project",
    root: "Root",
    noReferences: "No live references were returned for this file.",
    noReferencesFile: "Select a file from the project tree to inspect its references.",
    noContentFile: "Select a file from the project tree to open its content.",
    panelLoading: "Loading panel...",
  },
  zh: {
    tabDiagram: "图示",
    tabReferences: "引用",
    tabGraph: "图谱",
    tabContent: "内容",
    noDiagramFile: "请先从项目树选择文件以查看其图示。",
    navigator: "导航",
    referencesTitle: "引用",
    referencesHintWithFile: "使用图谱页查看当前文件的实时入链与出链关系。",
    referencesHintWithoutFile: "请先从项目树选择文件以查看引用与内容。",
    focusedFile: "当前文件",
    project: "项目",
    root: "根",
    noReferences: "当前文件没有返回实时引用关系。",
    noReferencesFile: "请先从项目树选择文件以查看引用。",
    noContentFile: "请先从项目树选择文件以打开内容。",
    panelLoading: "正在加载面板...",
  },
};

export function getMainViewCopy(locale: MainViewLocale): MainViewCopy {
  return MAIN_VIEW_COPY[locale];
}
