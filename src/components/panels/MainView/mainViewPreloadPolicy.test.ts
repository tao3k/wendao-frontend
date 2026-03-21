import { describe, expect, it } from 'vitest';
import { canPreloadMainViewTab, isConstrainedNetwork } from './mainViewPreloadPolicy';

describe('mainViewPreloadPolicy', () => {
  it('treats save-data as constrained network', () => {
    expect(isConstrainedNetwork({ saveData: true })).toBe(true);
  });

  it('treats 3g and low downlink as constrained network', () => {
    expect(isConstrainedNetwork({ effectiveType: '3g' })).toBe(true);
    expect(isConstrainedNetwork({ downlink: 0.8 })).toBe(true);
  });

  it('keeps graph and diagram preload disabled on constrained network', () => {
    const constrainedNetwork = { effectiveType: '3g' };

    expect(canPreloadMainViewTab('diagram', constrainedNetwork)).toBe(false);
    expect(canPreloadMainViewTab('graph', constrainedNetwork)).toBe(false);
  });

  it('keeps content preload enabled on constrained network', () => {
    expect(canPreloadMainViewTab('content', { saveData: true })).toBe(true);
  });

  it('allows heavy preloads on fast network', () => {
    const fastNetwork = { effectiveType: '4g', downlink: 10 };

    expect(canPreloadMainViewTab('diagram', fastNetwork)).toBe(true);
    expect(canPreloadMainViewTab('graph', fastNetwork)).toBe(true);
    expect(canPreloadMainViewTab('content', fastNetwork)).toBe(true);
  });

  it('never preloads references tab', () => {
    expect(canPreloadMainViewTab('references', { effectiveType: '4g', downlink: 10 })).toBe(false);
  });
});
