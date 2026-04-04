import type { UiRepoProjectConfig } from "../../../api/bindings";
import type { ConfiguredProjectGroup, FileNode, FileTreeLocale } from "./types";

function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return nodes
    .toSorted((left, right) => {
      if (left.isDir !== right.isDir) {
        return left.isDir ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    })
    .map((node) => {
      const sortedNode: FileNode = {
        name: node.name,
        path: node.path,
        isDir: node.isDir,
        category: node.category,
        level: node.level,
      };
      if (node.projectName) {
        sortedNode.projectName = node.projectName;
      }
      if (node.rootLabel) {
        sortedNode.rootLabel = node.rootLabel;
      }
      if (node.sourceHint) {
        sortedNode.sourceHint = node.sourceHint;
      }
      if (node.isProjectGroup) {
        sortedNode.isProjectGroup = node.isProjectGroup;
      }
      if (node.isRepoProject) {
        sortedNode.isRepoProject = node.isRepoProject;
      }
      if (node.isProjectPlaceholder) {
        sortedNode.isProjectPlaceholder = node.isProjectPlaceholder;
      }
      if (node.children) {
        sortedNode.children = sortFileNodes(node.children);
      }
      return sortedNode;
    });
}

function cloneWithLevelOffset(node: FileNode, levelOffset: number): FileNode {
  return {
    ...node,
    level: node.level + levelOffset,
    children: node.children?.map((child) => cloneWithLevelOffset(child, levelOffset)),
  };
}

export function formatProjectSourceHint(
  projectRoot: string | undefined,
  projectDirs: string[] | undefined,
  locale: FileTreeLocale,
): string | undefined {
  if (!projectRoot) {
    return undefined;
  }

  const rootPrefix = locale === "zh" ? "根目录" : "root";
  const dirsPrefix = locale === "zh" ? "目录" : "dirs";
  const sourcePrefix = locale === "zh" ? "来源" : "source";
  const emptyRoot = locale === "zh" ? "（未显式配置）" : "(no explicit root)";
  const segments = [`${rootPrefix}: ${projectRoot || emptyRoot}`];
  if (projectDirs && projectDirs.length > 0) {
    segments.push(`${dirsPrefix}: [${projectDirs.join(", ")}]`);
  }

  return `${sourcePrefix}: ${segments.join(" · ")}`;
}

export function formatRepoProjectSourceHint(
  repoProject: UiRepoProjectConfig,
  locale: FileTreeLocale,
): string | undefined {
  const sourcePrefix = locale === "zh" ? "来源" : "source";
  const repoPrefix = locale === "zh" ? "仓库" : "repo";
  const rootPrefix = locale === "zh" ? "根目录" : "root";
  const refPrefix = locale === "zh" ? "引用" : "ref";
  const pluginsPrefix = locale === "zh" ? "插件" : "plugins";
  const segments: string[] = [];

  if (repoProject.root) {
    segments.push(`${rootPrefix}: ${repoProject.root}`);
  }
  if (repoProject.url) {
    segments.push(`${repoPrefix}: ${repoProject.url}`);
  }
  if (repoProject.gitRef) {
    segments.push(`${refPrefix}: ${repoProject.gitRef}`);
  }
  if (repoProject.plugins.length > 0) {
    segments.push(`${pluginsPrefix}: [${repoProject.plugins.join(", ")}]`);
  }

  if (segments.length === 0) {
    return undefined;
  }

  return `${sourcePrefix}: ${segments.join(" · ")}`;
}

export function buildTree(
  entries: Array<{
    path: string;
    name: string;
    isDir: boolean;
    category: string;
    projectName?: string;
    rootLabel?: string;
    projectRoot?: string;
    projectDirs?: string[];
  }>,
  locale: FileTreeLocale,
  configuredProjects: ConfiguredProjectGroup[],
  emptyProjectHint: string,
): FileNode[] {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  const sorted = entries.toSorted((left, right) => {
    const leftDepth = left.path.split("/").length;
    const rightDepth = right.path.split("/").length;
    return leftDepth - rightDepth;
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/");
    const level = parts.length - 1;

    const node: FileNode = {
      name: entry.name,
      path: entry.path,
      isDir: entry.isDir,
      category: entry.category as FileNode["category"],
      projectName: entry.projectName,
      rootLabel: entry.rootLabel,
      sourceHint: formatProjectSourceHint(entry.projectRoot, entry.projectDirs, locale),
      isRepoProject: configuredProjects.some(
        (project) => project.isRepoProject && project.name === entry.projectName,
      ),
      children: entry.isDir ? [] : undefined,
      level,
    };

    nodeMap.set(entry.path, node);

    if (level === 0) {
      root.push(node);
      continue;
    }

    const parentPath = parts.slice(0, -1).join("/");
    const parent = nodeMap.get(parentPath);
    if (parent?.children) {
      parent.children.push(node);
    } else {
      root.push(node);
    }
  }

  const sortedRoot = sortFileNodes(root);

  const groupedRoots: FileNode[] = [];
  const projectGroups = new Map<string, FileNode>();
  const ungroupedRoots: FileNode[] = [];

  for (const rootNode of sortedRoot) {
    if (!rootNode.projectName) {
      ungroupedRoots.push(rootNode);
      continue;
    }

    let projectNode = projectGroups.get(rootNode.projectName);
    if (!projectNode) {
      projectNode = {
        name: rootNode.projectName,
        path: `__project__/${rootNode.projectName}`,
        isDir: true,
        category: "folder",
        sourceHint: rootNode.sourceHint,
        children: [],
        level: 0,
        isProjectGroup: true,
        isRepoProject: rootNode.isRepoProject,
      };
      projectGroups.set(rootNode.projectName, projectNode);
    }

    const groupedRoot = cloneWithLevelOffset(rootNode, 1);
    groupedRoot.name = rootNode.rootLabel ?? groupedRoot.name;
    projectNode.children?.push(groupedRoot);
  }

  const sortedUngroupedRoots = sortFileNodes(ungroupedRoots);

  for (const projectNode of projectGroups.values()) {
    projectNode.children = sortFileNodes(projectNode.children ?? []);
  }

  for (const project of configuredProjects) {
    const projectName = project.name.trim();
    if (!projectName) {
      continue;
    }

    let projectNode = projectGroups.get(projectName);
    if (!projectNode) {
      projectNode = {
        name: projectName,
        path: `__project__/${projectName}`,
        isDir: true,
        category: "folder",
        sourceHint:
          project.sourceHint ?? formatProjectSourceHint(project.root, project.dirs, locale),
        children: [],
        level: 0,
        isProjectGroup: true,
        isRepoProject: project.isRepoProject,
      };
      projectGroups.set(projectName, projectNode);
    } else if (!projectNode.sourceHint) {
      projectNode.sourceHint =
        project.sourceHint ?? formatProjectSourceHint(project.root, project.dirs, locale);
      projectNode.isRepoProject = projectNode.isRepoProject ?? project.isRepoProject;
    }

    if ((projectNode.children?.length ?? 0) === 0) {
      projectNode.children?.push({
        name: emptyProjectHint,
        path: `__project__/${projectName}/__empty__`,
        isDir: false,
        category: "other",
        projectName,
        sourceHint: projectNode.sourceHint,
        children: undefined,
        level: 1,
        isProjectPlaceholder: true,
      });
    }
  }

  const orderedProjectNames = new Set<string>();
  for (const project of configuredProjects) {
    const projectName = project.name.trim();
    const projectNode = projectGroups.get(projectName);
    if (!projectNode || orderedProjectNames.has(projectName)) {
      continue;
    }
    groupedRoots.push(projectNode);
    orderedProjectNames.add(projectName);
  }
  for (const [projectName, projectNode] of projectGroups.entries()) {
    if (orderedProjectNames.has(projectName)) {
      continue;
    }
    groupedRoots.push(projectNode);
  }

  groupedRoots.push(...sortedUngroupedRoots);
  return groupedRoots;
}
