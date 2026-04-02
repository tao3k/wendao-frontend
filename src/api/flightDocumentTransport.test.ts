import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from './flight/generated/Flight_pb';
import {
  buildAutocompleteFlightHeaders,
  buildDefinitionFlightHeaders,
  buildDocumentFlightDescriptor,
  resolveDefinitionFlight,
  searchAutocompleteFlight,
} from './flightDocumentTransport';

describe('flightDocumentTransport', () => {
  it('builds canonical semantic descriptor paths', () => {
    expect(buildDocumentFlightDescriptor('/search/definition').path).toEqual([
      'search',
      'definition',
    ]);
    expect(buildDocumentFlightDescriptor('/search/autocomplete').path).toEqual([
      'search',
      'autocomplete',
    ]);
  });

  it('builds the canonical definition Flight metadata headers', () => {
    const headers = buildDefinitionFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      query: 'AlphaService',
      path: 'kernel/src/lib.rs',
      line: 7,
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-definition-query')).toBe('AlphaService');
    expect(headers.get('x-wendao-definition-path')).toBe('kernel/src/lib.rs');
    expect(headers.get('x-wendao-definition-line')).toBe('7');
  });

  it('builds the canonical autocomplete Flight metadata headers', () => {
    const headers = buildAutocompleteFlightHeaders({
      baseUrl: 'http://127.0.0.1:9517',
      schemaVersion: 'v2',
      prefix: 'Alpha',
      limit: 0,
    });

    expect(headers.get('x-wendao-schema-version')).toBe('v2');
    expect(headers.get('x-wendao-autocomplete-prefix')).toBe('Alpha');
    expect(headers.get('x-wendao-autocomplete-limit')).toBe('1');
  });

  it('materializes definition responses through the canonical Flight route', async () => {
    const response = await resolveDefinitionFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        query: 'AlphaService',
        path: 'kernel/src/lib.rs',
        line: 7,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['search', 'definition']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([1]),
                }),
              }],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  query: 'AlphaService',
                  sourcePath: 'kernel/src/lib.rs',
                  sourceLine: 7,
                  candidateCount: 2,
                  selectedScope: 'definition',
                  navigationTarget: {
                    path: 'kernel/src/service.rs',
                    category: 'code',
                    projectName: 'kernel',
                    line: 11,
                  },
                }),
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
        decodeDefinitionHits: () => [{
          name: 'AlphaService',
          signature: 'pub struct AlphaService',
          path: 'kernel/src/service.rs',
          language: 'rust',
          crateName: 'kernel',
          projectName: 'kernel',
          rootLabel: 'main',
          navigationTarget: {
            path: 'kernel/src/service.rs',
            category: 'code',
            projectName: 'kernel',
            line: 11,
          },
          lineStart: 11,
          lineEnd: 13,
          score: 0.97,
        }],
      },
    );

    expect(response.query).toBe('AlphaService');
    expect(response.sourcePath).toBe('kernel/src/lib.rs');
    expect(response.sourceLine).toBe(7);
    expect(response.candidateCount).toBe(2);
    expect(response.selectedScope).toBe('definition');
    expect(response.definition.path).toBe('kernel/src/service.rs');
    expect(response.navigationTarget?.path).toBe('kernel/src/service.rs');
  });

  it('materializes autocomplete responses through the canonical Flight route', async () => {
    const response = await searchAutocompleteFlight(
      {
        baseUrl: 'http://127.0.0.1:9517',
        schemaVersion: 'v2',
        prefix: 'Alpha',
        limit: 5,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(['search', 'autocomplete']);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [{
                ticket: create(TicketSchema, {
                  ticket: new Uint8Array([1]),
                }),
              }],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  prefix: 'Alpha',
                }),
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
        decodeAutocompleteSuggestions: () => [{
          text: 'AlphaService',
          suggestionType: 'stem',
        }],
      },
    );

    expect(response.prefix).toBe('Alpha');
    expect(response.suggestions).toEqual([{
      text: 'AlphaService',
      suggestionType: 'stem',
    }]);
  });
});
