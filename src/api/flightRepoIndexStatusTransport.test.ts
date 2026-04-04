import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from './flight/generated/Flight_pb';
import {
  buildRepoIndexStatusFlightHeaders,
  loadRepoIndexStatusFlight,
} from './flightRepoIndexStatusTransport';

describe('flightRepoIndexStatusTransport', () => {
  it('builds canonical repo index status Flight headers', () => {
    const headers = buildRepoIndexStatusFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      repo: 'gateway-sync',
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-repo-index-status-repo')).toBe('gateway-sync');
  });

  it('materializes repo index status through the canonical Flight route', async () => {
    const response = await loadRepoIndexStatusFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        repo: 'gateway-sync',
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['analysis', 'repo-index-status']);
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
        decodeRepoIndexStatusResponse: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7,
            0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return {
            total: 3,
            queued: 1,
            checking: 0,
            syncing: 1,
            indexing: 1,
            ready: 1,
            unsupported: 0,
            failed: 0,
            targetConcurrency: 2,
            maxConcurrency: 4,
            syncConcurrencyLimit: 1,
            currentRepoId: 'gateway-sync',
            repos: [{
              repoId: 'gateway-sync',
              phase: 'ready',
              lastRevision: 'rev:123',
              attemptCount: 2,
            }],
          };
        },
      },
    );

    expect(response.total).toBe(3);
    expect(response.currentRepoId).toBe('gateway-sync');
    expect(response.repos[0]?.repoId).toBe('gateway-sync');
  });
});
