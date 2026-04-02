import { ARROW_RETRIEVAL_CONTENT_TYPE } from './arrowRetrievalIpc';

export async function fetchJsonWithArrowHits<TResponse extends { hits: THit[] }, THit>(
  jsonUrl: string,
  arrowUrl: string,
  loadJson: (response: Response) => Promise<TResponse>,
  loadBinary: (response: Response) => Promise<ArrayBuffer>,
  decodeArrow: (payload: ArrayBuffer) => THit[]
): Promise<TResponse> {
  const [jsonResult, arrowResult] = await Promise.allSettled([
    fetch(jsonUrl).then(loadJson),
    fetch(arrowUrl, {
      headers: { Accept: ARROW_RETRIEVAL_CONTENT_TYPE },
    }).then(loadBinary).then(decodeArrow),
  ]);

  if (jsonResult.status !== 'fulfilled') {
    throw jsonResult.reason;
  }

  return arrowResult.status === 'fulfilled'
    ? { ...jsonResult.value, hits: arrowResult.value }
    : jsonResult.value;
}
