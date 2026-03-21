import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MainViewTabBar } from './MainViewTabBar';
import { getMainViewCopy } from './mainViewCopy';

describe('MainViewTabBar', () => {
  it('renders all tab labels from copy', () => {
    const copy = getMainViewCopy('en');

    render(
      <MainViewTabBar
        activeTab="diagram"
        copy={copy}
        onTabChange={vi.fn()}
        onPreloadTab={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Diagram' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'References' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Graph' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Content' })).toBeInTheDocument();
  });

  it('forwards tab change and preload events', () => {
    const copy = getMainViewCopy('en');
    const onTabChange = vi.fn();
    const onPreloadTab = vi.fn();

    render(
      <MainViewTabBar
        activeTab="references"
        copy={copy}
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Graph' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Diagram' }));
    fireEvent.focus(screen.getByRole('button', { name: 'Content' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'References' }));

    expect(onTabChange).toHaveBeenCalledWith('graph');
    expect(onPreloadTab).toHaveBeenCalledWith('diagram');
    expect(onPreloadTab).toHaveBeenCalledWith('content');
    expect(onPreloadTab).toHaveBeenCalledTimes(2);
  });
});
