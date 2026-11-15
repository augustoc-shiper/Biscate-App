import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';

describe('apiClient', () => {
  it('injecta Authorization com o token do localStorage', async () => {
    const adapter = vi.fn((config: { headers: unknown }) =>
      Promise.resolve({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    );
    apiClient.defaults.adapter = adapter as never;
    localStorage.setItem('token', 'jwt-de-teste');

    await apiClient.get('/health');

    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0] as {
      headers: { get: (name: string) => string | null };
    };
    expect(config.headers.get('Authorization')).toBe('Bearer jwt-de-teste');
  });

  it('sem token não envia Authorization', async () => {
    const adapter = vi.fn((config: { headers: unknown }) =>
      Promise.resolve({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    );
    apiClient.defaults.adapter = adapter as never;
    localStorage.removeItem('token');

    await apiClient.get('/health');

    const config = adapter.mock.calls[0][0] as {
      headers: {
        get: (name: string) => string | null;
        has: (name: string) => boolean;
      };
    };
    expect(config.headers.has('Authorization')).toBe(false);
  });
});
