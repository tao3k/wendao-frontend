import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyEditor } from '../PropertyEditor';
import type { AcademicNode } from '../../../../types';

describe('PropertyEditor', () => {
  const mockNode: AcademicNode = {
    id: 'task-1',
    name: 'Process Data',
    type: 'task',
    position: [100, 200, 0],
  };

  const defaultProps = {
    node: mockNode,
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no node is selected', () => {
    render(<PropertyEditor node={null} />);

    expect(screen.getByText('选择文件或节点查看详情')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText('属性')).toBeInTheDocument();
    expect(screen.getByText('关系')).toBeInTheDocument();
  });

  it('should display node name as title', () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText('Process Data')).toBeInTheDocument();
  });

  it('should display node type badge', () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText('task')).toBeInTheDocument();
  });

  it('should display node ID in disabled field', () => {
    render(<PropertyEditor {...defaultProps} />);

    const idInput = screen.getByDisplayValue('task-1');
    expect(idInput).toBeDisabled();
  });

  it('should display node name in editable field', () => {
    render(<PropertyEditor {...defaultProps} />);

    const nameInput = screen.getByDisplayValue('Process Data');
    expect(nameInput).not.toBeDisabled();
  });

  it('should call onUpdate when name is changed', () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const nameInput = screen.getByDisplayValue('Process Data');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(onUpdate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should show position fields when node has position', () => {
    render(<PropertyEditor {...defaultProps} />);

    expect(screen.getByText('位置')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });

  it('should not show position fields when node has no position', () => {
    const nodeWithoutPosition: AcademicNode = {
      id: 'task-2',
      name: 'No Position',
      type: 'task',
    };

    render(<PropertyEditor node={nodeWithoutPosition} />);

    expect(screen.queryByText('位置')).not.toBeInTheDocument();
  });

  it('should call onUpdate with new position when X is changed', () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const xInput = screen.getByDisplayValue('100');
    fireEvent.change(xInput, { target: { value: '150' } });

    expect(onUpdate).toHaveBeenCalledWith({
      position: [150, 200, 0],
    });
  });

  it('should call onUpdate with new position when Y is changed', () => {
    const onUpdate = vi.fn();
    render(<PropertyEditor {...defaultProps} onUpdate={onUpdate} />);

    const yInput = screen.getByDisplayValue('200');
    fireEvent.change(yInput, { target: { value: '250' } });

    expect(onUpdate).toHaveBeenCalledWith({
      position: [100, 250, 0],
    });
  });

  it('should apply correct type class for task', () => {
    const { container } = render(<PropertyEditor {...defaultProps} />);

    expect(container.querySelector('.property-editor__type--task')).toBeInTheDocument();
  });

  it('should apply correct type class for event', () => {
    const eventNode: AcademicNode = {
      id: 'start-1',
      name: 'Start',
      type: 'event',
    };

    const { container } = render(<PropertyEditor node={eventNode} />);

    expect(container.querySelector('.property-editor__type--event')).toBeInTheDocument();
  });

  it('should apply correct type class for gateway', () => {
    const gatewayNode: AcademicNode = {
      id: 'gateway-1',
      name: 'Decision',
      type: 'gateway',
    };

    const { container } = render(<PropertyEditor node={gatewayNode} />);

    expect(container.querySelector('.property-editor__type--gateway')).toBeInTheDocument();
  });

  it('should format special types correctly', () => {
    const startEventNode: AcademicNode = {
      id: 'start-1',
      name: 'Start',
      type: 'startEvent',
    };

    render(<PropertyEditor node={startEventNode} />);

    expect(screen.getByText('Start Event')).toBeInTheDocument();
  });

  it('should show Z position in metadata section', () => {
    render(<PropertyEditor {...defaultProps} />);

    // Expand metadata group
    fireEvent.click(screen.getByText('元数据'));

    expect(screen.getByText('Z 位置')).toBeInTheDocument();
  });

  it('should show type in metadata section', () => {
    const { container } = render(<PropertyEditor {...defaultProps} />);

    // Expand metadata group
    fireEvent.click(screen.getByText('元数据'));

    // Look for type in the metadata section specifically
    const metadataSection = container.querySelector('.property-editor__metadata');
    expect(metadataSection?.textContent).toContain('task');
  });

  it('should use node ID as title when name is empty', () => {
    const nodeWithoutName: AcademicNode = {
      id: 'node-123',
      name: '',
      type: 'task',
    };

    render(<PropertyEditor node={nodeWithoutName} />);

    expect(screen.getByText('node-123')).toBeInTheDocument();
  });

  it('should switch to relationships tab when clicked', () => {
    const relationships = [{ type: 'skill', to: 'writer' }];
    render(<PropertyEditor {...defaultProps} relationships={relationships} />);

    fireEvent.click(screen.getByText('关系'));

    // Should show relationships count badge
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show empty relationships state', () => {
    render(<PropertyEditor {...defaultProps} relationships={[]} />);

    fireEvent.click(screen.getByText('关系'));

    expect(screen.getByText('暂无关系数据')).toBeInTheDocument();
  });
});
