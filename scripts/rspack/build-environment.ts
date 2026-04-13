import { Agent } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as TOML from "smol-toml";

interface GatewaySection {
  bind?: string;
}

interface DaochangSection {
  bind?: string;
}

interface WendaoConfig {
  gateway?: GatewaySection;
  daochang?: DaochangSection;
}

type ReadTextFile = (filePath: string, encoding: BufferEncoding) => string;

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

const GATEWAY_PROXY_KEEPALIVE_MSECS = 1_000;
const GATEWAY_PROXY_MAX_SOCKETS = 32;
const GATEWAY_PROXY_MAX_FREE_SOCKETS = 8;
const GATEWAY_PROXY_TIMEOUT_MSECS = 30_000;

interface RspackPluginConstructors {
  HtmlRspackPlugin: PluginConstructor;
  CopyRspackPlugin: PluginConstructor;
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

export function parseGatewayTargetFromToml(tomlContent: string): string {
  const parsed = TOML.parse(tomlContent) as WendaoConfig;
  const target = normalizeGatewayBind(parsed?.gateway?.bind);

  if (!target) {
    throw new Error("Rspack requires [gateway].bind in wendao.toml");
  }

  return target;
}

export function parseDaochangTargetFromToml(tomlContent: string): string | null {
  const parsed = TOML.parse(tomlContent) as WendaoConfig;
  return normalizeGatewayBind(parsed?.daochang?.bind);
}

export function resolveDaochangTargetFromCwd({
  cwd = process.cwd(),
  readTextFile = (filePath, encoding) => readFileSync(filePath, encoding),
}: {
  cwd?: string;
  readTextFile?: ReadTextFile;
} = {}): string | null {
  try {
    const tomlContent = readTextFile(resolve(cwd, "wendao.toml"), "utf8");
    return parseDaochangTargetFromToml(tomlContent);
  } catch {
    return null;
  }
}

export function resolveGatewayTargetFromCwd({
  cwd = process.cwd(),
  readTextFile = (filePath, encoding) => readFileSync(filePath, encoding),
}: {
  cwd?: string;
  readTextFile?: ReadTextFile;
} = {}): string {
  try {
    const tomlContent = readTextFile(resolve(cwd, "wendao.toml"), "utf8");
    return parseGatewayTargetFromToml(tomlContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Rspack could not resolve gateway target from wendao.toml: ${message}`, {
      cause: error,
    });
  }
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
    new constructors.CopyRspackPlugin({
      patterns: [{ from: "wendao.toml", to: "wendao.toml" }],
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
  /** Daochang agent gateway target for /vercel/* streaming. Omit to disable chat proxy. */
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
