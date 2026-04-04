import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from './flight/generated/Flight_pb';
import {
  buildGraphNeighborsFlightDescriptor,
  buildGraphNeighborsFlightHeaders,
  buildTopology3DFlightDescriptor,
  buildTopology3DFlightHeaders,
  loadGraphNeighborsFlight,
  loadTopology3DFlight,
} from './flightGraphTransport';

describe('flightGraphTransport', () => {
  it('builds the canonical graph-neighbors descriptor path', () => {
    expect(buildGraphNeighborsFlightDescriptor().path).toEqual([
      'graph',
      'neighbors',
    ]);
  });

  it('builds canonical graph-neighbors Flight metadata headers', () => {
    const headers = buildGraphNeighborsFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      nodeId: 'main/docs/index.md',
      direction: 'both',
      hops: 2,
      limit: 20,
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-graph-node-id')).toBe('main/docs/index.md');
    expect(headers.get('x-wendao-graph-direction')).toBe('both');
    expect(headers.get('x-wendao-graph-hops')).toBe('2');
    expect(headers.get('x-wendao-graph-limit')).toBe('20');
  });

  it('builds the canonical topology 3d descriptor path', () => {
    expect(buildTopology3DFlightDescriptor().path).toEqual([
      'topology',
      '3d',
    ]);
  });

  it('builds canonical topology 3d Flight metadata headers', () => {
    const headers = buildTopology3DFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
  });

  it('materializes graph neighbors through the canonical Flight route', async () => {
    const response = await loadGraphNeighborsFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        nodeId: 'main/docs/index.md',
        direction: 'both',
        hops: 1,
        limit: 20,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['graph', 'neighbors']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([1]),
                }),
              }],
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeGraphNeighbors: () => ({
          center: {
            id: 'main/docs/index.md',
            label: 'index.md',
            path: 'main/docs/index.md',
            navigationTarget: {
              path: 'main/docs/index.md',
              category: 'doc',
              projectName: 'main',
            },
            nodeType: 'doc',
            isCenter: true,
            distance: 0,
          },
          nodes: [{
            id: 'main/docs/index.md',
            label: 'index.md',
            path: 'main/docs/index.md',
            navigationTarget: {
              path: 'main/docs/index.md',
              category: 'doc',
              projectName: 'main',
            },
            nodeType: 'doc',
            isCenter: true,
            distance: 0,
          }],
          links: [],
          totalNodes: 1,
          totalLinks: 0,
        }),
      },
    );

    expect(response.center.path).toBe('main/docs/index.md');
    expect(response.totalNodes).toBe(1);
  });

  it('materializes topology 3d through the canonical Flight route', async () => {
    const response = await loadTopology3DFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['topology', '3d']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([1]),
                }),
              }],
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeTopology3D: () => ({
          nodes: [{
            id: 'main/docs/index.md',
            name: 'index.md',
            nodeType: 'doc',
            position: [0, 0, 0],
          }],
          links: [],
          clusters: [],
        }),
      },
    );

    expect(response.nodes[0]?.id).toBe('main/docs/index.md');
  });
});
