import { describe, expect, it } from 'vitest';

import {
  createGatewayProxyAgent,
  createRspackDevServer,
  createRspackPlugins,
  normalizeGatewayBind,
  parseGatewayTargetFromToml,
  resolveGatewayTargetFromCwd,
} from '../../scripts/rspack/build-environment';

class PluginStub {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
  }
}

describe('normalizeGatewayBind', () => {
  it('adds an http scheme for bare host:port binds', () => {
    expect(normalizeGatewayBind('127.0.0.1:9517')).toBe('http://127.0.0.1:9517');
  });

  it('passes through explicit http urls', () => {
    expect(normalizeGatewayBind('http://127.0.0.1:9517')).toBe('http://127.0.0.1:9517');
  });
});

describe('parseGatewayTargetFromToml', () => {
  it('reads the gateway bind from toml', () => {
    expect(
      parseGatewayTargetFromToml(`
[gateway]
bind = "127.0.0.1:9517"
`),
    ).toBe('http://127.0.0.1:9517');
  });

  it('rejects missing binds', () => {
    expect(() => parseGatewayTargetFromToml('[gateway]\n')).toThrow(
      'Rspack requires [gateway].bind in wendao.toml',
    );
  });
});

describe('resolveGatewayTargetFromCwd', () => {
  it('wraps read errors with the shared rspack message', () => {
    expect(() =>
      resolveGatewayTargetFromCwd({
        cwd: '/tmp/project',
        readTextFile: () => {
          throw new Error('ENOENT');
        },
      }),
    ).toThrow('Rspack could not resolve gateway target from wendao.toml: ENOENT');
  });
});

describe('createRspackPlugins', () => {
  it('builds html and copy plugins plus react refresh in dev', () => {
    const plugins = createRspackPlugins({
      isDev: true,
      constructors: {
        HtmlRspackPlugin: PluginStub,
        CopyRspackPlugin: PluginStub,
        ReactRefreshRspackPlugin: PluginStub,
      },
    }) as PluginStub[];

    expect(plugins).toHaveLength(3);
    expect(plugins[0]?.options).toEqual({ template: './index.html' });
    expect(plugins[1]?.options).toEqual({
      patterns: [{ from: 'wendao.toml', to: 'wendao.toml' }],
    });
    expect(plugins[2]?.options).toBeUndefined();
  });
});

describe('createRspackDevServer', () => {
  it('builds the shared development proxy surface', () => {
    const devServer = createRspackDevServer({
      isDev: true,
      gatewayTarget: 'http://127.0.0.1:9517',
    });
    const gatewayProxy = devServer?.proxy?.[0];
    const flightProxy = devServer?.proxy?.[1];

    expect(gatewayProxy).toMatchObject({
      context: ['/api'],
      target: 'http://127.0.0.1:9517',
      changeOrigin: true,
      proxyTimeout: 15_000,
      timeout: 15_000,
    });
    expect(flightProxy).toMatchObject({
      context: ['/arrow.flight.protocol.FlightService'],
      target: 'http://127.0.0.1:9517',
      changeOrigin: true,
      proxyTimeout: 15_000,
      timeout: 15_000,
    });
    expect(gatewayProxy?.agent).toBeInstanceOf(Object);
    expect(devServer).toMatchObject({
      hot: true,
      historyApiFallback: true,
      static: {
        directory: '.',
        publicPath: '/',
        watch: false,
      },
    });
  });

  it('returns undefined outside development mode', () => {
    expect(
      createRspackDevServer({
        isDev: false,
        gatewayTarget: 'http://127.0.0.1:9517',
      }),
    ).toBeUndefined();
  });
});

describe('createGatewayProxyAgent', () => {
  it('enables keep-alive pooling for proxied gateway requests', () => {
    const agent = createGatewayProxyAgent();

    expect(agent.keepAlive).toBe(true);
    expect(agent.maxSockets).toBe(32);
    expect(agent.maxFreeSockets).toBe(8);
    expect(agent.keepAliveMsecs).toBe(1_000);
    agent.destroy();
  });
});
