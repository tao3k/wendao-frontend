import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from '../AppLayout';

describe('AppLayout', () => {
  const mockLeftPanel = <div data-testid="left-panel">Left</div>;
  const mockCenterPanel = <div data-testid="center-panel">Center</div>;
  const mockRightPanel = <div data-testid="right-panel">Right</div>;
  const mockToolbar = <div data-testid="toolbar">Toolbar</div>;
  const mockStatusBar = <div data-testid="statusbar">StatusBar</div>;

  beforeEach(() => {
    localStorage.clear();
  });

  it('should render all three panels', () => {
    render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
      />
    );

    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('center-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  it('should render toolbar when provided', () => {
    render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
        toolbar={mockToolbar}
      />
    );

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('should render status bar when provided', () => {
    render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
        statusBar={mockStatusBar}
      />
    );

    expect(screen.getByTestId('statusbar')).toBeInTheDocument();
  });

  it('should use default widths when no saved state', () => {
    const { container } = render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
      />
    );

    const layout = container.querySelector('.ide-layout') as HTMLElement;
    const style = layout.style;

    expect(style.getPropertyValue('--ide-sidebar-width')).toBe('260px');
    expect(style.getPropertyValue('--ide-property-width')).toBe('300px');
  });

  it('should restore widths from localStorage', () => {
    localStorage.setItem('qianji-ide-left-width', '320');
    localStorage.setItem('qianji-ide-right-width', '380');

    const { container } = render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
      />
    );

    const layout = container.querySelector('.ide-layout') as HTMLElement;
    const style = layout.style;

    expect(style.getPropertyValue('--ide-sidebar-width')).toBe('320px');
    expect(style.getPropertyValue('--ide-property-width')).toBe('380px');
  });

  it('should render layout with correct CSS classes', () => {
    const { container } = render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
        toolbar={mockToolbar}
        statusBar={mockStatusBar}
      />
    );

    expect(container.querySelector('.ide-layout')).toBeInTheDocument();
    expect(container.querySelector('.ide-layout__toolbar')).toBeInTheDocument();
    expect(container.querySelector('.ide-layout__sidebar')).toBeInTheDocument();
    expect(container.querySelector('.ide-layout__center')).toBeInTheDocument();
    expect(container.querySelector('.ide-layout__properties')).toBeInTheDocument();
    expect(container.querySelector('.ide-layout__statusbar')).toBeInTheDocument();
  });

  it('should render resizers for both panels', () => {
    const { container } = render(
      <AppLayout
        leftPanel={mockLeftPanel}
        centerPanel={mockCenterPanel}
        rightPanel={mockRightPanel}
      />
    );

    expect(container.querySelector('.resizer--left')).toBeInTheDocument();
    expect(container.querySelector('.resizer--right')).toBeInTheDocument();
  });
});
