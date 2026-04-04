import React from "react";

interface TopoBreadcrumbsProps {
  uri: string;
}

export const TopoBreadcrumbs: React.FC<TopoBreadcrumbsProps> = ({ uri }) => {
  // Protocol: wendao://repo/<ecosystem>/<repo_id>/<scope>/<module_path>/<entity_id>
  const parts = uri.replace("wendao://repo/", "").split("/");

  if (parts.length < 2) {
    return <span className="topo-uri-fallback">{uri}</span>;
  }

  const [ecosystem, repoId, scope, ...rest] = parts;
  const entityId = rest.pop();
  const modulePath = rest.join(" > ").replace(/:/g, " > ");

  return (
    <div className="topo-breadcrumbs" title={uri}>
      <span className="topo-segment ecosystem">{ecosystem}</span>
      <span className="topo-separator">/</span>
      <span className="topo-segment repo">{repoId}</span>
      {scope && (
        <>
          <span className="topo-separator">/</span>
          <span className="topo-segment scope">{scope}</span>
        </>
      )}
      {modulePath && (
        <>
          <span className="topo-separator">/</span>
          <span className="topo-segment module">{modulePath}</span>
        </>
      )}
      {entityId && (
        <>
          <span className="topo-separator">/</span>
          <span className="topo-segment entity">{entityId}</span>
        </>
      )}
    </div>
  );
};
