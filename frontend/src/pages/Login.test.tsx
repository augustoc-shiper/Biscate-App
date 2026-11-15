import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = useAuth as Mock;

function authMock(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    token: null,
    loading: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<div>app-home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue(authMock());
});

describe('Login', () => {
  it('renderiza as tabs Entrar e Criar conta', () => {
    renderLogin();
    expect(screen.getByRole('tab', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Criar conta' })).toBeInTheDocument();
  });

  it('submeter com email inválido mostra erro e não chama login', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'nao-email');
    await user.type(screen.getByLabelText(/senha/i), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    const auth = mockedUseAuth();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('login chamado com os valores do formulário e navega para /app', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'ana@test.ao');
    await user.type(screen.getByLabelText(/senha/i), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('app-home')).toBeInTheDocument();
    const auth = mockedUseAuth();
    expect(auth.login).toHaveBeenCalledWith('ana@test.ao', 'senha123');
  });

  it('erro de API mostra a mensagem vinda do backend', async () => {
    const login = vi.fn().mockRejectedValue({
      response: { data: { error: { message: 'Email ou senha incorrectos' } } },
    });
    mockedUseAuth.mockReturnValue(authMock({ login }));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'ana@test.ao');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Email ou senha incorrectos'),
    ).toBeInTheDocument();
  });

  it('tab Criar conta mostra nome, escolha de role e submit próprio', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('tab', { name: 'Criar conta' }));

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cliente/i })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /profissional/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar conta' }),
    ).toBeInTheDocument();
  });
});
