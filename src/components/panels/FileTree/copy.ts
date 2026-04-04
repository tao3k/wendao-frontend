import type { FileTreeCopy } from "./types";

export const FILE_TREE_COPY: Record<"en" | "zh", FileTreeCopy> = {
  en: {
    toolbarTitle: "File Tree",
    rootsSuffix: "roots",
    emptyProjectHint: "No indexed roots (check project root/dirs)",
    gatewayBlocked: "Gateway sync blocked.",
    gatewayHint: "Studio requires a healthy gateway before the project tree can be shown.",
    retry: "Retry gateway sync",
  },
  zh: {
    toolbarTitle: "文件树",
    rootsSuffix: "个根节点",
    emptyProjectHint: "暂无索引根（请检查项目 root/dirs）",
    gatewayBlocked: "网关同步被阻塞。",
    gatewayHint: "Studio 需要可用网关后才能显示项目树。",
    retry: "重试网关同步",
  },
};
