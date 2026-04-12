import React, { useState, useMemo, useCallback } from "react";
import { Search, Layers } from "lucide-react";
import { NodeTree, TreeNode } from "./NodeTree";
import { AcademicNode } from "../../../types";
import "../../../styles/ide/NodeBrowser.css";

type UiLocale = "en" | "zh";
type NodeFilterType = "task" | "event" | "gateway";

interface NodeBrowserProps {
  nodes: AcademicNode[];
  selectedNodeId?: string;
  onNodeSelect: (node: AcademicNode) => void;
  onNodeDoubleClick?: (node: AcademicNode) => void;
  locale: UiLocale;
}

// Convert flat node list to tree structure
function buildNodeTree(nodes: AcademicNode[]): TreeNode[] {
  // For now, return flat list as tree (no hierarchy in BPMN)
  // Can be extended to support subprocess/lane hierarchy
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    children: [],
  }));
}

function filterTree(
  tree: TreeNode[],
  searchQuery: string,
  filterType: NodeFilterType | null,
): TreeNode[] {
  const query = searchQuery.toLowerCase();

  return tree.filter((node) => {
    const matchesSearch =
      !query || node.name.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
    const matchesType = !filterType || node.type === filterType;
    return matchesSearch && matchesType;
  });
}

const NODE_BROWSER_COPY: Record<
  UiLocale,
  {
    title: string;
    searchPlaceholder: string;
    emptyLabel: string;
    filters: Record<"all" | NodeFilterType, string>;
  }
> = {
  en: {
    title: "Nodes",
    searchPlaceholder: "Search nodes...",
    emptyLabel: "No nodes found",
    filters: {
      all: "All",
      task: "Tasks",
      event: "Events",
      gateway: "Gateways",
    },
  },
  zh: {
    title: "节点",
    searchPlaceholder: "搜索节点...",
    emptyLabel: "未找到节点",
    filters: {
      all: "全部",
      task: "任务",
      event: "事件",
      gateway: "网关",
    },
  },
};

const TYPE_FILTERS: Array<{ value: NodeFilterType | null; key: "all" | NodeFilterType }> = [
  { value: null, key: "all" },
  { value: "task", key: "task" },
  { value: "event", key: "event" },
  { value: "gateway", key: "gateway" },
];

const NODE_BROWSER_TITLE_ICON_STYLE = { marginRight: 6 } as const;
const NODE_BROWSER_META_STYLE = {
  fontSize: 11,
  color: "rgba(230, 243, 255, 0.5)",
} as const;
const NODE_BROWSER_SEARCH_WRAPPER_STYLE = { position: "relative" } as const;
const NODE_BROWSER_SEARCH_ICON_STYLE = {
  position: "absolute",
  left: 10,
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(230, 243, 255, 0.4)",
} as const;
const NODE_BROWSER_SEARCH_INPUT_STYLE = { paddingLeft: 32 } as const;

interface NodeFilterButtonProps {
  filterValue: NodeFilterType | null;
  isActive: boolean;
  label: string;
  onSelect: (value: NodeFilterType | null) => void;
}

function NodeFilterButton({
  filterValue,
  isActive,
  label,
  onSelect,
}: NodeFilterButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(filterValue);
  }, [filterValue, onSelect]);

  return (
    <button
      type="button"
      className={`node-browser__filter-btn ${isActive ? "active" : ""}`}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}

export const NodeBrowser: React.FC<NodeBrowserProps> = ({
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodeDoubleClick,
  locale,
}) => {
  const copy = NODE_BROWSER_COPY[locale];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<NodeFilterType | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree from nodes
  const tree = useMemo(() => buildNodeTree(nodes), [nodes]);

  // Filter tree
  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery, filterType),
    [tree, searchQuery, filterType],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (treeNode: TreeNode) => {
      const node = nodes.find((n) => n.id === treeNode.id);
      if (node) {
        onNodeSelect(node);
      }
    },
    [nodes, onNodeSelect],
  );

  const handleDoubleClick = useCallback(
    (treeNode: TreeNode) => {
      const node = nodes.find((n) => n.id === treeNode.id);
      if (node && onNodeDoubleClick) {
        onNodeDoubleClick(node);
      }
    },
    [nodes, onNodeDoubleClick],
  );

  const handleSearchQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  return (
    <div className="node-browser">
      <div className="panel-header">
        <span className="panel-header__title">
          <Layers size={14} style={NODE_BROWSER_TITLE_ICON_STYLE} />
          {copy.title}
        </span>
        <span style={NODE_BROWSER_META_STYLE}>
          {filteredTree.length} / {nodes.length}
        </span>
      </div>

      <div className="node-browser__search">
        <div style={NODE_BROWSER_SEARCH_WRAPPER_STYLE}>
          <Search size={14} style={NODE_BROWSER_SEARCH_ICON_STYLE} />
          <input
            type="text"
            className="node-browser__search-input"
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchQueryChange}
            style={NODE_BROWSER_SEARCH_INPUT_STYLE}
          />
        </div>
      </div>

      <div className="node-browser__filter">
        {TYPE_FILTERS.map((filter) => (
          <NodeFilterButton
            key={filter.key}
            filterValue={filter.value}
            isActive={filterType === filter.value}
            label={copy.filters[filter.key]}
            onSelect={setFilterType}
          />
        ))}
      </div>

      <div className="node-browser__tree panel-content">
        <NodeTree
          tree={filteredTree}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          onToggleExpand={handleToggleExpand}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          emptyLabel={copy.emptyLabel}
        />
      </div>
    </div>
  );
};
