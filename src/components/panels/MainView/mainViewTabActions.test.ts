import { describe, expect, it, vi } from 'vitest';
import { createMainViewTabActions } from './mainViewTabActions';

describe('mainViewTabActions', () => {
  it('forwards tab changes to state setter', () => {
    const setActiveTab = vi.fn();
    const preloadTab = vi.fn();
    const actions = createMainViewTabActions({
      setActiveTab: setActiveTab as never,
      preloadTab,
    });

    actions.onTabChange('graph');
    actions.onTabChange('content');

    expect(setActiveTab).toHaveBeenCalledTimes(2);
    expect(setActiveTab).toHaveBeenNthCalledWith(1, 'graph');
    expect(setActiveTab).toHaveBeenNthCalledWith(2, 'content');
  });

  it('forwards preload events to preloader', () => {
    const setActiveTab = vi.fn();
    const preloadTab = vi.fn();
    const actions = createMainViewTabActions({
      setActiveTab: setActiveTab as never,
      preloadTab,
    });

    actions.onPreloadTab('diagram');
    actions.onPreloadTab('graph');

    expect(preloadTab).toHaveBeenCalledTimes(2);
    expect(preloadTab).toHaveBeenNthCalledWith(1, 'diagram');
    expect(preloadTab).toHaveBeenNthCalledWith(2, 'graph');
  });
});
