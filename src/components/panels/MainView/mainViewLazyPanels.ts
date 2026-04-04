import { lazy } from "react";

const loadGraphView = () => import("../GraphView");
const loadDirectReader = () => import("../DirectReader");
const loadDiagramWindow = () => import("../DiagramWindow");

export const mainViewPanelLoaders = {
  diagram: loadDiagramWindow,
  graph: loadGraphView,
  content: loadDirectReader,
} as const;

export const GraphView = lazy(async () => {
  const module = await loadGraphView();
  return { default: module.GraphView };
});

export const DirectReader = lazy(async () => {
  const module = await loadDirectReader();
  return { default: module.DirectReader };
});

export const DiagramWindow = lazy(async () => {
  const module = await loadDiagramWindow();
  return { default: module.DiagramWindow };
});
