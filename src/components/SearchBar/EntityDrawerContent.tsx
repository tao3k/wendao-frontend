import React, { useState, useCallback } from 'react';
import type { ProjectedPageIndexTree, ProjectedPageIndexNode, SearchResult } from '../../api';
import { DirectReader } from '../panels/DirectReader/DirectReader';
import { Shield, Link as LinkIcon, Sparkles, RefreshCcw } from 'lucide-react';
import { useRefineAction } from './useRefineAction';
import { EquationSlot } from './EquationSlot';

interface EntityDrawerContentProps {
  tree: ProjectedPageIndexTree;
  result: SearchResult;
}

export const EntityDrawerContent: React.FC<EntityDrawerContentProps> = ({ tree, result }) => {
  const { isRefining, refinementError, refineEntity } = useRefineAction();
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  const [userHints, setUserHints] = useState('');
  const [showRefinementInput, setShowRefinementInput] = useState(false);

  const handleRefine = useCallback(async () => {
    const response = await refineEntity(result, userHints);
    if (response) {
      setRefinedContent(response.refined_content);
      setShowRefinementInput(false);
    }
  }, [refineEntity, result, userHints]);

  const renderNode = (node: ProjectedPageIndexNode) => {
    return (
      <div key={node.node_id} className="drawer-node">
        <h3 className={`drawer-node-title level-${node.level}`}>{node.title}</h3>
        {node.text && (
          <div className="drawer-node-text">
            {node.text.startsWith('#') || node.text.includes('\n') ? (
              <DirectReader path={tree.path} initialContent={node.text} />
            ) : (
              <p>{node.text}</p>
            )}
          </div>
        )}
        {node.children && node.children.length > 0 && (
          <div className="drawer-node-children">
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  const equation_latex = result.attributes?.equation_latex;

  return (
    <div className="entity-drawer-content">
      <div className="drawer-metadata">
        <div className="drawer-repo-badge">{tree.repo_id}</div>
        {(result.verification_state === 'verified' || refinedContent) && (
          <div className="drawer-verification-badge">
            <Shield size={14} />
            <span>{refinedContent ? 'Trinity Verified' : 'Verified'}</span>
          </div>
        )}
      </div>
      
      <div className="drawer-path-breadcrumbs">
        {tree.path.split('/').map((part, i, arr) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < arr.length - 1 && <span className="separator">/</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="drawer-tree-container">
        {tree.roots.map(renderNode)}
      </div>

      {equation_latex && (
        <EquationSlot latex={equation_latex} />
      )}

      {refinedContent && (
        <div className="drawer-refined-section">
          <h4 className="drawer-section-title">
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            AI Refined Explanation
          </h4>
          <div className="drawer-refined-content">
            <DirectReader path={`${tree.path}#refined`} initialContent={refinedContent} />
          </div>
        </div>
      )}

      {result.implicit_backlink_items && result.implicit_backlink_items.length > 0 && (
        <div className="drawer-backlinks-section">
          <h4 className="drawer-section-title">
            <LinkIcon size={14} style={{ marginRight: '6px' }} />
            Referenced In
          </h4>
          <div className="drawer-backlinks-list">
            {result.implicit_backlink_items.map((item) => (
              <div key={item.id} className="drawer-backlink-item">
                <span className="backlink-title">{item.title || item.id}</span>
                <span className="backlink-path">{item.path}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="drawer-actions-footer">
        {!showRefinementInput ? (
          <button 
            className="drawer-action-btn refine-btn" 
            onClick={() => setShowRefinementInput(true)}
            disabled={isRefining}
          >
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            {isRefining ? 'Refining...' : 'Refine with AI'}
          </button>
        ) : (
          <div className="drawer-refinement-form">
            <textarea
              className="drawer-hint-input"
              placeholder="Add hints for AI (e.g. explain performance, add examples)..."
              value={userHints}
              onChange={(e) => setUserHints(e.target.value)}
            />
            <div className="drawer-form-actions">
              <button className="drawer-btn secondary" onClick={() => setShowRefinementInput(false)}>Cancel</button>
              <button className="drawer-btn primary" onClick={handleRefine} disabled={isRefining}>
                {isRefining ? <RefreshCcw size={14} className="spin" /> : 'Refine'}
              </button>
            </div>
          </div>
        )}
        {refinementError && <div className="drawer-action-error">{refinementError}</div>}
      </div>
    </div>
  );
};
