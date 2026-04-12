import { buildAstBackedStructuredProjection } from "./shared";
import type { LanguageProjectionInput } from "./types";

const MODELICA_PRIORITY: Record<string, number> = {
  package: 0,
  model: 1,
  block: 2,
  connector: 3,
  type: 4,
  function: 5,
  constant: 6,
  parameter: 7,
  equation: 8,
  extends: 9,
  import: 10,
  importmodule: 10,
  importsymbol: 10,
  validation: 11,
  execution: 12,
  return: 13,
  externalsymbol: 14,
};

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "other";
}

function semanticPriority(value: string | undefined): number {
  return MODELICA_PRIORITY[normalizeKey(value)] ?? 99;
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

export function deriveModelicaLanguageProjection(input: LanguageProjectionInput) {
  const projection = buildAstBackedStructuredProjection({
    ...input,
    language: input.language ?? "modelica",
  });
  const outline = projection.outline.toSorted((left, right) => {
    const delta = semanticPriority(left.semanticType) - semanticPriority(right.semanticType);
    if (delta !== 0) {
      return delta;
    }

    return left.value.localeCompare(right.value);
  });
  const fragments = projection.fragments
    .toSorted((left, right) => {
      const delta = semanticPriority(left.semanticType) - semanticPriority(right.semanticType);
      if (delta !== 0) {
        return delta;
      }

      return left.label.localeCompare(right.label);
    })
    .flatMap((fragment) => {
      const enrichedFragment = {
        ...fragment,
        detail: appendDetail(fragment.detail, [
          attributeValue(fragment.attributes, "visibility"),
          attributeValue(fragment.attributes, "variability"),
          attributeValue(fragment.attributes, "component_kind"),
          attributeValue(fragment.attributes, "type_name"),
          attributeValue(fragment.attributes, "direction"),
          attributeValue(fragment.attributes, "import_kind"),
          attributeValue(fragment.attributes, "dependency_form"),
          attributeValue(fragment.attributes, "dependency_alias")
            ? `alias=${attributeValue(fragment.attributes, "dependency_alias")}`
            : undefined,
          attributeValue(fragment.attributes, "source_module"),
          attributeValue(fragment.attributes, "target_package")
            ? `package=${attributeValue(fragment.attributes, "target_package")}`
            : undefined,
          attributeValue(fragment.attributes, "unit")
            ? `unit=${attributeValue(fragment.attributes, "unit")}`
            : undefined,
          attributeValue(fragment.attributes, "owner_path")
            ? `owner=${attributeValue(fragment.attributes, "owner_path")}`
            : undefined,
        ]),
      };
      const equationLatex = attributeValue(fragment.attributes, "equation_latex");
      if (!equationLatex) {
        return [enrichedFragment];
      }
      const ownerName =
        attributeValue(fragment.attributes, "owner_name") ??
        attributeValue(fragment.attributes, "class_name") ??
        fragment.label;
      return [
        enrichedFragment,
        {
          kind: "math" as const,
          label: `equation · ${ownerName}`,
          value: equationLatex,
          query: attributeValue(fragment.attributes, "owner_path") ?? fragment.query,
          language: "modelica",
          detail: appendDetail("equation · modelica", [
            attributeValue(fragment.attributes, "restriction"),
            attributeValue(fragment.attributes, "component_kind"),
          ]),
          semanticType: "equation",
          surface: "equation",
          attributes: fragment.attributes,
        },
      ];
    });
  const saliencyFragment =
    fragments.find((fragment) => normalizeKey(fragment.semanticType) === "equation") ??
    fragments[0];

  return {
    ...projection,
    outline,
    fragments,
    saliencyExcerpt: saliencyFragment?.value ?? projection.saliencyExcerpt,
  };
}
