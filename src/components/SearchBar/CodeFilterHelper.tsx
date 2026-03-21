import React from 'react';
import type { CodeFilterPrefix, SearchFilters } from './codeSearchUtils';
import type { SearchBarCopy, UiLocale } from './types';

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
            <button
              key={prefix}
              type="button"
              className="search-code-filter-helper-btn"
              onClick={() => onInsertPrefix(prefix)}
            >
              {prefix}:
            </button>
          ))}
        </div>
      </div>
      <div className="search-code-filter-helper-row">
        <span className="search-code-filter-helper-label">{copy.codeQuickExamples}</span>
        <div className="search-code-filter-helper-buttons">
          {exampleTokens.map((token) => (
            <button
              key={token}
              type="button"
              className="search-code-filter-helper-btn example"
              onClick={() => onApplyExample(token)}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
      <div className="search-code-filter-helper-row">
        <span className="search-code-filter-helper-label">{copy.codeQuickScenarios}</span>
        <div className="search-code-filter-helper-buttons">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="search-code-filter-helper-btn scenario"
              onClick={() => onApplyScenario(scenario.tokens)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    {activeEntries.length > 0 && (
      <div className="search-code-filter-chips">
        {activeEntries.map((entry) => (
          <button
            key={`${entry.key}-${entry.label}`}
            type="button"
            className="search-code-filter-chip"
            onClick={() => onRemoveFilter(entry.key, entry.label)}
            title={entry.label}
          >
            {entry.label}
            <span className="search-code-filter-chip-close" aria-hidden="true">
              ×
            </span>
          </button>
        ))}
        <button type="button" className="search-code-filter-clear" onClick={onClearFilters}>
          {locale === 'zh' ? '清空过滤' : 'Clear filters'}
        </button>
      </div>
    )}
  </>
);
