import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainViewReferencesPanel } from './MainViewReferencesPanel';
import { getMainViewCopy } from './mainViewCopy';

describe('MainViewReferencesPanel', () => {
  it('shows empty guidance when no file is selected', () => {
    const copy = getMainViewCopy('en');

    render(
      <MainViewReferencesPanel
        selectedFile={null}
        relationships={[]}
        copy={copy}
      />
    );

    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText('Select a file from the project tree to inspect references and content.')).toBeInTheDocument();
    expect(screen.getByText('Select a file from the project tree to inspect its references.')).toBeInTheDocument();
  });

  it('renders selected file metadata and relationship list', () => {
    const copy = getMainViewCopy('en');

    render(
      <MainViewReferencesPanel
        selectedFile={{
          path: 'knowledge/context.md',
          projectName: 'kernel',
          rootLabel: 'knowledge',
        }}
        relationships={[
          { from: 'knowledge/context.md', to: 'skills/writer/SKILL.md', type: 'outgoing' },
          { from: 'docs/guide.md', to: 'knowledge/context.md', type: 'incoming' },
        ]}
        copy={copy}
      />
    );

    expect(screen.getByText('Focused file')).toBeInTheDocument();
    expect(screen.getByText('Project: kernel')).toBeInTheDocument();
    expect(screen.getByText('Root: knowledge')).toBeInTheDocument();
    expect(screen.getByText('skills/writer/SKILL.md')).toBeInTheDocument();
    expect(screen.getByText('docs/guide.md')).toBeInTheDocument();
    expect(screen.getByText('outgoing')).toBeInTheDocument();
    expect(screen.getByText('incoming')).toBeInTheDocument();
  });
});
