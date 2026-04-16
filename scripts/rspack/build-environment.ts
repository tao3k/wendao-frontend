import { Agent } from "node:http";

type PluginConstructor = new (options?: unknown) => unknown;
type RspackStaticConfig = {
  directory: string;
  publicPath: string;
  watch: boolean;
};

export interface GatewayProxyAgent extends Agent {
  keepAlive: boolean;
  keepAliveMsecs: number;
  maxSockets: number;
  maxFreeSockets: number;
}

export interface RspackProxyEntry {
  context: string[];
  target: string;
  changeOrigin: boolean;
  agent: GatewayProxyAgent;
  proxyTimeout: number;
  timeout: number;
}

export interface RspackDevServerConfig {
  proxy: RspackProxyEntry[];
  hot: true;
  historyApiFallback: true;
  static: RspackStaticConfig;
}

export interface RspackBuildEnvironment {
  gatewayTarget: string;
  daochangTarget: string | null;
}

const GATEWAY_PROXY_KEEPALIVE_MSECS = 1_000;
const GATEWAY_PROXY_MAX_SOCKETS = 32;
const GATEWAY_PROXY_MAX_FREE_SOCKETS = 8;
const GATEWAY_PROXY_TIMEOUT_MSECS = 30_000;
const DEFAULT_GATEWAY_TARGET = "http://127.0.0.1:9517";

interface RspackPluginConstructors {
  HtmlRspackPlugin: PluginConstructor;
  ReactRefreshRspackPlugin?: PluginConstructor;
}

export function normalizeGatewayBind(bind: string | undefined): string | null {
  if (!bind) {
    return null;
  }

  const trimmed = bind.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

export function resolveGatewayTargetFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return normalizeGatewayBind(env.WENDAO_GATEWAY_TARGET) ?? DEFAULT_GATEWAY_TARGET;
}

export function resolveDaochangTargetFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  return normalizeGatewayBind(env.WENDAO_DAOCHANG_TARGET);
}

export function resolveRspackBuildEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): RspackBuildEnvironment {
  return {
    gatewayTarget: resolveGatewayTargetFromEnv(env),
    daochangTarget: resolveDaochangTargetFromEnv(env),
  };
}

export function createRspackPlugins({
  isDev,
  constructors,
}: {
  isDev: boolean;
  constructors: RspackPluginConstructors;
}): unknown[] {
  const plugins = [
    new constructors.HtmlRspackPlugin({
      template: "./index.html",
    }),
  ];

  if (isDev && constructors.ReactRefreshRspackPlugin) {
    plugins.push(new constructors.ReactRefreshRspackPlugin());
  }

  return plugins;
}

export function createGatewayProxyAgent(): GatewayProxyAgent {
  return new Agent({
    keepAlive: true,
    keepAliveMsecs: GATEWAY_PROXY_KEEPALIVE_MSECS,
    maxSockets: GATEWAY_PROXY_MAX_SOCKETS,
    maxFreeSockets: GATEWAY_PROXY_MAX_FREE_SOCKETS,
    scheduling: "lifo",
  }) as GatewayProxyAgent;
}

export function createRspackDevServer({
  isDev,
  gatewayTarget,
  daochangTarget,
}: {
  isDev: boolean;
  gatewayTarget: string;
  daochangTarget?: string | null;
}): RspackDevServerConfig | undefined {
  if (!isDev) {
    return undefined;
  }

  const gatewayProxyAgent = createGatewayProxyAgent();

  return {
    proxy: [
      {
        context: ["/api"],
        target: gatewayTarget,
        changeOrigin: true,
        agent: gatewayProxyAgent,
        proxyTimeout: GATEWAY_PROXY_TIMEOUT_MSECS,
        timeout: GATEWAY_PROXY_TIMEOUT_MSECS,
      },
      {
        context: ["/arrow.flight.protocol.FlightService"],
        target: gatewayTarget,
        changeOrigin: true,
        agent: gatewayProxyAgent,
        proxyTimeout: GATEWAY_PROXY_TIMEOUT_MSECS,
        timeout: GATEWAY_PROXY_TIMEOUT_MSECS,
      },
      ...(daochangTarget
        ? [
            {
              context: ["/vercel"],
              target: daochangTarget,
              changeOrigin: true,
              agent: gatewayProxyAgent,
              proxyTimeout: GATEWAY_PROXY_TIMEOUT_MSECS,
              timeout: GATEWAY_PROXY_TIMEOUT_MSECS,
            },
          ]
        : []),
    ],
    hot: true,
    historyApiFallback: true,
    static: {
      directory: ".",
      publicPath: "/",
      watch: false,
    },
  };
}
