import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Quantity, Pagination, Modal } from './UI';
import { useState } from 'react';
describe('Stock and navigation controls', () => {
  it('keeps the typing focus when a modal form updates', () => {
    function Form() {
      const [value, setValue] = useState('');
      return (
        <Modal title="Chỉnh sửa" onClose={() => {}}>
          <input aria-label="Tên" value={value} onChange={(e) => setValue(e.target.value)} />
        </Modal>
      );
    }
    render(<Form />);
    const input = screen.getByRole('textbox', { name: 'Tên' });
    input.focus();
    fireEvent.change(input, { target: { value: 'Ba mẹ' } });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('Ba mẹ');
    cleanup();
  });
  it('prevents quantity outside available stock', () => {
    const change = vi.fn();
    const view = render(<Quantity value={1} max={1} onChange={change} />);
    expect(screen.getByRole('button', { name: 'Giảm số lượng' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tăng số lượng' })).toBeDisabled();
    view.rerender(<Quantity value={2} max={3} onChange={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    expect(change).toHaveBeenLastCalledWith(3);
    cleanup();
  });
  it('disables pagination beyond page boundaries', () => {
    const change = vi.fn();
    render(<Pagination page={1} pages={4} onChange={change} />);
    expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    expect(change).toHaveBeenCalledWith(2);
    cleanup();
  });
});
