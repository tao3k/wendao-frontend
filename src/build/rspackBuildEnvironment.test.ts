import { describe, expect, it } from "vitest";

import {
  createGatewayProxyAgent,
  createRspackDevServer,
  createRspackPlugins,
  normalizeGatewayBind,
  resolveDaochangTargetFromEnv,
  resolveGatewayTargetFromEnv,
  resolveRspackBuildEnvironment,
} from "../../scripts/rspack/build-environment";

class PluginStub {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
  }
}

describe("normalizeGatewayBind", () => {
  it("adds an http scheme for bare host:port binds", () => {
    expect(normalizeGatewayBind("127.0.0.1:9517")).toBe("http://127.0.0.1:9517");
  });

  it("passes through explicit http urls", () => {
    expect(normalizeGatewayBind("http://127.0.0.1:9517")).toBe("http://127.0.0.1:9517");
  });
});

describe("resolveGatewayTargetFromEnv", () => {
  it("falls back to the frontend default gateway target", () => {
    expect(resolveGatewayTargetFromEnv({})).toBe("http://127.0.0.1:9517");
  });

  it("normalizes an explicit env override", () => {
    expect(resolveGatewayTargetFromEnv({ WENDAO_GATEWAY_TARGET: "127.0.0.1:9521" })).toBe(
      "http://127.0.0.1:9521",
    );
  });
});

describe("resolveRspackBuildEnvironment", () => {
  it("resolves gateway and daochang targets from env", () => {
    expect(
      resolveRspackBuildEnvironment({
        WENDAO_GATEWAY_TARGET: "127.0.0.1:9521",
        WENDAO_DAOCHANG_TARGET: "http://127.0.0.1:3001",
      }),
    ).toEqual({
      gatewayTarget: "http://127.0.0.1:9521",
      daochangTarget: "http://127.0.0.1:3001",
    });
  });

  it("keeps daochang disabled when no env override exists", () => {
    expect(resolveDaochangTargetFromEnv({})).toBeNull();
  });
});

describe("createRspackPlugins", () => {
  it("builds html plus react refresh in dev", () => {
    const plugins = createRspackPlugins({
      isDev: true,
      constructors: {
        HtmlRspackPlugin: PluginStub,
        ReactRefreshRspackPlugin: PluginStub,
      },
    }) as PluginStub[];

    expect(plugins).toHaveLength(2);
    expect(plugins[0]?.options).toEqual({ template: "./index.html" });
    expect(plugins[1]?.options).toBeUndefined();
  });
});

describe("createRspackDevServer", () => {
  it("builds the shared development proxy surface", () => {
    const devServer = createRspackDevServer({
      isDev: true,
      gatewayTarget: "http://127.0.0.1:9517",
    });
    const gatewayProxy = devServer?.proxy?.[0];
    const flightProxy = devServer?.proxy?.[1];

    expect(gatewayProxy).toMatchObject({
      context: ["/api"],
      target: "http://127.0.0.1:9517",
      changeOrigin: true,
      proxyTimeout: 30_000,
      timeout: 30_000,
    });
    expect(flightProxy).toMatchObject({
      context: ["/arrow.flight.protocol.FlightService"],
      target: "http://127.0.0.1:9517",
      changeOrigin: true,
      proxyTimeout: 30_000,
      timeout: 30_000,
    });
    expect(gatewayProxy?.agent).toBeInstanceOf(Object);
    expect(devServer).toMatchObject({
      hot: true,
      historyApiFallback: true,
      static: {
        directory: ".",
        publicPath: "/",
        watch: false,
      },
    });
  });

  it("returns undefined outside development mode", () => {
    expect(
      createRspackDevServer({
        isDev: false,
        gatewayTarget: "http://127.0.0.1:9517",
      }),
    ).toBeUndefined();
  });
});

describe("createGatewayProxyAgent", () => {
  it("enables keep-alive pooling for proxied gateway requests", () => {
    const agent = createGatewayProxyAgent();

    expect(agent.keepAlive).toBe(true);
    expect(agent.maxSockets).toBe(32);
    expect(agent.maxFreeSockets).toBe(8);
    expect(agent.keepAliveMsecs).toBe(1_000);
    agent.destroy();
  });
});
