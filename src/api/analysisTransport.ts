import { ARROW_RETRIEVAL_CONTENT_TYPE } from './arrowRetrievalIpc';

export interface AnalysisTransportDeps {
  apiBase: string;
  handleBinaryResponse: (response: Response) => Promise<ArrayBuffer>;
  fetchImpl?: typeof fetch;
}

export interface AnalysisPathOptions {
  path: string;
  repo?: string;
  line?: number;
}

function buildAnalysisParams(options: AnalysisPathOptions): URLSearchParams {
  const params = new URLSearchParams({ path: options.path });
  const repo = options.repo?.trim();
  if (repo) {
    params.set('repo', repo);
  }
  if (typeof options.line === 'number' && Number.isFinite(options.line) && options.line > 0) {
    params.set('line', String(Math.floor(options.line)));
  }
  return params;
}

function buildAnalysisUrl(apiBase: string, endpoint: string, options: AnalysisPathOptions): string {
  return `${apiBase}${endpoint}?${buildAnalysisParams(options)}`;
}

export function fetchAnalysisJson<TResponse>(
  deps: AnalysisTransportDeps,
  endpoint: string,
  options: AnalysisPathOptions,
): Promise<Response> {
  return (deps.fetchImpl ?? fetch)(buildAnalysisUrl(deps.apiBase, endpoint, options));
}

export async function fetchAnalysisArrow(
  deps: AnalysisTransportDeps,
  endpoint: string,
  options: AnalysisPathOptions,
): Promise<ArrayBuffer> {
  const response = await (deps.fetchImpl ?? fetch)(buildAnalysisUrl(deps.apiBase, endpoint, options), {
    headers: { Accept: ARROW_RETRIEVAL_CONTENT_TYPE },
  });
  return deps.handleBinaryResponse(response);
}
