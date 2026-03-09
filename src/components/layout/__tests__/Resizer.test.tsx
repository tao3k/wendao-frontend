import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Resizer } from '../Resizer';

describe('Resizer', () => {
  const mockOnResize = vi.fn();

  beforeEach(() => {
    mockOnResize.mockClear();
  });

  it('should render with correct side class', () => {
    const { container, rerender } = render(
      <Resizer side="left" currentWidth={260} onResize={mockOnResize} />
    );
    expect(container.querySelector('.resizer--left')).toBeInTheDocument();

    rerender(<Resizer side="right" currentWidth={300} onResize={mockOnResize} />);
    expect(container.querySelector('.resizer--right')).toBeInTheDocument();
  });

  it('should start dragging on mousedown', () => {
    const { container } = render(<Resizer side="left" currentWidth={260} onResize={mockOnResize} />);

    const resizer = container.querySelector('.resizer') as HTMLElement;
    fireEvent.mouseDown(resizer, { clientX: 100 });

    expect(resizer).toHaveClass('resizer--dragging');
  });

  it('should call onResize with clamped width within min/max bounds', () => {
    const { container } = render(
      <Resizer
        side="left"
        currentWidth={260}
        onResize={mockOnResize}
        minWidth={180}
        maxWidth={450}
      />
    );

    const resizer = container.querySelector('.resizer') as HTMLElement;

    // Start drag
    fireEvent.mouseDown(resizer, { clientX: 100 });

    // Move mouse right by 50px (should increase width to 310)
    fireEvent.mouseMove(document, { clientX: 150 });

    expect(mockOnResize).toHaveBeenCalledWith(310);
  });

  it('should clamp width to minimum', () => {
    const { container } = render(
      <Resizer
        side="left"
        currentWidth={200}
        onResize={mockOnResize}
        minWidth={180}
        maxWidth={450}
      />
    );

    const resizer = container.querySelector('.resizer') as HTMLElement;

    fireEvent.mouseDown(resizer, { clientX: 100 });
    // Move left by 100px (would go below min)
    fireEvent.mouseMove(document, { clientX: 0 });

    expect(mockOnResize).toHaveBeenCalledWith(180); // Clamped to min
  });

  it('should clamp width to maximum', () => {
    const { container } = render(
      <Resizer
        side="left"
        currentWidth={400}
        onResize={mockOnResize}
        minWidth={180}
        maxWidth={450}
      />
    );

    const resizer = container.querySelector('.resizer') as HTMLElement;

    fireEvent.mouseDown(resizer, { clientX: 100 });
    // Move right by 100px (would exceed max)
    fireEvent.mouseMove(document, { clientX: 200 });

    expect(mockOnResize).toHaveBeenCalledWith(450); // Clamped to max
  });

  it('should stop dragging on mouseup', () => {
    const { container } = render(<Resizer side="left" currentWidth={260} onResize={mockOnResize} />);

    const resizer = container.querySelector('.resizer') as HTMLElement;

    fireEvent.mouseDown(resizer, { clientX: 100 });
    expect(resizer).toHaveClass('resizer--dragging');

    fireEvent.mouseUp(document);
    expect(resizer).not.toHaveClass('resizer--dragging');
  });

  it('should invert delta for right-side resizer', () => {
    const { container } = render(
      <Resizer
        side="right"
        currentWidth={300}
        onResize={mockOnResize}
        minWidth={200}
        maxWidth={500}
      />
    );

    const resizer = container.querySelector('.resizer') as HTMLElement;

    fireEvent.mouseDown(resizer, { clientX: 100 });
    // Move left by 50px (should increase width for right resizer)
    fireEvent.mouseMove(document, { clientX: 50 });

    expect(mockOnResize).toHaveBeenCalledWith(350);
  });
});
