/**
 * VFS Sidebar Component
 *
 * Tokyo Night themed file explorer for the Wendao VFS.
 * Implements wendao_vfs_explorer_v1.md specification.
 */

import { useState, useCallback, useEffect, useMemo, type ReactElement } from "react";
import { api } from "../../../api/clientRuntime";
import "./VfsSidebar.css";

export interface VfsEntry {
  path: string;
  name: string;
  isDir: boolean;
  category: "folder" | "skill" | "doc" | "knowledge" | "other";
  size: number;
  modified: number;
  contentType?: string;
  hasFrontmatter: boolean;
  wendaoId?: string;
}

export interface VfsScanResult {
  entries: VfsEntry[];
  fileCount: number;
  dirCount: number;
  scanDurationMs: number;
}

export interface VfsSidebarProps {
  /** Called when a file is selected */
  onSelectFile?: (path: string, entry: VfsEntry) => void;
  /** Called when a directory is expanded/collapsed */
  onToggleDir?: (path: string, expanded: boolean) => void;
  /** Currently selected path */
  selectedPath?: string | null;
  /** Additional CSS class */
  className?: string;
}

// Category colors (Tokyo Night palette)
const CATEGORY_COLORS: Record<string, string> = {
  folder: "#bb9af7", // Neon Purple
  skill: "#73daca", // Toxic Green
  doc: "#7dcfff", // Cyber Blue
  knowledge: "#bb9af7", // Neon Purple
  other: "#565f89", // Muted
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  folder: "📁",
  skill: "⚡",
  doc: "📄",
  knowledge: "🧠",
  other: "📎",
};

interface VfsNodeProps {
  entry: VfsEntry;
  depth: number;
  tree: Map<string, VfsEntry[]>;
  expandedDirs: Set<string>;
  selectedPath?: string | null;
  onToggle: (path: string) => void;
  onSelect: (entry: VfsEntry) => void;
}

function VfsNode({
  entry,
  depth,
  tree,
  expandedDirs,
  selectedPath,
  onToggle,
  onSelect,
}: VfsNodeProps): ReactElement {
  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const color = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other;
  const icon = entry.isDir
    ? isExpanded
      ? "📂"
      : "📁"
    : CATEGORY_ICONS[entry.category] || CATEGORY_ICONS.other;
  const children = tree.get(entry.path) || [];
  const hasChildren = children.length > 0;
  const contentStyle = useMemo(() => ({ paddingLeft: `${depth * 16}px` }), [depth]);
  const iconStyle = useMemo(() => ({ color }), [color]);
  const nameStyle = useMemo(
    () => ({ color: entry.isDir ? color : undefined }),
    [color, entry.isDir],
  );
  const handleClick = useCallback(() => {
    if (entry.isDir) {
      onToggle(entry.path);
      return;
    }
    onSelect(entry);
  }, [entry, onSelect, onToggle]);
  const sortedChildren: VfsEntry[] = children.toSorted((left: VfsEntry, right: VfsEntry) =>
    left.name.localeCompare(right.name),
  );

  return (
    <div className="vfs-node">
      <button
        type="button"
        className={`vfs-node__content ${isSelected ? "vfs-node__content--selected" : ""}`}
        style={contentStyle}
        onClick={handleClick}
      >
        <span className="vfs-node__icon" style={iconStyle}>
          {icon}
        </span>
        <span className="vfs-node__name" style={nameStyle}>
          {entry.name}
        </span>
        {entry.hasFrontmatter && (
          <span className="vfs-node__anchor" title="Has frontmatter">
            ⚓
          </span>
        )}
        {entry.wendaoId && (
          <span className="vfs-node__id" title={entry.wendaoId}>
            #{entry.wendaoId.split(":")[0]}
          </span>
        )}
      </button>
      {entry.isDir && isExpanded && hasChildren && (
        <div className="vfs-node__children">
          {sortedChildren.map((child: VfsEntry) => (
            <VfsNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              tree={tree}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function VfsSidebar({
  onSelectFile,
  onToggleDir,
  selectedPath,
  className = "",
}: VfsSidebarProps): ReactElement {
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["skills", "knowledge", "internal_skills", "docs"]),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch VFS scan results
  useEffect(() => {
    let cancelled = false;

    const fetchVfs = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await api.scanVfs();
        if (!cancelled) {
          setEntries(
            result.entries.map((entry) => {
              const normalizedEntry: {
                path: string;
                name: string;
                isDir: boolean;
                category: typeof entry.category;
                size: number;
                modified: number;
                hasFrontmatter: boolean;
                contentType?: string;
                wendaoId?: string;
              } = {
                path: entry.path,
                name: entry.name,
                isDir: entry.isDir,
                category: entry.category,
                size: entry.size,
                modified: entry.modified,
                hasFrontmatter: entry.hasFrontmatter,
              };
              if (entry.contentType) {
                normalizedEntry.contentType = entry.contentType;
              }
              if (entry.wendaoId) {
                normalizedEntry.wendaoId = entry.wendaoId;
              }
              return normalizedEntry;
            }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to scan VFS");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchVfs();

    return () => {
      cancelled = true;
    };
  }, []);

  // Build tree structure from flat entries
  const buildTree = useCallback((flatEntries: VfsEntry[]) => {
    const root: Map<string, VfsEntry[]> = new Map();

    flatEntries.forEach((entry) => {
      const parts = entry.path.split("/");
      const parentPath = parts.slice(0, -1).join("/") || "";

      if (!root.has(parentPath)) {
        root.set(parentPath, []);
      }
      root.get(parentPath)!.push(entry);
    });

    return root;
  }, []);

  const tree = buildTree(entries);

  // Toggle directory expansion
  const handleToggle = useCallback(
    (path: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        onToggleDir?.(path, !prev.has(path));
        return next;
      });
    },
    [onToggleDir],
  );

  // Handle file selection
  const handleSelect = useCallback(
    (entry: VfsEntry) => {
      if (!entry.isDir) {
        onSelectFile?.(entry.path, entry);
      }
    },
    [onSelectFile],
  );

  // Get root entries (those with no parent or empty string parent)
  const rootEntries = entries.filter((e) => {
    const parentPath = e.path.split("/").slice(0, -1).join("/");
    return !tree.has(parentPath) || parentPath === "";
  });

  return (
    <div className={`vfs-sidebar ${className}`}>
      <div className="vfs-sidebar__header">
        <h3 className="vfs-sidebar__title">VFS Explorer</h3>
        {loading && <span className="vfs-sidebar__loading">Scanning...</span>}
      </div>
      <div className="vfs-sidebar__content">
        {error && <div className="vfs-sidebar__error">{error}</div>}
        {!loading && !error && (
          <div className="vfs-tree">
            {rootEntries
              .toSorted((left: VfsEntry, right: VfsEntry) => left.name.localeCompare(right.name))
              .map((entry: VfsEntry) => (
                <VfsNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  tree={tree}
                  expandedDirs={expandedDirs}
                  selectedPath={selectedPath}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                />
              ))}
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="vfs-sidebar__empty">No files found</div>
        )}
      </div>
      <div className="vfs-sidebar__footer">
        <span className="vfs-sidebar__stats">
          {entries.filter((e) => !e.isDir).length} files • {entries.filter((e) => e.isDir).length}{" "}
          folders
        </span>
      </div>
    </div>
  );
}

export default VfsSidebar;
