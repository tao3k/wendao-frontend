import type { SearchSelectionActionDecision, SearchSelectionActionResult } from "./types";

function isPromiseLike(
  value: SearchSelectionActionResult,
): value is Promise<SearchSelectionActionDecision> {
  return typeof value === "object" && value !== null && "then" in value;
}

export function shouldCloseAfterSelection(decision: SearchSelectionActionDecision): boolean {
  return decision !== false;
}

export function closeAfterSelection(
  result: SearchSelectionActionResult,
  onClose: () => void,
): void {
  if (isPromiseLike(result)) {
    void result
      .then((decision) => {
        if (shouldCloseAfterSelection(decision)) {
          onClose();
        }
        return decision;
      })
      .catch(() => undefined);
    return;
  }

  if (shouldCloseAfterSelection(result)) {
    onClose();
  }
}
