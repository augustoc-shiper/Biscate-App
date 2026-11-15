import { renderHook } from '@testing-library/react';
import { io } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useSocket } from './useSocket';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));

const mockedIo = io as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useSocket', () => {
  it('liga ao servidor com o token do localStorage', () => {
    const fakeSocket = { disconnect: vi.fn() };
    mockedIo.mockReturnValue(fakeSocket);
    localStorage.setItem('token', 'jwt-socket');

    const { unmount } = renderHook(() => useSocket());

    expect(mockedIo).toHaveBeenCalledWith(
      'http://localhost:3001',
      expect.objectContaining({ auth: { token: 'jwt-socket' } }),
    );

    unmount();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });

  it('sem token não abre ligação', () => {
    renderHook(() => useSocket());

    expect(mockedIo).not.toHaveBeenCalled();
  });
});
