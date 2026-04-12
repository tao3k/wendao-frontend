const SVG_STYLE_PROPERTIES_TO_STRIP = new Set(["max-width", "width", "height"]);

function normalizeSvgStyle(style: string | null): string | null {
  if (!style) {
    return null;
  }

  const nextDeclarations = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const [propertyName] = declaration.split(":");
      return !SVG_STYLE_PROPERTIES_TO_STRIP.has(propertyName.trim().toLowerCase());
    });

  return nextDeclarations.length > 0 ? nextDeclarations.join("; ") : null;
}

function parseViewBoxDimensions(viewBox: string | null): { width: number; height: number } | null {
  if (!viewBox) {
    return null;
  }

  const values = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value));

  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }

  const [, , width, height] = values;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function isRelativeSvgSize(value: string | null): boolean {
  return value?.includes("%") ?? false;
}

export function normalizeMermaidSvgForViewport(svgMarkup: string): string {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svgMarkup;
  }

  const document = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svg = document.documentElement;
  if (svg.nodeName.toLowerCase() !== "svg") {
    return svgMarkup;
  }

  const normalizedStyle = normalizeSvgStyle(svg.getAttribute("style"));
  if (normalizedStyle) {
    svg.setAttribute("style", normalizedStyle);
  } else {
    svg.removeAttribute("style");
  }

  const dimensions = parseViewBoxDimensions(svg.getAttribute("viewBox"));
  if (dimensions) {
    if (!svg.getAttribute("width") || isRelativeSvgSize(svg.getAttribute("width"))) {
      svg.setAttribute("width", String(dimensions.width));
    }

    if (!svg.getAttribute("height") || isRelativeSvgSize(svg.getAttribute("height"))) {
      svg.setAttribute("height", String(dimensions.height));
    }
  } else {
    if (isRelativeSvgSize(svg.getAttribute("width"))) {
      svg.removeAttribute("width");
    }

    if (isRelativeSvgSize(svg.getAttribute("height"))) {
      svg.removeAttribute("height");
    }
  }

  if (!svg.hasAttribute("preserveAspectRatio")) {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  return new XMLSerializer().serializeToString(svg);
}
