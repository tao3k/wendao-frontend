import {
  fetchControlPlaneHealthResponse,
  type ControlPlaneJsonTransportDeps,
} from './controlPlane/transport';

export type WorkspaceTransportDeps = ControlPlaneJsonTransportDeps;

export const fetchHealthResponse = fetchControlPlaneHealthResponse;
