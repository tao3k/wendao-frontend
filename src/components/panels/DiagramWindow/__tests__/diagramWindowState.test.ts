import { describe, expect, it } from 'vitest';
import {
  resolveDiagramKind,
  resolveInitialDisplayMode,
  shouldLoadMermaidRuntime,
} from '../diagramWindowState';

describe('diagramWindowState', () => {
  it('resolves diagram kind from bpmn/mermaid presence', () => {
    expect(resolveDiagramKind(true, true)).toBe('both');
    expect(resolveDiagramKind(true, false)).toBe('bpmn');
    expect(resolveDiagramKind(false, true)).toBe('mermaid');
    expect(resolveDiagramKind(false, false)).toBe('none');
  });

  it('resolves initial display mode predictably', () => {
    expect(resolveInitialDisplayMode(true, true)).toBe('split');
    expect(resolveInitialDisplayMode(true, false)).toBe('bpmn');
    expect(resolveInitialDisplayMode(false, true)).toBe('mermaid');
    expect(resolveInitialDisplayMode(false, false)).toBe('mermaid');
  });

  it('loads mermaid runtime only for mermaid-capable modes', () => {
    expect(shouldLoadMermaidRuntime(true, 'split')).toBe(true);
    expect(shouldLoadMermaidRuntime(true, 'mermaid')).toBe(true);
    expect(shouldLoadMermaidRuntime(true, 'bpmn')).toBe(false);
    expect(shouldLoadMermaidRuntime(false, 'split')).toBe(false);
  });
});
