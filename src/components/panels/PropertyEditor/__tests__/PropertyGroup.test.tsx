import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyGroup } from '../PropertyGroup';

describe('PropertyGroup', () => {
  it('should render title', () => {
    render(
      <PropertyGroup title="General">
        <div>Content</div>
      </PropertyGroup>
    );

    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('should render children when expanded', () => {
    render(
      <PropertyGroup title="General" defaultExpanded={true}>
        <div data-testid="child">Content</div>
      </PropertyGroup>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should hide children when collapsed', () => {
    render(
      <PropertyGroup title="General" defaultExpanded={false}>
        <div data-testid="child">Content</div>
      </PropertyGroup>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('should be expanded by default', () => {
    render(
      <PropertyGroup title="General">
        <div data-testid="child">Content</div>
      </PropertyGroup>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should toggle expansion on header click', () => {
    render(
      <PropertyGroup title="General" defaultExpanded={true}>
        <div data-testid="child">Content</div>
      </PropertyGroup>
    );

    // Initially expanded
    expect(screen.getByTestId('child')).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByText('General'));
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should show chevron icon indicating expansion state', () => {
    const { container } = render(
      <PropertyGroup title="General" defaultExpanded={true}>
        <div>Content</div>
      </PropertyGroup>
    );

    // Expanded shows chevron-down
    const chevron = container.querySelector('.property-group__toggle svg');
    expect(chevron).toBeInTheDocument();
  });
});
