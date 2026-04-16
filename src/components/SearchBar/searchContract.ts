import type { UiSearchContract } from "../../api/bindings";
import {
  CODE_FILTER_PREFIXES,
  STRUCTURAL_CODE_PREFIXES,
  normalizeCodeSearchQuery,
  parseCodeFilters,
} from "./codeSearchUtils";

const EXPECTED_PREFIX_ALIASES = {
  language: "lang",
} as const;

const EXPECTED_CODE_SEARCH_ROUTES = {
  knowledge: "/search/knowledge",
  intent: "/search/intent",
  autocomplete: "/search/autocomplete",
} as const;

const EXPECTED_REPO_DISCOVERY = {
  suggest: {
    source: "repo_index_status",
    defaultLimit: 6,
    queryScoped: false,
    exhaustive: true,
  },
  facet: {
    source: "search_results",
    defaultLimit: 6,
    queryScoped: true,
    exhaustive: false,
  },
  inventory: {
    source: "repo_index_status",
    defaultLimit: 200,
    queryScoped: false,
    exhaustive: true,
  },
} as const;

export interface SearchContractValidationIssue {
  field: string;
  message: string;
}

function pushIssue(
  issues: SearchContractValidationIssue[],
  field: string,
  message: string,
): void {
  issues.push({ field, message });
}

function arraysMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateSearchContract(
  contract: UiSearchContract | null | undefined,
): SearchContractValidationIssue[] {
  const issues: SearchContractValidationIssue[] = [];
  if (!contract) {
    return [{ field: "searchContract", message: "missing Rust-owned search contract manifest" }];
  }

  if (!contract.contractVersion.trim()) {
    pushIssue(issues, "searchContract.contractVersion", "must be a non-empty schema version");
  }

  if (contract.codeSearch.intent !== "code_search") {
    pushIssue(
      issues,
      "searchContract.codeSearch.intent",
      `expected code_search intent, received ${contract.codeSearch.intent}`,
    );
  }

  const expectedPrefixes = [
    ...contract.codeSearch.backendPrefixes,
    ...contract.codeSearch.composedPrefixes,
    ...contract.codeSearch.structuralPrefixes,
  ];
  if (!arraysMatch(expectedPrefixes, CODE_FILTER_PREFIXES)) {
    pushIssue(
      issues,
      "searchContract.codeSearch.prefixes",
      `expected ${JSON.stringify(CODE_FILTER_PREFIXES)}, received ${JSON.stringify(expectedPrefixes)}`,
    );
  }

  if (!arraysMatch(contract.codeSearch.structuralPrefixes, STRUCTURAL_CODE_PREFIXES)) {
    pushIssue(
      issues,
      "searchContract.codeSearch.structuralPrefixes",
      `expected ${JSON.stringify(STRUCTURAL_CODE_PREFIXES)}, received ${JSON.stringify(contract.codeSearch.structuralPrefixes)}`,
    );
  }

  const aliasRecord = Object.fromEntries(
    contract.codeSearch.prefixAliases.map((entry) => [entry.alias, entry.canonical]),
  );
  if (JSON.stringify(aliasRecord) !== JSON.stringify(EXPECTED_PREFIX_ALIASES)) {
    pushIssue(
      issues,
      "searchContract.codeSearch.prefixAliases",
      `expected ${JSON.stringify(EXPECTED_PREFIX_ALIASES)}, received ${JSON.stringify(aliasRecord)}`,
    );
  }

  if (JSON.stringify(contract.codeSearch.routes) !== JSON.stringify(EXPECTED_CODE_SEARCH_ROUTES)) {
    pushIssue(
      issues,
      "searchContract.codeSearch.routes",
      `expected ${JSON.stringify(EXPECTED_CODE_SEARCH_ROUTES)}, received ${JSON.stringify(contract.codeSearch.routes)}`,
    );
  }

  if (contract.codeSearch.backendKindFilters.length === 0) {
    pushIssue(
      issues,
      "searchContract.codeSearch.backendKindFilters",
      "must expose at least one backend kind filter",
    );
  }

  if (JSON.stringify(contract.repoDiscovery) !== JSON.stringify(EXPECTED_REPO_DISCOVERY)) {
    pushIssue(
      issues,
      "searchContract.repoDiscovery",
      `expected ${JSON.stringify(EXPECTED_REPO_DISCOVERY)}, received ${JSON.stringify(contract.repoDiscovery)}`,
    );
  }

  contract.codeSearch.examples.forEach((example) => {
    const normalizedQuery = normalizeCodeSearchQuery(example.query);
    if (normalizedQuery !== example.normalizedQuery) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.normalizedQuery`,
        `expected ${example.normalizedQuery}, received ${normalizedQuery}`,
      );
    }

    const parsed = parseCodeFilters(example.normalizedQuery);
    if (parsed.baseQuery !== example.baseQuery) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.baseQuery`,
        `expected ${example.baseQuery}, received ${parsed.baseQuery}`,
      );
    }

    if (!arraysMatch(parsed.filters.language, example.languageFilters)) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.languageFilters`,
        `expected ${JSON.stringify(example.languageFilters)}, received ${JSON.stringify(parsed.filters.language)}`,
      );
    }

    if (!arraysMatch(parsed.filters.kind, example.kindFilters)) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.kindFilters`,
        `expected ${JSON.stringify(example.kindFilters)}, received ${JSON.stringify(parsed.filters.kind)}`,
      );
    }

    if (!arraysMatch(parsed.filters.repo, example.repoFilters)) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.repoFilters`,
        `expected ${JSON.stringify(example.repoFilters)}, received ${JSON.stringify(parsed.filters.repo)}`,
      );
    }

    if (!arraysMatch(parsed.filters.path, example.pathFilters)) {
      pushIssue(
        issues,
        `searchContract.codeSearch.examples.${example.id}.pathFilters`,
        `expected ${JSON.stringify(example.pathFilters)}, received ${JSON.stringify(parsed.filters.path)}`,
      );
    }
  });

  return issues;
}
