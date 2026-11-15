import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { loginRequest, registerRequest } from '../api/auth.api';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/auth.api', () => ({
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  meRequest: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('AuthContext', () => {
  it('login guarda token no localStorage e user no state', async () => {
    const user = {
      id: 'u1',
      name: 'Ana Cliente',
      email: 'ana@test.ao',
      role: 'client' as const,
    };
    (loginRequest as Mock).mockResolvedValue({ user, token: 'jwt-1' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('ana@test.ao', 'senha123');
    });

    expect(loginRequest).toHaveBeenCalledWith('ana@test.ao', 'senha123');
    expect(localStorage.getItem('token')).toBe('jwt-1');
    expect(result.current.token).toBe('jwt-1');
    expect(result.current.user).toEqual(user);
    expect(result.current.loading).toBe(false);
  });

  it('logout limpa token, user e estado', async () => {
    const user = {
      id: 'u1',
      name: 'Ana Cliente',
      email: 'ana@test.ao',
      role: 'client' as const,
    };
    (loginRequest as Mock).mockResolvedValue({ user, token: 'jwt-1' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('ana@test.ao', 'senha123');
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('registo guarda sessão como o login', async () => {
    const user = {
      id: 'u2',
      name: 'Novo',
      email: 'novo@test.ao',
      role: 'client' as const,
    };
    (registerRequest as Mock).mockResolvedValue({ user, token: 'jwt-2' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.register({
        name: 'Novo',
        email: 'novo@test.ao',
        password: 'senha123',
        role: 'client',
      });
    });

    expect(localStorage.getItem('token')).toBe('jwt-2');
    expect(result.current.user).toEqual(user);
  });

  it('sem sessão começa com user null e sem chamada /me', async () => {
    const { meRequest } = await import('../api/auth.api');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(meRequest).not.toHaveBeenCalled();
  });
});
