/**
 * Runtime package facade for downstream Wendao frontends.
 *
 * This entry point intentionally exposes protocol and transport helpers only;
 * it does not export Qianji Studio React components or application shell code.
 */
export {
  createWendaoRuntime,
  resolveWendaoRuntimeSchemaVersion,
  type WendaoRuntime,
  type WendaoRuntimeOptions,
  type WendaoRuntimeSearchOptions,
  type WendaoRuntimeKnowledgeSearchOptions,
  type WendaoRuntimeRepoSearchOptions,
  type WendaoRuntimeAttachmentSearchOptions,
  type WendaoRuntimeTransports,
} from "./wendaoRuntime";

export type {
  AstSearchResponse,
  AttachmentSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../api/bindings";

export type { FlightSearchProfile } from "../api/flightSearchTransport";
