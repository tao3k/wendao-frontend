import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CodeSyntaxHighlighter, normalizeCodeLanguage } from './CodeSyntaxHighlighter';

describe('CodeSyntaxHighlighter', () => {
  it('renders highlighted tokens for non-TypeScript languages', async () => {
    const { container } = render(
      <CodeSyntaxHighlighter source={'fn main() {\n  println!("hello");\n}'} language="rust" />
    );

    await waitFor(() => {
      expect(container.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
    });
    expect(container.textContent).toContain('fn main()');
  });

  it('falls back to plain text when no language is provided', () => {
    const { container } = render(<CodeSyntaxHighlighter source="export const value = 1;" language={null} />);

    expect(container.querySelector('.code-syntax-highlighter__token')).toBeNull();
    expect(container.textContent).toBe('export const value = 1;');
  });

  it('normalizes common shorthand aliases for python, rust, and julia', async () => {
    expect(normalizeCodeLanguage('py')).toBe('python');
    expect(normalizeCodeLanguage('rs')).toBe('rust');
    expect(normalizeCodeLanguage('jl')).toBe('julia');
    expect(normalizeCodeLanguage('code')).toBeNull();
  });

  it('renders highlighted tokens for shorthand aliases', async () => {
    const samples = [
      { language: 'py', source: 'def main():\n    print("hello")\n' },
      { language: 'rs', source: 'fn main() {\n  println!("hello");\n}\n' },
      { language: 'jl', source: 'function main()\n  println("hello")\nend\n' },
    ] as const;

    for (const sample of samples) {
      const { container, unmount } = render(
        <CodeSyntaxHighlighter source={sample.source} language={sample.language} />
      );

      await waitFor(() => {
        expect(container.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
      });
      expect(container.textContent).toContain('hello');
      unmount();
    }
  });

  it('falls back to the source path extension when the language is generic', async () => {
    const { container } = render(
      <CodeSyntaxHighlighter
        source={'fn main() {\n  println!("hello");\n}'}
        language="code"
        sourcePath="src/lib.rs"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
    });
    expect(container.textContent).toContain('fn main()');
  });

  it('falls back to plain text when the normalized language is outside the curated Shiki bundle', () => {
    const { container } = render(<CodeSyntaxHighlighter source="puts 'hello'" language="ruby" />);

    expect(container.querySelector('.code-syntax-highlighter__token')).toBeNull();
    expect(container.textContent).toBe("puts 'hello'");
  });
});
