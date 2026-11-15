import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useAuth } from '../context/AuthContext';
import Splash from './Splash';
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

afterEach(() => {
  vi.useRealTimers();
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

describe('Splash', () => {
  it('desaparece após 2,2s chamando onDone (timer fake)', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<Splash onDone={onDone} />);

    expect(screen.getByText(/o seu kamba para qualquer biscate/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2199);
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
