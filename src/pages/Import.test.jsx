import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import Import from './Import.jsx';

vi.mock('../api/client.js', () => ({
  default: {
    post: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Import page', () => {
  it('explains that an expired session requires signing in again', async () => {
    api.post.mockRejectedValue({ response: { status: 401 } });
    render(<Import />);

    fireEvent.click(screen.getByRole('button', { name: 'Import to database' }));

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

    fireEvent.click(screen.getByRole('button', { name: 'Import to database' }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong Reference: request-123')).toBeTruthy();
    });
  });
});
