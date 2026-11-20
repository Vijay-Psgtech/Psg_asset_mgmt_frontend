import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Import from './Import.jsx';

vi.mock('../api/client.js', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function chooseCsv() {
  const file = new File(['name,category\nLaptop,Laptop'], 'assets.csv', { type: 'text/csv' });
  fireEvent.change(screen.getByLabelText('CSV file'), { target: { files: [file] } });
}

function submitImport() {
  fireEvent.submit(screen.getByRole('button', { name: 'Import assets' }).closest('form'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useAuth.mockReturnValue({ user: { role: 'admin' }, institutions: [] });
});

describe('Import page', () => {
  it('offers each inventory type and states the required columns', () => {
    render(<Import />);

    expect(screen.getByRole('option', { name: 'Assets' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Accessories' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Consumables' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Licenses' })).toBeTruthy();
    expect(screen.getByText('Required:', { exact: false }).textContent).toContain('name');

    fireEvent.change(screen.getByLabelText('Inventory type'), { target: { value: 'licenses' } });
    expect(screen.getByText('Required:', { exact: false }).textContent).toContain('seats');
  });

  it('uploads the selected CSV for the selected inventory type', async () => {
    api.post.mockResolvedValue({ data: { imported: 1 } });
    render(<Import />);
    chooseCsv();
    submitImport();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/import/assets', expect.any(FormData));
      expect(screen.getByText('1 asset imported successfully.')).toBeTruthy();
    });
  });

  it('sends the selected institution for superadmin imports', async () => {
    useAuth.mockReturnValue({
      user: { role: 'superadmin' },
      institutions: [{ id: 'institution-1', name: 'Test Institution' }],
    });
    api.post.mockResolvedValue({ data: { imported: 1 } });
    render(<Import />);
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'institution-1' } });
    chooseCsv();
    submitImport();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(api.post.mock.calls[0][1].get('institutionId')).toBe('institution-1');
    });
  });

  it('explains that an expired session requires signing in again', async () => {
    api.post.mockRejectedValue({ response: { status: 401 } });
    render(<Import />);
    chooseCsv();
    submitImport();

    await waitFor(() => {
      expect(screen.getByText('Your session has expired. Sign in again, then retry the import.')).toBeTruthy();
    });
  });

  it('shows the request reference when the server returns an internal error', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 500,
        data: { message: 'Something went wrong' },
        headers: { 'x-request-id': 'request-123' },
      },
    });
    render(<Import />);
    chooseCsv();
    submitImport();

    await waitFor(() => {
      expect(screen.getByText('Something went wrong Reference: request-123')).toBeTruthy();
    });
  });
});
