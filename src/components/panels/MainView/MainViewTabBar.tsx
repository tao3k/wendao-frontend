import React from 'react';
import type { MainViewCopy } from './mainViewCopy';
import type { MainViewTab } from './mainViewTypes';

interface MainViewTabBarProps {
  activeTab: MainViewTab;
  copy: Pick<
    MainViewCopy,
    'tabDiagram' | 'tabReferences' | 'tabGraph' | 'tabContent'
  >;
  onTabChange: (tab: MainViewTab) => void;
  onPreloadTab: (tab: MainViewTab) => void;
}

export function MainViewTabBar({
  activeTab,
  copy,
  onTabChange,
  onPreloadTab,
}: MainViewTabBarProps): React.ReactElement {
  return (
    <div className="main-view-tabs">
      <button
        className={`main-view-tab ${activeTab === 'diagram' ? 'active animate-breathe neon-glow--blue' : ''}`}
        onClick={() => onTabChange('diagram')}
        onMouseEnter={() => onPreloadTab('diagram')}
        onFocus={() => onPreloadTab('diagram')}
      >
        {copy.tabDiagram}
      </button>
      <button
        className={`main-view-tab ${activeTab === 'references' ? 'active animate-breathe neon-glow--blue' : ''}`}
        onClick={() => onTabChange('references')}
      >
        {copy.tabReferences}
      </button>
      <button
        className={`main-view-tab ${activeTab === 'graph' ? 'active animate-breathe neon-glow--blue' : ''}`}
        onClick={() => onTabChange('graph')}
        onMouseEnter={() => onPreloadTab('graph')}
        onFocus={() => onPreloadTab('graph')}
      >
        {copy.tabGraph}
      </button>
      <button
        className={`main-view-tab ${activeTab === 'content' ? 'active animate-breathe neon-glow--blue' : ''}`}
        onClick={() => onTabChange('content')}
        onMouseEnter={() => onPreloadTab('content')}
        onFocus={() => onPreloadTab('content')}
      >
        {copy.tabContent}
      </button>
    </div>
  );
}
