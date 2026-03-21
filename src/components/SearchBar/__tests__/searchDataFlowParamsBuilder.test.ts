import { describe, expect, it } from 'vitest';
import {
  buildSearchDataFlowParams,
  type SearchDataFlowParams,
} from '../searchDataFlowParamsBuilder';

describe('searchDataFlowParamsBuilder', () => {
  it('builds data-flow params as a stable copy', () => {
    const params = {
      query: 'repo:xiuxian',
      scope: 'all',
    } as unknown as SearchDataFlowParams;

    const result = buildSearchDataFlowParams(params);

    expect(result).toEqual(params);
    expect(result).not.toBe(params);
  });
});
