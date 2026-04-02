import type { UiLocale } from '../SearchBar/types';
import type {
  CodeAstBlockModel,
  CodeAstDeclarationModel,
  CodeAstSignaturePart,
  CodeAstSymbolModel,
} from './StructuredDashboard/codeAstAnatomy';

export interface CodeAstAnatomyCopy {
  empty: string;
  loading: string;
  waterfall: string;
  filePath: string;
  declaration: string;
  blocks: string;
  symbols: string;
  chunk: string;
  semantic: string;
  fingerprint: string;
  tokens: string;
  copyForRag: string;
  pivotDeclaration: string;
  pivotBlock: string;
  pivotSymbol: string;
  pivotAnchor: string;
}

export interface SignatureValueRow {
  label: string;
  value: string;
  query: string;
}

export interface SignatureParameterRow {
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

export function copyForLocale(locale: UiLocale): CodeAstAnatomyCopy {
  return {
    empty: locale === 'zh' ? '暂无 AST 分析。' : 'No code AST analysis available.',
    loading: locale === 'zh' ? '正在加载 AST 分析...' : 'Loading AST analysis...',
    waterfall: locale === 'zh' ? '代码 AST 瀑布流' : 'Code AST Waterfall',
    filePath: locale === 'zh' ? '文件路径' : 'File Path',
    declaration: locale === 'zh' ? '声明层' : 'Declaration Identity',
    blocks: locale === 'zh' ? '逻辑块分解' : 'Logic Block Decomposition',
    symbols: locale === 'zh' ? '符号语义层' : 'Symbol Semantic Overlay',
    chunk: locale === 'zh' ? '块' : 'Chunk',
    semantic: locale === 'zh' ? '语义' : 'Semantic',
    fingerprint: locale === 'zh' ? '指纹' : 'Fingerprint',
    tokens: locale === 'zh' ? 'Token' : 'Tokens',
    copyForRag: locale === 'zh' ? '复制用于 RAG' : 'Copy for RAG',
    pivotDeclaration: locale === 'zh' ? '聚焦声明' : 'Pivot declaration',
    pivotBlock: locale === 'zh' ? '聚焦逻辑块' : 'Pivot block',
    pivotSymbol: locale === 'zh' ? '聚焦符号' : 'Pivot symbol',
    pivotAnchor: locale === 'zh' ? '聚焦锚点' : 'Pivot anchor',
  };
}

export function buildSignatureParameterRows(signatureParts: CodeAstSignaturePart[]) {
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

export function buildDisplayedLineRange(
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

export function formatStageIndex(index: number): string {
  return String(index).padStart(2, '0');
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

export function buildDeclarationCopyPayload(declaration: CodeAstDeclarationModel): string {
  return [
    `Declaration: ${declaration.label}`,
    `Chunk: ${declaration.atom.id}`,
    `Semantic: ${declaration.atom.semanticType}`,
    `Fingerprint: ${declaration.atom.fingerprint}`,
    `Tokens: ~${declaration.atom.tokenEstimate}`,
    `Path: ${declaration.path}`,
    declaration.line ? `Line: L${declaration.line}` : null,
    '',
    declaration.signature,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
    .trim();
}

export function buildBlockCopyPayload(block: CodeAstBlockModel): string {
  return [
    `Block: ${block.title}`,
    `Chunk: ${block.atom.id}`,
    `Semantic: ${block.atom.semanticType}`,
    `Fingerprint: ${block.atom.fingerprint}`,
    `Tokens: ~${block.atom.tokenEstimate}`,
    `Range: ${block.lineRange}`,
    block.anchors.length > 0 ? `Anchors: ${block.anchors.join(', ')}` : null,
    '',
    block.excerpt,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
    .trim();
}

export function buildSymbolCopyPayload(symbol: CodeAstSymbolModel): string {
  return [
    `Symbol: ${symbol.label}`,
    `Chunk: ${symbol.atom.id}`,
    `Semantic: ${symbol.atom.semanticType}`,
    `Fingerprint: ${symbol.atom.fingerprint}`,
    `Tokens: ~${symbol.atom.tokenEstimate}`,
    `Path: ${symbol.path}`,
    symbol.line ? `Line: L${symbol.line}` : null,
    `References: ${symbol.references}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
    .trim();
}

export function buildAnchorCopyPayload(symbol: CodeAstSymbolModel, rank: number): string {
  return [`Rank: #${rank}`, buildSymbolCopyPayload(symbol)].join('\n').trim();
}
