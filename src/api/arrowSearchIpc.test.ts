import { tableFromArrays, tableToIPC } from 'apache-arrow';
import { describe, expect, it } from 'vitest';

import { decodeAttachmentSearchHitsFromArrowIpc } from './arrowSearchIpc';

describe('Arrow attachment search IPC decoder', () => {
  it('decodes attachment Arrow hits with navigation target and snippet fields', () => {
    const payload = tableToIPC(tableFromArrays({
      name: ['topology.png'],
      path: ['kernel/docs/attachments/topology-owner.md'],
      sourceId: ['note:topology-owner'],
      sourceStem: ['topology-owner'],
      sourceTitle: ['Topology Owner'],
      navigationTargetJson: [JSON.stringify({
        path: 'kernel/docs/attachments/topology-owner.md',
        category: 'knowledge',
        projectName: 'kernel',
        rootLabel: 'kernel',
        line: 8,
        lineEnd: 12,
        column: 1,
      })],
      sourcePath: ['kernel/docs/attachments/topology-owner.md'],
      attachmentId: ['attachment:topology-owner:diagram'],
      attachmentPath: ['kernel/docs/assets/topology.png'],
      attachmentName: ['topology.png'],
      attachmentExt: ['png'],
      kind: ['image'],
      score: [0.91],
      visionSnippet: ['A topology diagram'],
    }), 'stream');

    expect(decodeAttachmentSearchHitsFromArrowIpc(payload)).toEqual([{
      name: 'topology.png',
      path: 'kernel/docs/attachments/topology-owner.md',
      sourceId: 'note:topology-owner',
      sourceStem: 'topology-owner',
      sourceTitle: 'Topology Owner',
      navigationTarget: {
        path: 'kernel/docs/attachments/topology-owner.md',
        category: 'knowledge',
        projectName: 'kernel',
        rootLabel: 'kernel',
        line: 8,
        lineEnd: 12,
        column: 1,
      },
      sourcePath: 'kernel/docs/attachments/topology-owner.md',
      attachmentId: 'attachment:topology-owner:diagram',
      attachmentPath: 'kernel/docs/assets/topology.png',
      attachmentName: 'topology.png',
      attachmentExt: 'png',
      kind: 'image',
      score: 0.91,
      visionSnippet: 'A topology diagram',
    }]);
  });
});
