import { buildAstBackedStructuredProjection } from "./shared";
import type { LanguageProjectionInput } from "./types";

const JULIA_PRIORITY: Record<string, number> = {
  module: 0,
  function: 1,
  macro: 2,
  type: 3,
  constant: 4,
  binding: 5,
  externalsymbol: 6,
  validation: 7,
  execution: 8,
  return: 9,
};

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "other";
}

function semanticPriority(value: string | undefined): number {
  return JULIA_PRIORITY[normalizeKey(value)] ?? 99;
}

function attributeValue(
  attributes: Record<string, string> | undefined,
  key: string,
): string | undefined {
  const value = attributes?.[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function appendDetail(
  detail: string | undefined,
  extras: Array<string | undefined>,
): string | undefined {
  const parts = [detail, ...extras].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function deriveJuliaLanguageProjection(input: LanguageProjectionInput) {
  const projection = buildAstBackedStructuredProjection({
    ...input,
    language: input.language ?? "julia",
  });
  const sortedOutline = projection.outline.toSorted((left, right) => {
    const delta = semanticPriority(left.semanticType) - semanticPriority(right.semanticType);
    if (delta !== 0) {
      return delta;
    }

    return left.value.localeCompare(right.value);
  });
  const sortedFragments = projection.fragments
    .toSorted((left, right) => {
      const delta = semanticPriority(left.semanticType) - semanticPriority(right.semanticType);
      if (delta !== 0) {
        return delta;
      }

      return left.label.localeCompare(right.label);
    })
    .map((fragment) => {
      return {
        id: fragment.id,
        label: fragment.label,
        value: fragment.value,
        detail: appendDetail(fragment.detail, [
          attributeValue(fragment.attributes, "binding_kind"),
          attributeValue(fragment.attributes, "type_kind"),
          attributeValue(fragment.attributes, "parameter_kind"),
          attributeValue(fragment.attributes, "function_return_type"),
          attributeValue(fragment.attributes, "top_level") === "true" ? "top-level" : undefined,
          attributeValue(fragment.attributes, "owner_path")
            ? `owner=${attributeValue(fragment.attributes, "owner_path")}`
            : undefined,
        ]),
        semanticType: fragment.semanticType,
        kind: fragment.kind,
        line: fragment.line,
        path: fragment.path,
        attributes: fragment.attributes,
        atom: fragment.atom,
      };
    });
  const saliencyFragment =
    sortedFragments.find((fragment) => {
      const semanticType = normalizeKey(fragment.semanticType);
      return semanticType === "function" || semanticType === "macro" || semanticType === "type";
    }) ?? sortedFragments[0];

  return {
    ...projection,
    outline: sortedOutline,
    fragments: sortedFragments,
    saliencyExcerpt: saliencyFragment?.value ?? projection.saliencyExcerpt,
  };
}
