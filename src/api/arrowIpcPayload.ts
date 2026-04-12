export type ArrowIpcPayload = ArrayBuffer | Uint8Array<ArrayBufferLike>;

export function isArrowIpcPayloadEmpty(payload: ArrowIpcPayload): boolean {
  return payload.byteLength === 0;
}
