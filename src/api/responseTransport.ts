import type { ApiError } from "./bindings";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new ApiClientError(error.code, error.message, error.details);
  }
  return response.json();
}

export async function handleBinaryResponse(response: Response): Promise<ArrayBuffer> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new ApiClientError(error.code, error.message, error.details);
  }
  return response.arrayBuffer();
}

export async function handleTextResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new ApiClientError(error.code, error.message, error.details);
  }
  return response.text();
}
