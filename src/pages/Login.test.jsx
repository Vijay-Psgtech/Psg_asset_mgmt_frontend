import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login.jsx';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Login />
    </MemoryRouter>
  );
}

describe('Login page', () => {
  it('submits credentials and renders an API authentication error', async () => {
    login.mockRejectedValue({
      response: { data: { message: 'Invalid email or password' } },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'bad@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('bad@example.test', 'wrong-password');
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
  });

  it('blocks a password reset when confirmation does not match', async () => {
    renderLogin('/login?resetToken=abcdef');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText('The passwords do not match.')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });
});
