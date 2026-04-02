import React from 'react';
import { CodeSyntaxHighlighter } from '../code-syntax';
import type {
  CodeAstBlockModel,
  CodeAstDeclarationModel,
  CodeAstSymbolGroup,
  CodeAstSymbolModel,
} from './StructuredDashboard/codeAstAnatomy';
import {
  buildAnchorCopyPayload,
  buildBlockCopyPayload,
  buildDeclarationCopyPayload,
  buildSymbolCopyPayload,
  copyToClipboard,
  formatStageIndex,
  type CodeAstAnatomyCopy,
  type SignatureParameterRow,
  type SignatureValueRow,
} from './codeAstAnatomyViewModel';

interface CodeAstWaterfallHeaderProps {
  copy: CodeAstAnatomyCopy;
  declarationPath?: string | null;
  sourcePath: string;
  sourceLineRange: string | null;
}

interface CodeAstDeclarationStageProps {
  locale: 'en' | 'zh';
  copy: CodeAstAnatomyCopy;
  declaration: CodeAstDeclarationModel | null;
  signatureRows: {
    parameters: SignatureParameterRow[];
    returnPart: SignatureValueRow | null;
  };
  onPivotQuery?: (query: string) => void;
}

interface CodeAstBlocksStageProps {
  locale: 'en' | 'zh';
  copy: CodeAstAnatomyCopy;
  blocks: CodeAstBlockModel[];
  syntaxLanguage: string | null;
  sourcePath: string;
  onPivotQuery?: (query: string) => void;
}

interface CodeAstSymbolsStageProps {
  copy: CodeAstAnatomyCopy;
  symbolGroups: CodeAstSymbolGroup[];
  onPivotQuery?: (query: string) => void;
}

interface CodeAstAtomRowProps {
  copy: CodeAstAnatomyCopy;
  atom: {
    id: string;
    displayId: string;
    semanticType: string;
    fingerprint: string;
    tokenEstimate: number;
  };
  testId: string;
}

function CodeAstAtomRow({ copy, atom, testId }: CodeAstAtomRowProps): React.ReactNode {
  return (
    <div className="code-ast-waterfall__atom-row" data-testid={testId}>
      <span className="code-ast-waterfall__atom-pill" title={atom.id}>
        <span className="code-ast-waterfall__atom-label">{copy.chunk}</span>
        <span className="code-ast-waterfall__atom-value">{atom.displayId}</span>
      </span>
      <span className="code-ast-waterfall__atom-pill" title={atom.semanticType}>
        <span className="code-ast-waterfall__atom-label">{copy.semantic}</span>
        <span className="code-ast-waterfall__atom-value">{atom.semanticType}</span>
      </span>
      <span className="code-ast-waterfall__atom-pill" title={atom.fingerprint}>
        <span className="code-ast-waterfall__atom-label">{copy.fingerprint}</span>
        <span className="code-ast-waterfall__atom-value">{atom.fingerprint}</span>
      </span>
      <span className="code-ast-waterfall__atom-pill" title={`~${atom.tokenEstimate}`}>
        <span className="code-ast-waterfall__atom-label">{copy.tokens}</span>
        <span className="code-ast-waterfall__atom-value">~{atom.tokenEstimate}</span>
      </span>
    </div>
  );
}

function CodeAstAnchorCard({
  copy,
  symbol,
  rank,
  onPivotQuery,
}: {
  copy: CodeAstAnatomyCopy;
  symbol: CodeAstSymbolModel;
  rank: number;
  onPivotQuery?: (query: string) => void;
}): React.ReactNode {
  return (
    <div
      className="code-ast-waterfall__anchor-card"
      data-testid="code-ast-anchor-card"
      data-chunk-id={symbol.atom.id}
      data-semantic-type={symbol.atom.semanticType}
      title={symbol.path}
    >
      <div className="code-ast-waterfall__anchor-card-rank">
        {`#${rank}`}
        {' · '}
        {symbol.kind}
      </div>
      <div className="code-ast-waterfall__anchor-card-name">{symbol.label}</div>
      <div className="code-ast-waterfall__anchor-card-meta">
        {symbol.path}
        {symbol.line ? ` · L${symbol.line}` : ''}
        {symbol.references > 0 ? ` · refs:${symbol.references}` : ''}
      </div>
      <CodeAstAtomRow copy={copy} atom={symbol.atom} testId="code-ast-anchor-atom" />
      <div className="code-ast-waterfall__action-row">
        <button
          type="button"
          className="code-ast-waterfall__action"
          onClick={() => onPivotQuery?.(symbol.query)}
        >
          {copy.pivotAnchor}
        </button>
        <button
          type="button"
          className="code-ast-waterfall__action"
          onClick={() => {
            void copyToClipboard(buildAnchorCopyPayload(symbol, rank));
          }}
        >
          {copy.copyForRag}
        </button>
      </div>
    </div>
  );
}

function CodeAstSymbolCard({
  copy,
  symbol,
  onPivotQuery,
}: {
  copy: CodeAstAnatomyCopy;
  symbol: CodeAstSymbolModel;
  onPivotQuery?: (query: string) => void;
}): React.ReactNode {
  return (
    <div
      className="code-ast-waterfall__symbol-card"
      data-chunk-id={symbol.atom.id}
      data-semantic-type={symbol.atom.semanticType}
      title={symbol.path}
    >
      <div className="code-ast-waterfall__symbol-card-kind">{symbol.kind}</div>
      <div className="code-ast-waterfall__symbol-card-name">{symbol.label}</div>
      <div className="code-ast-waterfall__symbol-card-meta">
        {symbol.path}
        {symbol.line ? ` · L${symbol.line}` : ''}
        {symbol.references > 0 ? ` · refs:${symbol.references}` : ''}
      </div>
      <CodeAstAtomRow copy={copy} atom={symbol.atom} testId="code-ast-symbol-atom" />
      <div className="code-ast-waterfall__action-row">
        <button
          type="button"
          className="code-ast-waterfall__action"
          onClick={() => onPivotQuery?.(symbol.query)}
        >
          {copy.pivotSymbol}
        </button>
        <button
          type="button"
          className="code-ast-waterfall__action"
          onClick={() => {
            void copyToClipboard(buildSymbolCopyPayload(symbol));
          }}
        >
          {copy.copyForRag}
        </button>
      </div>
    </div>
  );
}

export function CodeAstWaterfallHeader({
  copy,
  declarationPath,
  sourcePath,
  sourceLineRange,
}: CodeAstWaterfallHeaderProps): React.ReactNode {
  return (
    <header className="code-ast-waterfall__header">
      <div className="code-ast-waterfall__eyebrow">{copy.waterfall}</div>
      <div className="code-ast-waterfall__file-line">
        <span className="code-ast-waterfall__header-index">{formatStageIndex(0)}</span>
        <span className="code-ast-waterfall__file-label">{copy.filePath}</span>
        <span className="code-ast-waterfall__file-value">{declarationPath ?? sourcePath}</span>
        {sourceLineRange && <span className="code-ast-waterfall__file-range">[LINE {sourceLineRange}]</span>}
      </div>
    </header>
  );
}

export function CodeAstDeclarationStage({
  locale,
  copy,
  declaration,
  signatureRows,
  onPivotQuery,
}: CodeAstDeclarationStageProps): React.ReactNode {
  return (
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
          <div className="code-ast-waterfall__action-row">
            <button
              type="button"
              className="code-ast-waterfall__action"
              onClick={(event) => {
                event.stopPropagation();
                onPivotQuery?.(declaration.query ?? declaration.label);
              }}
            >
              {copy.pivotDeclaration}
            </button>
            <button
              type="button"
              className="code-ast-waterfall__action"
              onClick={(event) => {
                event.stopPropagation();
                void copyToClipboard(buildDeclarationCopyPayload(declaration));
              }}
            >
              {copy.copyForRag}
            </button>
          </div>
          <CodeAstAtomRow copy={copy} atom={declaration.atom} testId="code-ast-declaration-atom" />
          {(signatureRows.parameters.length > 0 || signatureRows.returnPart) && (
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
  );
}

export function CodeAstBlocksStage({
  locale,
  copy,
  blocks,
  syntaxLanguage,
  sourcePath,
  onPivotQuery,
}: CodeAstBlocksStageProps): React.ReactNode {
  return (
    <section
      className="code-ast-waterfall__stage code-ast-waterfall__stage--blocks"
      data-testid="code-ast-waterfall-stage-blocks"
    >
      <div className="code-ast-waterfall__stage-heading">
        <span className="code-ast-waterfall__stage-index">{formatStageIndex(2)}</span>
        <span className="code-ast-waterfall__stage-title">{copy.blocks}</span>
      </div>
      <div className="code-ast-waterfall__block-stack" data-testid="code-ast-waterfall-block-stack">
        {blocks.length > 0 ? (
          blocks.map((block) => (
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
                <div className="code-ast-waterfall__block-actions">
                  <button
                    type="button"
                    className="code-ast-waterfall__action"
                    onClick={() => block.query && onPivotQuery?.(block.query)}
                    title={block.query ?? block.title}
                  >
                    {copy.pivotBlock}
                  </button>
                  <button
                    type="button"
                    className="code-ast-waterfall__action"
                    onClick={() => {
                      void copyToClipboard(buildBlockCopyPayload(block));
                    }}
                  >
                    {copy.copyForRag}
                  </button>
                </div>
                <CodeAstAtomRow copy={copy} atom={block.atom} testId="code-ast-block-atom" />
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
  );
}

export function CodeAstSymbolsStage({
  copy,
  symbolGroups,
  onPivotQuery,
}: CodeAstSymbolsStageProps): React.ReactNode {
  return (
    <section
      className="code-ast-waterfall__stage code-ast-waterfall__stage--symbols"
      data-testid="code-ast-waterfall-stage-symbols"
    >
      <div className="code-ast-waterfall__stage-heading">
        <span className="code-ast-waterfall__stage-index">{formatStageIndex(3)}</span>
        <span className="code-ast-waterfall__stage-title">{copy.symbols}</span>
      </div>
      {symbolGroups.length > 0 ? (
        <div className="code-ast-waterfall__symbol-grid">
          {symbolGroups.map((group) => (
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
                      <CodeAstAnchorCard
                        key={symbol.id}
                        copy={copy}
                        symbol={symbol}
                        rank={index + 1}
                        onPivotQuery={onPivotQuery}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="code-ast-waterfall__symbol-card-list">
                    {group.symbols.map((symbol) => (
                      <CodeAstSymbolCard
                        key={symbol.id}
                        copy={copy}
                        symbol={symbol}
                        onPivotQuery={onPivotQuery}
                      />
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
  );
}
