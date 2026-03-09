import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeTree, TreeNode } from '../NodeTree';

describe('NodeTree', () => {
  const mockTree: TreeNode[] = [
    {
      id: 'node-1',
      name: 'Task One',
      type: 'task',
      children: [
        { id: 'node-1-1', name: 'Sub Task', type: 'task', children: [] },
      ],
    },
    {
      id: 'node-2',
      name: 'Event Start',
      type: 'event',
      children: [],
    },
    {
      id: 'node-3',
      name: 'Gateway Alpha',
      type: 'gateway',
      children: [],
    },
  ];

  const defaultProps = {
    tree: mockTree,
    expandedNodes: new Set<string>(),
    onToggleExpand: vi.fn(),
    onSelect: vi.fn(),
    onDoubleClick: vi.fn(),
  };

  it('should render all nodes', () => {
    render(<NodeTree {...defaultProps} />);

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Event Start')).toBeInTheDocument();
    expect(screen.getByText('Gateway Alpha')).toBeInTheDocument();
  });

  it('should show empty state when no nodes', () => {
    render(<NodeTree {...defaultProps} tree={[]} />);

    expect(screen.getByText('No nodes found')).toBeInTheDocument();
  });

  it('should call onSelect when node is clicked', () => {
    const onSelect = vi.fn();
    render(<NodeTree {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Task One'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-1', name: 'Task One' })
    );
  });

  it('should call onDoubleClick when node is double-clicked', () => {
    const onDoubleClick = vi.fn();
    render(<NodeTree {...defaultProps} onDoubleClick={onDoubleClick} />);

    fireEvent.doubleClick(screen.getByText('Task One'));

    expect(onDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-1' })
    );
  });

  it('should show toggle button for nodes with children', () => {
    render(<NodeTree {...defaultProps} />);

    // Task One has children, should have toggle
    const taskOneRow = screen.getByText('Task One').closest('.node-tree__content');
    expect(taskOneRow?.querySelector('.node-tree__toggle')).toBeInTheDocument();

    // Event Start has no children, should not have toggle
    const eventRow = screen.getByText('Event Start').closest('.node-tree__content');
    expect(eventRow?.querySelector('.node-tree__toggle')).not.toBeInTheDocument();
  });

  it('should call onToggleExpand when toggle is clicked', () => {
    const onToggleExpand = vi.fn();
    render(<NodeTree {...defaultProps} onToggleExpand={onToggleExpand} />);

    const toggleBtn = screen.getByText('Task One')
      .closest('.node-tree__content')
      ?.querySelector('.node-tree__toggle') as HTMLElement;

    fireEvent.click(toggleBtn);

    expect(onToggleExpand).toHaveBeenCalledWith('node-1');
  });

  it('should show children when node is expanded', () => {
    render(
      <NodeTree
        {...defaultProps}
        expandedNodes={new Set(['node-1'])}
      />
    );

    expect(screen.getByText('Sub Task')).toBeInTheDocument();
  });

  it('should hide children when node is collapsed', () => {
    render(<NodeTree {...defaultProps} />);

    expect(screen.queryByText('Sub Task')).not.toBeInTheDocument();
  });

  it('should apply selected class to selected node', () => {
    render(
      <NodeTree
        {...defaultProps}
        selectedNodeId="node-2"
      />
    );

    const selectedRow = screen.getByText('Event Start').closest('.node-tree__node');
    expect(selectedRow).toHaveClass('node-tree__node--selected');
  });

  it('should apply correct type icon classes', () => {
    const { container } = render(<NodeTree {...defaultProps} />);

    const taskIcon = container.querySelector('.node-tree__icon--task');
    const eventIcon = container.querySelector('.node-tree__icon--event');
    const gatewayIcon = container.querySelector('.node-tree__icon--gateway');

    expect(taskIcon).toBeInTheDocument();
    expect(eventIcon).toBeInTheDocument();
    expect(gatewayIcon).toBeInTheDocument();
  });

  it('should render nested nodes with correct depth', () => {
    const { container } = render(
      <NodeTree
        {...defaultProps}
        expandedNodes={new Set(['node-1'])}
      />
    );

    const childNode = screen.getByText('Sub Task').closest('.node-tree__node') as HTMLElement;
    expect(childNode.style.getPropertyValue('--depth')).toBe('1');
  });
});
