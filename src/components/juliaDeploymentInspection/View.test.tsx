import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JuliaDeploymentInspectionView } from './View';

describe('JuliaDeploymentInspectionView', () => {
  it('renders artifact lines and dispatches export actions', () => {
    const onCopyToml = vi.fn();
    const onDownloadJson = vi.fn();

    render(
      <JuliaDeploymentInspectionView
        locale="en"
        label="Julia rerank similarity_only"
        popoverLines={[
          'Artifact schema v1 · Generated 2026-03-27T12:00:00Z',
          'Service mode stream',
        ]}
        canCopyToml
        canDownloadJson
        actionState={null}
        onCopyToml={onCopyToml}
        onDownloadJson={onDownloadJson}
      />
    );

    expect(screen.getByText('Julia rerank similarity_only')).toBeInTheDocument();
    expect(screen.getByText('Julia deployment artifact')).toBeInTheDocument();
    expect(screen.getByText('Service mode stream')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy TOML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));

    expect(onCopyToml).toHaveBeenCalledTimes(1);
    expect(onDownloadJson).toHaveBeenCalledTimes(1);
  });
});
