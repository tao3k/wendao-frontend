import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeBrowser } from '../NodeBrowser';
import { AcademicNode } from '../../../types';

describe('NodeBrowser', () => {
  const mockNodes: AcademicNode[] = [
    { id: 'start-1', name: 'Start Event', type: 'event' },
    { id: 'task-1', name: 'Process Data', type: 'task' },
    { id: 'task-2', name: 'Validate Input', type: 'task' },
    { id: 'gateway-1', name: 'Decision', type: 'gateway' },
    { id: 'end-1', name: 'End Event', type: 'event' },
  ];

  const defaultProps = {
    nodes: mockNodes,
    onNodeSelect: vi.fn(),
    onNodeDoubleClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all nodes', () => {
    render(<NodeBrowser {...defaultProps} />);

    expect(screen.getByText('Start Event')).toBeInTheDocument();
    expect(screen.getByText('Process Data')).toBeInTheDocument();
    expect(screen.getByText('Validate Input')).toBeInTheDocument();
    expect(screen.getByText('Decision')).toBeInTheDocument();
    expect(screen.getByText('End Event')).toBeInTheDocument();
  });

  it('should display node count', () => {
    render(<NodeBrowser {...defaultProps} />);

    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('should filter nodes by search query', () => {
    render(<NodeBrowser {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'Process' } });

    expect(screen.getByText('Process Data')).toBeInTheDocument();
    expect(screen.queryByText('Validate Input')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('should filter nodes by ID when searching', () => {
    render(<NodeBrowser {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'task-2' } });

    expect(screen.getByText('Validate Input')).toBeInTheDocument();
    expect(screen.queryByText('Process Data')).not.toBeInTheDocument();
  });

  it('should filter nodes by type', () => {
    render(<NodeBrowser {...defaultProps} />);

    const tasksBtn = screen.getByRole('button', { name: 'Tasks' });
    fireEvent.click(tasksBtn);

    expect(screen.getByText('Process Data')).toBeInTheDocument();
    expect(screen.getByText('Validate Input')).toBeInTheDocument();
    expect(screen.queryByText('Start Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Decision')).not.toBeInTheDocument();

    // Shows filtered count
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('should show all nodes when "All" filter is clicked', () => {
    render(<NodeBrowser {...defaultProps} />);

    // First filter by tasks
    const tasksBtn = screen.getByRole('button', { name: 'Tasks' });
    fireEvent.click(tasksBtn);

    // Then click All
    const allBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allBtn);

    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('should combine search and type filter', () => {
    render(<NodeBrowser {...defaultProps} />);

    // Filter by event type
    const eventsBtn = screen.getByRole('button', { name: 'Events' });
    fireEvent.click(eventsBtn);

    // Search for "Start"
    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'Start' } });

    expect(screen.getByText('Start Event')).toBeInTheDocument();
    expect(screen.queryByText('End Event')).not.toBeInTheDocument();
  });

  it('should call onNodeSelect when node is selected', () => {
    const onNodeSelect = vi.fn();
    render(<NodeBrowser {...defaultProps} onNodeSelect={onNodeSelect} />);

    fireEvent.click(screen.getByText('Process Data'));

    expect(onNodeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1', name: 'Process Data' })
    );
  });

  it('should call onNodeDoubleClick when node is double-clicked', () => {
    const onNodeDoubleClick = vi.fn();
    render(<NodeBrowser {...defaultProps} onNodeDoubleClick={onNodeDoubleClick} />);

    fireEvent.doubleClick(screen.getByText('Process Data'));

    expect(onNodeDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1' })
    );
  });

  it('should highlight selected node', () => {
    render(
      <NodeBrowser
        {...defaultProps}
        selectedNodeId="task-1"
      />
    );

    const selectedRow = screen.getByText('Process Data').closest('.node-tree__node');
    expect(selectedRow).toHaveClass('node-tree__node--selected');
  });

  it('should show empty state when no nodes match filter', () => {
    render(<NodeBrowser {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No nodes found')).toBeInTheDocument();
  });

  it('should render panel header with title', () => {
    render(<NodeBrowser {...defaultProps} />);

    expect(screen.getByText('Nodes')).toBeInTheDocument();
  });
});
