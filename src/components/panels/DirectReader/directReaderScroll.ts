export function scrollSourceLineIntoView(targetLine: Element | undefined): void {
  targetLine?.scrollIntoView?.({ block: "center" });
}
