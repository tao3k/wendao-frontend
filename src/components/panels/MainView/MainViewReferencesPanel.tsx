import React from "react";
import type { MainViewCopy } from "./mainViewCopy";
import type { MainViewRelationship, MainViewSelectedFile } from "./mainViewProps";

interface MainViewReferencesPanelProps {
  selectedFile?: MainViewSelectedFile | null;
  relationships: MainViewRelationship[];
  copy: Pick<
    MainViewCopy,
    | "navigator"
    | "referencesTitle"
    | "referencesHintWithFile"
    | "referencesHintWithoutFile"
    | "focusedFile"
    | "project"
    | "root"
    | "noReferences"
    | "noReferencesFile"
  >;
}

export function MainViewReferencesPanel({
  selectedFile,
  relationships,
  copy,
}: MainViewReferencesPanelProps): React.ReactElement {
  return (
    <div className="main-view-references">
      <div className="main-view-panel-intro">
        <span className="main-view-panel-kicker">{copy.navigator}</span>
        <h4>{copy.referencesTitle}</h4>
        <p>{selectedFile ? copy.referencesHintWithFile : copy.referencesHintWithoutFile}</p>
      </div>
      {selectedFile ? (
        <div className="references-list">
          <div className="references-card">
            <span className="references-label">{copy.focusedFile}</span>
            {(selectedFile.projectName || selectedFile.rootLabel) && (
              <div className="references-meta">
                {selectedFile.projectName && (
                  <span className="references-meta-badge project">
                    {copy.project}: {selectedFile.projectName}
                  </span>
                )}
                {selectedFile.rootLabel && (
                  <span className="references-meta-badge root">
                    {copy.root}: {selectedFile.rootLabel}
                  </span>
                )}
              </div>
            )}
            <code className="references-path">{selectedFile.path}</code>
          </div>
          {relationships.length > 0 ? (
            <div className="references-relationships">
              {relationships.map((relationship, index) => {
                const counterpart =
                  relationship.from === selectedFile.path ? relationship.to : relationship.from;

                return (
                  <div
                    className="reference-row"
                    key={`${relationship.from ?? "unknown"}-${relationship.to ?? "unknown"}-${index}`}
                  >
                    <span className={`reference-direction reference-${relationship.type}`}>
                      {relationship.type}
                    </span>
                    <code className="reference-target">{counterpart ?? selectedFile.path}</code>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-references">{copy.noReferences}</p>
          )}
        </div>
      ) : (
        <div className="no-file-selected">{copy.noReferencesFile}</div>
      )}
    </div>
  );
}
