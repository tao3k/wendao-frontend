import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from './flight/generated/Flight_pb';
import {
  buildVfsResolveFlightHeaders,
  buildWorkspaceFlightDescriptor,
  resolveStudioPathFlight,
} from './flightWorkspaceTransport';

describe('flightWorkspaceTransport', () => {
  it('builds the canonical VFS resolve descriptor path', () => {
    expect(buildWorkspaceFlightDescriptor('/vfs/resolve').path).toEqual([
      'vfs',
      'resolve',
    ]);
  });

  it('builds the canonical VFS resolve Flight metadata headers', () => {
    const headers = buildVfsResolveFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      path: 'main/docs/index.md',
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-vfs-path')).toBe('main/docs/index.md');
  });

  it('materializes studio navigation targets through the canonical Flight route', async () => {
    const response = await resolveStudioPathFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        path: 'docs/index.md',
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['vfs', 'resolve']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([1]),
                }),
              }],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  path: 'docs/index.md',
                  navigationTarget: {
                    path: 'main/docs/index.md',
                    category: 'file',
                    projectName: 'main',
                  },
                })
              ),
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeNavigationTarget: () => ({
          path: 'main/docs/index.md',
          category: 'file',
          projectName: 'main',
        }),
      }
    );

    expect(response).toEqual({
      path: 'main/docs/index.md',
      category: 'file',
      projectName: 'main',
    });
  });
});
