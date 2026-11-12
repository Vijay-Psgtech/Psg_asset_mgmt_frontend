import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import AccessoryCheckoutModal from './AccessoryCheckoutModal.jsx';

vi.mock('../api/client.js', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const createAccessory = (overrides = {}) => ({
  _id: 'accessory-1',
  name: 'USB-C Dock',
  totalQty: 4,
  qtyAvailable: 4,
  checkouts: [],
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccessoryCheckoutModal', () => {
  it('submits a valid checkout and refreshes the parent data', async () => {
    const onChanged = vi.fn();
    api.post.mockResolvedValue({ data: {} });

    render(
      <AccessoryCheckoutModal
        accessory={createAccessory()}
        onClose={vi.fn()}
        onChanged={onChanged}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: '  Alex Kim  ' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/accessories/accessory-1/checkout', {
        name: 'Alex Kim',
        email: '',
        department: '',
        quantity: 2,
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks quantities above current availability', async () => {
    api.post.mockResolvedValue({ data: {} });
    render(
      <AccessoryCheckoutModal
        accessory={createAccessory({ totalQty: 1, qtyAvailable: 1 })}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Alex Kim' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Enter a whole number between 1 and 1.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a server stock conflict without losing the form', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Not enough stock available for that quantity' } },
    });
    render(
      <AccessoryCheckoutModal
        accessory={createAccessory()}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Alex Kim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check Out' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Not enough stock available');
    expect(screen.getByPlaceholderText('Name').value).toBe('Alex Kim');
  });

  it('checks in an active checkout and refreshes the parent data', async () => {
    const onChanged = vi.fn();
    api.patch.mockResolvedValue({ data: {} });
    render(
      <AccessoryCheckoutModal
        accessory={createAccessory({
          checkouts: [{ _id: 'checkout-1', quantity: 1, assignedTo: { name: 'Alex Kim' } }],
          qtyAvailable: 3,
        })}
        onClose={vi.fn()}
        onChanged={onChanged}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/accessories/accessory-1/checkouts/checkout-1/checkin');
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });
});
