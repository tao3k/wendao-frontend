import type { CodeAstSignaturePart } from "./codeAstAnatomy";

export function buildSignatureSnippet(contentLines: string[], line: number | undefined): string {
  if (!line || line <= 0 || contentLines.length === 0) {
    return "";
  }

  const startIndex = Math.max(0, Math.min(contentLines.length - 1, line - 1));
  const collected: string[] = [];

  for (let index = startIndex; index < contentLines.length && collected.length < 5; index += 1) {
    const current = contentLines[index].trimEnd();
    if (collected.length === 0 && current.trim().length === 0) {
      continue;
    }

    collected.push(current);

    const joined = collected.join("\n");
    if (collected.length >= 2 && (/[{;]\s*$/.test(current) || joined.includes("=>"))) {
      break;
    }
  }

  return collected.join("\n").trim();
}

function findTopLevelIndex(source: string, target: string): number {
  let parenDepth = 0;
  let angleDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1] ?? "";
    const previous = source[index - 1] ?? "";

    if (!doubleQuote && !templateQuote && current === "'" && previous !== "\\") {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== "\\") {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === "`" && previous !== "\\") {
      templateQuote = !templateQuote;
    }

    if (singleQuote || doubleQuote || templateQuote) {
      continue;
    }

    if (target === "=>" && current === "=" && next === ">") {
      if (parenDepth === 0 && angleDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
        return index;
      }
      continue;
    }

    if (current === target) {
      if (parenDepth === 0 && angleDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
        return index;
      }
    }

    switch (current) {
      case "(":
        parenDepth += 1;
        break;
      case ")":
        parenDepth = Math.max(0, parenDepth - 1);
        break;
      case "<":
        angleDepth += 1;
        break;
      case ">":
        angleDepth = Math.max(0, angleDepth - 1);
        break;
      case "[":
        squareDepth += 1;
        break;
      case "]":
        squareDepth = Math.max(0, squareDepth - 1);
        break;
      case "{":
        curlyDepth += 1;
        break;
      case "}":
        curlyDepth = Math.max(0, curlyDepth - 1);
        break;
      default:
        break;
    }
  }

  return -1;
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const items: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let angleDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[index - 1] ?? "";

    if (!doubleQuote && !templateQuote && current === "'" && previous !== "\\") {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== "\\") {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === "`" && previous !== "\\") {
      templateQuote = !templateQuote;
    }

    if (!singleQuote && !doubleQuote && !templateQuote) {
      switch (current) {
        case "(":
          parenDepth += 1;
          break;
        case ")":
          parenDepth = Math.max(0, parenDepth - 1);
          break;
        case "<":
          angleDepth += 1;
          break;
        case ">":
          angleDepth = Math.max(0, angleDepth - 1);
          break;
        case "[":
          squareDepth += 1;
          break;
        case "]":
          squareDepth = Math.max(0, squareDepth - 1);
          break;
        case "{":
          curlyDepth += 1;
          break;
        case "}":
          curlyDepth = Math.max(0, curlyDepth - 1);
          break;
        default:
          break;
      }
    }

    if (
      !singleQuote &&
      !doubleQuote &&
      !templateQuote &&
      parenDepth === 0 &&
      angleDepth === 0 &&
      squareDepth === 0 &&
      curlyDepth === 0 &&
      source.startsWith(delimiter, index)
    ) {
      items.push(source.slice(start, index).trim());
      start = index + delimiter.length;
      index = start - 1;
    }
  }

  const last = source.slice(start).trim();
  if (last) {
    items.push(last);
  }

  return items.filter((item) => item.length > 0);
}

function extractBalancedSegment(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string,
): { segment: string; closeIndex: number } | null {
  let depth = 0;
  let singleQuote = false;
  let doubleQuote = false;
  let templateQuote = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[index - 1] ?? "";

    if (!doubleQuote && !templateQuote && current === "'" && previous !== "\\") {
      singleQuote = !singleQuote;
    } else if (!singleQuote && !templateQuote && current === '"' && previous !== "\\") {
      doubleQuote = !doubleQuote;
    } else if (!singleQuote && !doubleQuote && current === "`" && previous !== "\\") {
      templateQuote = !templateQuote;
    }

    if (singleQuote || doubleQuote || templateQuote) {
      continue;
    }

    if (current === openChar) {
      depth += 1;
    } else if (current === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          segment: source.slice(openIndex + 1, index),
          closeIndex: index,
        };
      }
    }
  }

  return null;
}

function extractSignatureReturnType(signature: string, closeParenIndex: number): string | null {
  const tail = signature.slice(closeParenIndex + 1).trim();
  if (!tail) {
    return null;
  }

  const arrowIndex = findTopLevelIndex(tail, "=>");
  const braceIndex = findTopLevelIndex(tail, "{");
  const semicolonIndex = findTopLevelIndex(tail, ";");
  const endCandidates = [arrowIndex, braceIndex, semicolonIndex].filter((value) => value >= 0);
  const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : tail.length;

  const candidate = tail
    .slice(0, endIndex)
    .trim()
    .replace(/^(?:->|:)\s*/, "")
    .trim();
  return candidate.length > 0 ? candidate : null;
}

export function buildSignatureParts(signature: string): CodeAstSignaturePart[] {
  const normalized = signature.trim();
  if (!normalized) {
    return [];
  }

  const openIndex = normalized.indexOf("(");
  if (openIndex < 0) {
    return [];
  }

  const balanced = extractBalancedSegment(normalized, openIndex, "(", ")");
  if (!balanced) {
    return [];
  }

  const parts: CodeAstSignaturePart[] = [];
  const parameters = splitTopLevel(balanced.segment, ",");

  parameters.forEach((parameter, index) => {
    const trimmed = parameter.trim();
    if (!trimmed) {
      return;
    }

    const raw = trimmed.replace(/\s*=\s*.+$/, "").trim();
    const colonIndex = findTopLevelIndex(raw, ":");
    const hasTypedParameter = colonIndex >= 0;
    const name = hasTypedParameter ? raw.slice(0, colonIndex).trim() : raw;
    const type = hasTypedParameter ? raw.slice(colonIndex + 1).trim() : "";

    if (name) {
      parts.push({
        id: `param-name-${index}-${name}`,
        label: "param",
        value: name,
        query: name,
      });
    }

    if (type) {
      parts.push({
        id: `param-type-${index}-${type}`,
        label: "type",
        value: type,
        query: type,
      });
    } else if (!hasTypedParameter) {
      parts.push({
        id: `param-raw-${index}-${raw}`,
        label: "param",
        value: raw,
        query: raw,
      });
    }
  });

  const returnType = extractSignatureReturnType(normalized, balanced.closeIndex);
  if (returnType) {
    parts.push({
      id: `return-${returnType}`,
      label: "return",
      value: returnType,
      query: returnType,
    });
  }

  return parts;
}
