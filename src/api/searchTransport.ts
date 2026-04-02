import { fetchJsonWithArrowHits } from './arrowSearchOverlay';

export function setTrimmedSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
): void {
  const normalized = value?.trim();
  if (normalized) {
    params.set(key, normalized);
  }
}

export function appendTrimmedSearchParams(
  params: URLSearchParams,
  key: string,
  values: string[] | null | undefined,
): void {
  values
    ?.map((value) => value.trim())
    .filter((value) => value.length > 0)
    .forEach((value) => params.append(key, value));
}

export function buildArrowBackedSearchUrls(
  basePath: string,
  params: URLSearchParams,
): { jsonUrl: string; arrowUrl: string } {
  const query = params.toString();
  if (!query) {
    return {
      jsonUrl: basePath,
      arrowUrl: `${basePath}/hits-arrow`,
    };
  }
  return {
    jsonUrl: `${basePath}?${query}`,
    arrowUrl: `${basePath}/hits-arrow?${query}`,
  };
}

export function fetchArrowBackedSearchResponse<TResponse, THit>(
  basePath: string,
  params: URLSearchParams,
  parseJsonResponse: (response: Response) => Promise<TResponse>,
  parseBinaryResponse: (response: Response) => Promise<ArrayBuffer>,
  decodeArrowHits: (buffer: ArrayBuffer) => THit[],
): Promise<TResponse> {
  const { jsonUrl, arrowUrl } = buildArrowBackedSearchUrls(basePath, params);
  return fetchJsonWithArrowHits(
    jsonUrl,
    arrowUrl,
    parseJsonResponse,
    parseBinaryResponse,
    decodeArrowHits,
  );
}
