import React, { useState, useCallback, useEffect } from 'react';
import { Resizer } from './Resizer';
import '../../styles/layout/Layout.css';

interface AppLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  toolbar?: React.ReactNode;
  statusBar?: React.ReactNode;
}

const STORAGE_KEY_LEFT = 'qianji-ide-left-width';
const STORAGE_KEY_RIGHT = 'qianji-ide-right-width';

export const AppLayout: React.FC<AppLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  toolbar,
  statusBar,
}) => {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LEFT);
    return saved ? parseInt(saved, 10) : 260;
  });

  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RIGHT);
    return saved ? parseInt(saved, 10) : 300;
  });

  // Persist widths
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEFT, String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RIGHT, String(rightWidth));
  }, [rightWidth]);

  const handleLeftResize = useCallback((width: number) => {
    setLeftWidth(width);
  }, []);

  const handleRightResize = useCallback((width: number) => {
    setRightWidth(width);
  }, []);

  return (
    <div
      className="ide-layout"
      style={{
        '--ide-sidebar-width': `${leftWidth}px`,
        '--ide-property-width': `${rightWidth}px`,
      } as React.CSSProperties}
    >
      {toolbar && (
        <div className="ide-layout__toolbar">
          {toolbar}
        </div>
      )}

      <div className="ide-layout__sidebar">
        {leftPanel}
        <Resizer
          side="left"
          currentWidth={leftWidth}
          onResize={handleLeftResize}
          minWidth={180}
          maxWidth={450}
        />
      </div>

      <div className="ide-layout__center">
        {centerPanel}
      </div>

      <div className="ide-layout__properties">
        <Resizer
          side="right"
          currentWidth={rightWidth}
          onResize={handleRightResize}
          minWidth={200}
          maxWidth={500}
        />
        {rightPanel}
      </div>

      {statusBar && (
        <div className="ide-layout__statusbar">
          {statusBar}
        </div>
      )}
    </div>
  );
};
