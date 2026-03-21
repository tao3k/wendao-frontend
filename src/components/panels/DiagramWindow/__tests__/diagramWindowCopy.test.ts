import { describe, expect, it } from 'vitest';
import { getDiagramWindowCopy } from '../diagramWindowCopy';

describe('diagramWindowCopy', () => {
  it('returns english copy set', () => {
    const copy = getDiagramWindowCopy('en');

    expect(copy.noDiagramDetected).toBe('No diagram detected');
    expect(copy.modeTabLabel).toBe('Diagram mode');
    expect(copy.resetViewLabel).toBe('Reset view');
  });

  it('returns chinese copy set', () => {
    const copy = getDiagramWindowCopy('zh');

    expect(copy.noDiagramDetected).toBe('未检测到图示');
    expect(copy.modeTabLabel).toBe('图示模式');
    expect(copy.resetViewLabel).toBe('重置视图');
  });
});
