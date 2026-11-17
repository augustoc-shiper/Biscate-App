import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useAuth } from '../context/AuthContext';
import TabBar from './TabBar';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = useAuth as Mock;

function renderTabBar(role: 'client' | 'professional', path = '/app') {
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1', name: 'Teste', role },
    token: 'jwt',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TabBar', () => {
  it('renderiza as 4 tabs do cliente', () => {
    renderTabBar('client');

    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mensagens/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /painel/i })).not.toBeInTheDocument();
  });

  it('renderiza as 4 tabs do profissional', () => {
    renderTabBar('professional');

    expect(screen.getByRole('link', { name: /painel/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mensagens/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /plano/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /início/i })).not.toBeInTheDocument();
  });

  it('a tab activa tem destaque', () => {
    renderTabBar('client', '/app/requests');

    const active = screen.getByRole('link', { name: /pedidos/i });
    expect(active.className).toContain('active');
    const inactive = screen.getByRole('link', { name: /início/i });
    expect(inactive.className).not.toContain('active');
  });
});
