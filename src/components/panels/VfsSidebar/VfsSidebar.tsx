/**
 * VFS Sidebar Component
 *
 * Tokyo Night themed file explorer for the Wendao VFS.
 * Implements wendao_vfs_explorer_v1.md specification.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../../../api/clientRuntime';
import './VfsSidebar.css';

export interface VfsEntry {
  path: string;
  name: string;
  isDir: boolean;
  category: 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';
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
  folder: '#bb9af7',      // Neon Purple
  skill: '#73daca',        // Toxic Green
  doc: '#7dcfff',          // Cyber Blue
  knowledge: '#bb9af7',   // Neon Purple
  other: '#565f89',        // Muted
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  folder: '📁',
  skill: '⚡',
  doc: '📄',
  knowledge: '🧠',
  other: '📎',
};

export function VfsSidebar({
  onSelectFile,
  onToggleDir,
  selectedPath,
  className = '',
}: VfsSidebarProps): React.ReactElement {
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['skills', 'knowledge', 'internal_skills', 'docs']));
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
          setEntries(result.entries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to scan VFS');
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
      const parts = entry.path.split('/');
      const parentPath = parts.slice(0, -1).join('/') || '';

      if (!root.has(parentPath)) {
        root.set(parentPath, []);
      }
      root.get(parentPath)!.push(entry);
    });

    return root;
  }, []);

  const tree = buildTree(entries);

  // Toggle directory expansion
  const handleToggle = useCallback((path: string) => {
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
  }, [onToggleDir]);

  // Handle file selection
  const handleSelect = useCallback((entry: VfsEntry) => {
    if (!entry.isDir) {
      onSelectFile?.(entry.path, entry);
    }
  }, [onSelectFile]);

  // Render tree node
  const renderNode = useCallback((entry: VfsEntry, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedDirs.has(entry.path);
    const isSelected = selectedPath === entry.path;
    const color = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other;
    const icon = entry.isDir
      ? (isExpanded ? '📂' : '📁')
      : CATEGORY_ICONS[entry.category] || CATEGORY_ICONS.other;

    const children = tree.get(entry.path) || [];
    const hasChildren = children.length > 0;

    return (
      <div key={entry.path} className="vfs-node">
        <div
          className={`vfs-node__content ${isSelected ? 'vfs-node__content--selected' : ''}`}
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => entry.isDir ? handleToggle(entry.path) : handleSelect(entry)}
        >
          <span className="vfs-node__icon" style={{ color }}>
            {icon}
          </span>
          <span className="vfs-node__name" style={{ color: entry.isDir ? color : undefined }}>
            {entry.name}
          </span>
          {entry.hasFrontmatter && (
            <span className="vfs-node__anchor" title="Has frontmatter">
              ⚓
            </span>
          )}
          {entry.wendaoId && (
            <span className="vfs-node__id" title={entry.wendaoId}>
              #{entry.wendaoId.split(':')[0]}
            </span>
          )}
        </div>
        {entry.isDir && isExpanded && hasChildren && (
          <div className="vfs-node__children">
            {children
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedDirs, selectedPath, handleToggle, handleSelect, tree]);

  // Get root entries (those with no parent or empty string parent)
  const rootEntries = entries.filter((e) => {
    const parentPath = e.path.split('/').slice(0, -1).join('/');
    return !tree.has(parentPath) || parentPath === '';
  });

  return (
    <div className={`vfs-sidebar ${className}`}>
      <div className="vfs-sidebar__header">
        <h3 className="vfs-sidebar__title">VFS Explorer</h3>
        {loading && <span className="vfs-sidebar__loading">Scanning...</span>}
      </div>
      <div className="vfs-sidebar__content">
        {error && (
          <div className="vfs-sidebar__error">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="vfs-tree">
            {rootEntries
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((entry) => renderNode(entry, 0))}
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="vfs-sidebar__empty">
            No files found
          </div>
        )}
      </div>
      <div className="vfs-sidebar__footer">
        <span className="vfs-sidebar__stats">
          {entries.filter((e) => !e.isDir).length} files • {entries.filter((e) => e.isDir).length} folders
        </span>
      </div>
    </div>
  );
}

export default VfsSidebar;
