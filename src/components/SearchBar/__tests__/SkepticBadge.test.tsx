import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkepticBadge } from '../SkepticBadge';

describe('SkepticBadge', () => {
  it('renders nothing for unknown state', () => {
    const { container } = render(<SkepticBadge state="unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders verified shield for verified state', () => {
    const { container } = render(<SkepticBadge state="verified" />);
    expect(container.querySelector('.skeptic-badge.state-verified')).not.toBeNull();
  });

  it('renders alert shield for unverified state', () => {
    const { container } = render(<SkepticBadge state="unverified" />);
    expect(container.querySelector('.skeptic-badge.state-unverified')).not.toBeNull();
  });
});
