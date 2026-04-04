import React from "react";
import type { CodeFilterPrefix, SearchFilters } from "./codeSearchUtils";
import type { SearchBarCopy, UiLocale } from "./types";

interface CodeFilterHelperProps {
  copy: SearchBarCopy;
  locale: UiLocale;
  prefixes: readonly CodeFilterPrefix[];
  exampleTokens: string[];
  scenarios: Array<{ id: string; label: string; tokens: string[] }>;
  activeEntries: Array<{ key: keyof SearchFilters; label: string }>;
  onInsertPrefix: (prefix: CodeFilterPrefix) => void;
  onApplyExample: (token: string) => void;
  onApplyScenario: (tokens: string[]) => void;
  onRemoveFilter: (key: keyof SearchFilters, label: string) => void;
  onClearFilters: () => void;
}

interface CodeFilterActionButtonProps {
  className: string;
  title: string;
  onClick: () => void;
}

const CodeFilterActionButton = React.memo(function CodeFilterActionButton({
  className,
  title,
  onClick,
}: CodeFilterActionButtonProps): React.ReactElement {
  return (
    <button type="button" className={className} onClick={onClick}>
      {title}
    </button>
  );
});

interface CodeFilterPrefixButtonProps {
  prefix: CodeFilterPrefix;
  onInsertPrefix: (prefix: CodeFilterPrefix) => void;
}

const CodeFilterPrefixButton = React.memo(function CodeFilterPrefixButton({
  prefix,
  onInsertPrefix,
}: CodeFilterPrefixButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onInsertPrefix(prefix);
  }, [onInsertPrefix, prefix]);

  return (
    <CodeFilterActionButton
      className="search-code-filter-helper-btn"
      onClick={handleClick}
      title={`${prefix}:`}
    />
  );
});

interface CodeFilterTokenButtonProps {
  token: string;
  onApplyExample: (token: string) => void;
}

const CodeFilterTokenButton = React.memo(function CodeFilterTokenButton({
  token,
  onApplyExample,
}: CodeFilterTokenButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onApplyExample(token);
  }, [onApplyExample, token]);

  return (
    <CodeFilterActionButton
      className="search-code-filter-helper-btn example"
      onClick={handleClick}
      title={token}
    />
  );
});

interface CodeFilterScenarioButtonProps {
  scenario: { id: string; label: string; tokens: string[] };
  onApplyScenario: (tokens: string[]) => void;
}

const CodeFilterScenarioButton = React.memo(function CodeFilterScenarioButton({
  scenario,
  onApplyScenario,
}: CodeFilterScenarioButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onApplyScenario(scenario.tokens);
  }, [onApplyScenario, scenario.tokens]);

  return (
    <CodeFilterActionButton
      className="search-code-filter-helper-btn scenario"
      onClick={handleClick}
      title={scenario.label}
    />
  );
});

interface CodeFilterChipButtonProps {
  entry: { key: keyof SearchFilters; label: string };
  onRemoveFilter: (key: keyof SearchFilters, label: string) => void;
}

const CodeFilterChipButton = React.memo(function CodeFilterChipButton({
  entry,
  onRemoveFilter,
}: CodeFilterChipButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onRemoveFilter(entry.key, entry.label);
  }, [entry.key, entry.label, onRemoveFilter]);

  return (
    <button
      type="button"
      className="search-code-filter-chip"
      onClick={handleClick}
      title={entry.label}
    >
      {entry.label}
      <span className="search-code-filter-chip-close" aria-hidden="true">
        ×
      </span>
    </button>
  );
});

export const CodeFilterHelper: React.FC<CodeFilterHelperProps> = ({
  copy,
  locale,
  prefixes,
  exampleTokens,
  scenarios,
  activeEntries,
  onInsertPrefix,
  onApplyExample,
  onApplyScenario,
  onRemoveFilter,
  onClearFilters,
}) => (
  <>
    <div className="search-code-filter-helper">
      <div className="search-code-filter-helper-row">
        <span className="search-code-filter-helper-label">{copy.codeQuickFilters}</span>
        <div className="search-code-filter-helper-buttons">
          {prefixes.map((prefix) => (
            <CodeFilterPrefixButton key={prefix} prefix={prefix} onInsertPrefix={onInsertPrefix} />
          ))}
        </div>
      </div>
      <div className="search-code-filter-helper-row">
        <span className="search-code-filter-helper-label">{copy.codeQuickExamples}</span>
        <div className="search-code-filter-helper-buttons">
          {exampleTokens.map((token) => (
            <CodeFilterTokenButton key={token} token={token} onApplyExample={onApplyExample} />
          ))}
        </div>
      </div>
      <div className="search-code-filter-helper-row">
        <span className="search-code-filter-helper-label">{copy.codeQuickScenarios}</span>
        <div className="search-code-filter-helper-buttons">
          {scenarios.map((scenario) => (
            <CodeFilterScenarioButton
              key={scenario.id}
              scenario={scenario}
              onApplyScenario={onApplyScenario}
            />
          ))}
        </div>
      </div>
    </div>

    {activeEntries.length > 0 && (
      <div className="search-code-filter-chips">
        {activeEntries.map((entry) => (
          <CodeFilterChipButton
            key={`${entry.key}-${entry.label}`}
            entry={entry}
            onRemoveFilter={onRemoveFilter}
          />
        ))}
        <button type="button" className="search-code-filter-clear" onClick={onClearFilters}>
          {locale === "zh" ? "清空过滤" : "Clear filters"}
        </button>
      </div>
    )}
  </>
);
