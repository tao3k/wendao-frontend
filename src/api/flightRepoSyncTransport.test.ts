import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from './flight/generated/Flight_pb';
import {
  buildRepoSyncFlightHeaders,
  loadRepoSyncFlight,
} from './flightRepoSyncTransport';

describe('flightRepoSyncTransport', () => {
  it('builds canonical repo sync Flight headers', () => {
    const headers = buildRepoSyncFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      repo: 'gateway-sync',
      mode: 'status',
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-repo-sync-repo')).toBe('gateway-sync');
    expect(headers.get('x-wendao-repo-sync-mode')).toBe('status');
  });

  it('materializes repo sync through the canonical Flight route', async () => {
    const response = await loadRepoSyncFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        repo: 'gateway-sync',
        mode: 'status',
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['analysis', 'repo-sync']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([4]),
                }),
              }],
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([5, 6]),
              dataBody: new Uint8Array([7]),
            });
          },
        }),
        decodeRepoSyncResponse: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7,
            0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return {
            repoId: 'gateway-sync',
            mode: 'status',
            sourceKind: 'managed_remote',
            refresh: 'fetch',
            mirrorState: 'validated',
            checkoutState: 'reused',
            revision: 'rev:123',
            checkoutPath: '/tmp/gateway-sync',
            mirrorPath: '/tmp/gateway-sync.mirror',
            checkedAt: '2026-04-03T19:15:00Z',
            lastFetchedAt: '2026-04-03T19:10:00Z',
            upstreamUrl: 'https://example.com/repo.git',
            healthState: 'healthy',
            stalenessState: 'fresh',
            driftState: 'in_sync',
            statusSummary: {
              healthState: 'healthy',
              driftState: 'in_sync',
              attentionRequired: false,
            },
          };
        },
      },
    );

    expect(response.repoId).toBe('gateway-sync');
    expect(response.mode).toBe('status');
    expect(response.healthState).toBe('healthy');
  });
});
