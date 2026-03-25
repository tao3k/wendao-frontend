import React, { useMemo } from 'react';
import type { CodeAstAnalysisResponse } from '../../api';
import type { UiLocale, SearchResult } from '../SearchBar/types';
import { CodeSyntaxHighlighter } from '../code-syntax';
import { deriveCodeAstAnatomy } from './StructuredDashboard/codeAstAnatomy';
import './CodeAstAnatomyView.css';

interface CodeAstAnatomyViewProps {
  locale: UiLocale;
  selectedResult: SearchResult;
  analysis: CodeAstAnalysisResponse | null;
  content: string | null;
  loading: boolean;
  error: string | null;
  onPivotQuery?: (query: string) => void;
}

function copyForLocale(locale: UiLocale) {
  return {
    empty: locale === 'zh' ? '暂无 AST 分析。' : 'No code AST analysis available.',
    loading: locale === 'zh' ? '正在编译 AST 解剖视图...' : 'Compiling AST anatomy view...',
    waterfall: locale === 'zh' ? '代码 AST 瀑布流' : 'Code AST Waterfall',
    filePath: locale === 'zh' ? '文件路径' : 'File Path',
    declaration: locale === 'zh' ? '声明层' : 'Declaration Identity',
    blocks: locale === 'zh' ? '逻辑块分解' : 'Logic Block Decomposition',
    symbols: locale === 'zh' ? '符号语义层' : 'Symbol Semantic Overlay',
    chunk: locale === 'zh' ? '块' : 'Chunk',
    semantic: locale === 'zh' ? '语义' : 'Semantic',
    fingerprint: locale === 'zh' ? '指纹' : 'Fingerprint',
    tokens: locale === 'zh' ? 'Token' : 'Tokens',
  };
}

interface SignatureValueRow {
  label: string;
  value: string;
  query: string;
}

interface SignatureParameterRow {
  id: string;
  name?: {
    label: string;
    value: string;
    query: string;
  };
  type?: {
    label: string;
    value: string;
    query: string;
  };
}

function buildSignatureParameterRows(signatureParts: Array<{ id: string; label: string; value: string; query: string }>) {
  const parameters: SignatureParameterRow[] = [];
  let current: SignatureParameterRow | null = null;
  let returnPart: SignatureValueRow | null = null;

  signatureParts.forEach((part) => {
    if (part.label === 'return') {
      returnPart = {
        label: 'return',
        value: part.value,
        query: part.query,
      };
      return;
    }

    if (part.label === 'param') {
      if (current) {
        parameters.push(current);
      }

      current = {
        id: `${part.id}-row`,
        name: {
          label: part.label,
          value: part.value,
          query: part.query,
        },
      };
      return;
    }

    if (part.label === 'type') {
      if (current) {
        current.type = {
          label: part.label,
          value: part.value,
          query: part.query,
        };
      } else {
        parameters.push({
          id: `${part.id}-row`,
          type: {
            label: part.label,
            value: part.value,
            query: part.query,
          },
        });
      }
    }
  });

  if (current) {
    parameters.push(current);
  }

  return { parameters, returnPart };
}

function parseLineRange(lineRange: string): { start: number; end: number } | null {
  const match = /^L(\d+)-L(\d+)$/.exec(lineRange);
  if (!match) {
    return null;
  }

  return {
    start: Number(match[1]),
    end: Number(match[2]),
  };
}

function buildDisplayedLineRange(
  declarationLine: number | undefined,
  blocks: Array<{ lineRange: string }>
): string | null {
  const blockRanges = blocks
    .map((block) => parseLineRange(block.lineRange))
    .filter((range): range is { start: number; end: number } => Boolean(range));

  const startCandidates = blockRanges.map((range) => range.start);
  const endCandidates = blockRanges.map((range) => range.end);

  if (typeof declarationLine === 'number' && declarationLine > 0) {
    startCandidates.push(declarationLine);
    endCandidates.push(declarationLine);
  }

  if (startCandidates.length === 0 || endCandidates.length === 0) {
    return null;
  }

  const start = Math.min(...startCandidates);
  const end = Math.max(...endCandidates);

  return start === end ? `L${start}` : `L${start}-L${end}`;
}

function formatStageIndex(index: number): string {
  return String(index).padStart(2, '0');
}

export const CodeAstAnatomyView: React.FC<CodeAstAnatomyViewProps> = ({
  locale,
  selectedResult,
  analysis,
  content,
  loading,
  error,
  onPivotQuery,
}) => {
  const copy = copyForLocale(locale);
  const model = useMemo(
    () => (analysis ? deriveCodeAstAnatomy(analysis, content, selectedResult) : null),
    [analysis, content, selectedResult]
  );

  if (loading) {
    return <div className="code-ast-waterfall__status">{copy.loading}</div>;
  }

  if (error) {
    return <div className="code-ast-waterfall__status code-ast-waterfall__status--error">{error}</div>;
  }

  if (!model || !analysis) {
    return <div className="code-ast-waterfall__status">{copy.empty}</div>;
  }

  const declaration = model.declaration;
  const syntaxLanguage = selectedResult.codeLanguage ?? analysis.language ?? null;
  const sourcePath = selectedResult.navigationTarget?.path ?? selectedResult.path;
  const signatureRows = buildSignatureParameterRows(model.signatureParts);
  const sourceLineRange = buildDisplayedLineRange(declaration?.line, model.blocks);

  return (
    <div className="code-ast-waterfall" data-testid="code-ast-waterfall">
      <header className="code-ast-waterfall__header">
        <div className="code-ast-waterfall__eyebrow">{copy.waterfall}</div>
        <div className="code-ast-waterfall__file-line">
          <span className="code-ast-waterfall__header-index">{formatStageIndex(0)}</span>
          <span className="code-ast-waterfall__file-label">{copy.filePath}</span>
          <span className="code-ast-waterfall__file-value">{declaration?.path ?? sourcePath}</span>
          {sourceLineRange && <span className="code-ast-waterfall__file-range">[LINE {sourceLineRange}]</span>}
        </div>
      </header>

      <section
        className="code-ast-waterfall__stage code-ast-waterfall__stage--declaration"
        data-testid="code-ast-waterfall-stage-declaration"
      >
        <div className="code-ast-waterfall__stage-heading">
          <span className="code-ast-waterfall__stage-index">{formatStageIndex(1)}</span>
          <span className="code-ast-waterfall__stage-title">{copy.declaration}</span>
        </div>
        {declaration ? (
          <div
            role="button"
            tabIndex={0}
            className="code-ast-waterfall__declaration-card"
            data-chunk-id={declaration.atom.id}
            data-semantic-type={declaration.atom.semanticType}
            onClick={() => onPivotQuery?.(declaration.query ?? declaration.label)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPivotQuery?.(declaration.query ?? declaration.label);
              }
            }}
            title={declaration.path}
            >
            <div className="code-ast-waterfall__declaration-title">{declaration.label}</div>
            <div className="code-ast-waterfall__declaration-kind">
              {declaration.kind}
              {declaration.line ? ` · L${declaration.line}` : ''}
            </div>
            <div className="code-ast-waterfall__atom-row" data-testid="code-ast-declaration-atom">
              <span className="code-ast-waterfall__atom-pill" title={declaration.atom.id}>
                <span className="code-ast-waterfall__atom-label">{copy.chunk}</span>
                <span className="code-ast-waterfall__atom-value">{declaration.atom.displayId}</span>
              </span>
              <span className="code-ast-waterfall__atom-pill" title={declaration.atom.semanticType}>
                <span className="code-ast-waterfall__atom-label">{copy.semantic}</span>
                <span className="code-ast-waterfall__atom-value">{declaration.atom.semanticType}</span>
              </span>
              <span className="code-ast-waterfall__atom-pill" title={declaration.atom.fingerprint}>
                <span className="code-ast-waterfall__atom-label">{copy.fingerprint}</span>
                <span className="code-ast-waterfall__atom-value">{declaration.atom.fingerprint}</span>
              </span>
              <span className="code-ast-waterfall__atom-pill" title={`~${declaration.atom.tokenEstimate}`}>
                <span className="code-ast-waterfall__atom-label">{copy.tokens}</span>
                <span className="code-ast-waterfall__atom-value">~{declaration.atom.tokenEstimate}</span>
              </span>
            </div>
            {model.signatureParts.length > 0 && (
              <div className="code-ast-waterfall__signature-parts" data-testid="code-ast-signature-parts">
                {signatureRows.parameters.length > 0 && (
                  <div className="code-ast-waterfall__signature-group">
                    <div className="code-ast-waterfall__signature-group-title">
                      {locale === 'zh' ? '参数' : 'Parameters'}
                    </div>
                    <div className="code-ast-waterfall__signature-grid">
                      {signatureRows.parameters.map((parameter) => {
                        const pivotQuery = parameter.name?.query ?? parameter.type?.query ?? '';

                        return (
                          <button
                            key={parameter.id}
                            type="button"
                            className="code-ast-waterfall__signature-pair"
                            onClick={() => pivotQuery && onPivotQuery?.(pivotQuery)}
                            title={pivotQuery || undefined}
                          >
                            <span className="code-ast-waterfall__signature-pair-label">
                              {parameter.name?.label ?? 'param'}
                            </span>
                            <span className="code-ast-waterfall__signature-pair-value">
                              {parameter.name?.value ?? parameter.type?.value ?? ''}
                            </span>
                            {parameter.type && (
                              <span className="code-ast-waterfall__signature-pair-type">{parameter.type.value}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {signatureRows.returnPart && (
                  <div className="code-ast-waterfall__signature-group">
                    <div className="code-ast-waterfall__signature-group-title">
                      {locale === 'zh' ? '返回值' : 'Return Type'}
                    </div>
                    <div className="code-ast-waterfall__signature-grid">
                      <button
                        type="button"
                        className="code-ast-waterfall__signature-pair code-ast-waterfall__signature-pair--return"
                        onClick={() => signatureRows.returnPart?.query && onPivotQuery?.(signatureRows.returnPart.query)}
                        title={signatureRows.returnPart.query}
                      >
                        <span className="code-ast-waterfall__signature-pair-label">
                          {signatureRows.returnPart.label}
                        </span>
                        <span className="code-ast-waterfall__signature-pair-value">
                          {signatureRows.returnPart.value}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="code-ast-waterfall__status">{copy.empty}</div>
        )}
      </section>

      <section
        className="code-ast-waterfall__stage code-ast-waterfall__stage--blocks"
        data-testid="code-ast-waterfall-stage-blocks"
      >
        <div className="code-ast-waterfall__stage-heading">
          <span className="code-ast-waterfall__stage-index">{formatStageIndex(2)}</span>
          <span className="code-ast-waterfall__stage-title">{copy.blocks}</span>
        </div>
        <div className="code-ast-waterfall__block-stack" data-testid="code-ast-waterfall-block-stack">
          {model.blocks.length > 0 ? (
            model.blocks.map((block) => (
              <details
                key={block.id}
                className={`code-ast-waterfall__block code-ast-waterfall__block--${block.kind}`}
                data-chunk-id={block.atom.id}
                data-semantic-type={block.atom.semanticType}
                open
              >
                <summary className="code-ast-waterfall__block-summary">
                  <span className="code-ast-waterfall__block-title">{block.title}</span>
                  <span className="code-ast-waterfall__block-meta">
                    {block.lineRange}
                    {block.anchors.length > 0 ? ` · ${block.anchors.length} anchors` : ''}
                  </span>
                </summary>
                <div className="code-ast-waterfall__block-body">
                  <button
                    type="button"
                    className="code-ast-waterfall__block-anchor"
                    onClick={() => block.query && onPivotQuery?.(block.query)}
                    title={block.query ?? block.title}
                  >
                    {block.query ?? block.title}
                  </button>
                  <div className="code-ast-waterfall__atom-row" data-testid="code-ast-block-atom">
                    <span className="code-ast-waterfall__atom-pill" title={block.atom.id}>
                      <span className="code-ast-waterfall__atom-label">{copy.chunk}</span>
                      <span className="code-ast-waterfall__atom-value">{block.atom.displayId}</span>
                    </span>
                    <span className="code-ast-waterfall__atom-pill" title={block.atom.semanticType}>
                      <span className="code-ast-waterfall__atom-label">{copy.semantic}</span>
                      <span className="code-ast-waterfall__atom-value">{block.atom.semanticType}</span>
                    </span>
                    <span className="code-ast-waterfall__atom-pill" title={block.atom.fingerprint}>
                      <span className="code-ast-waterfall__atom-label">{copy.fingerprint}</span>
                      <span className="code-ast-waterfall__atom-value">{block.atom.fingerprint}</span>
                    </span>
                    <span className="code-ast-waterfall__atom-pill" title={`~${block.atom.tokenEstimate}`}>
                      <span className="code-ast-waterfall__atom-label">{copy.tokens}</span>
                      <span className="code-ast-waterfall__atom-value">~{block.atom.tokenEstimate}</span>
                    </span>
                  </div>
                  <pre className="code-ast-waterfall__block-excerpt">
                    <CodeSyntaxHighlighter
                      source={block.excerpt}
                      language={syntaxLanguage}
                      sourcePath={sourcePath}
                    />
                  </pre>
                  {block.anchors.length > 0 && (
                    <div className="structured-chip-row">
                      {block.anchors.map((anchor) => (
                        <button
                          key={`${block.id}-${anchor}`}
                          type="button"
                          className="structured-chip"
                          onClick={() => onPivotQuery?.(anchor)}
                        >
                          <span className="structured-chip__label">anchor</span>
                          <span className="structured-chip__value">{anchor}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))
          ) : (
            <div className="code-ast-waterfall__block-empty">
              {locale === 'zh' ? '暂无逻辑块。' : 'No logic blocks.'}
            </div>
          )}
        </div>
      </section>

      <section
        className="code-ast-waterfall__stage code-ast-waterfall__stage--symbols"
        data-testid="code-ast-waterfall-stage-symbols"
      >
        <div className="code-ast-waterfall__stage-heading">
          <span className="code-ast-waterfall__stage-index">{formatStageIndex(3)}</span>
          <span className="code-ast-waterfall__stage-title">{copy.symbols}</span>
        </div>
        {model.symbolGroups.length > 0 ? (
          <div className="code-ast-waterfall__symbol-grid">
            {model.symbolGroups.map((group) => (
              <div
                key={group.id}
                className="code-ast-waterfall__symbol-group"
                data-testid={`code-ast-symbol-group-${group.id}`}
              >
                <div className="code-ast-waterfall__symbol-group-title">
                  <span>{group.title}</span>
                  <span className="code-ast-waterfall__symbol-group-count">{group.symbols.length}</span>
                </div>
                {group.symbols.length > 0 ? (
                  group.id === 'anchors' ? (
                    <div className="code-ast-waterfall__anchor-list">
                      {group.symbols.map((symbol, index) => (
                        <button
                          key={symbol.id}
                          type="button"
                          className="code-ast-waterfall__anchor-card"
                          onClick={() => onPivotQuery?.(symbol.query)}
                          title={symbol.path}
                        >
                          <div className="code-ast-waterfall__anchor-card-rank">
                            {`#${index + 1}`}
                            {' · '}
                            {symbol.kind}
                          </div>
                          <div className="code-ast-waterfall__anchor-card-name">{symbol.label}</div>
                          <div className="code-ast-waterfall__anchor-card-meta">
                            {symbol.path}
                            {symbol.line ? ` · L${symbol.line}` : ''}
                            {symbol.references > 0 ? ` · refs:${symbol.references}` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="structured-chip-row code-ast-waterfall__symbol-group-row">
                      {group.symbols.map((symbol) => (
                        <button
                          key={symbol.id}
                          type="button"
                          className="structured-chip code-ast-waterfall__symbol-chip"
                          onClick={() => onPivotQuery?.(symbol.query)}
                          title={symbol.path}
                        >
                          <span className="structured-chip__label">{symbol.kind}</span>
                          <span className="structured-chip__value">
                            {symbol.label}
                            {symbol.line ? ` · L${symbol.line}` : ''}
                            {symbol.references > 0 ? ` · refs:${symbol.references}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="code-ast-waterfall__symbol-empty">{group.empty}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="code-ast-waterfall__status">{copy.empty}</div>
        )}
      </section>
    </div>
  );
};

export default CodeAstAnatomyView;
