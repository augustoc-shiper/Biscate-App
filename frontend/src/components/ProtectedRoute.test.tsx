import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
const mockedUseAuth = useAuth as Mock;

function renderGuard(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Página de login</p>} />
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<p>Área administrativa</p>} />
        </Route>
        <Route path="/app" element={<p>Painel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('redireciona utilizadores sem sessão para /login', () => {
    mockedUseAuth.mockReturnValue({ token: null, user: null });
    renderGuard();
    expect(screen.getByText('Página de login')).toBeInTheDocument();
  });

  it('redireciona um papel não autorizado', () => {
    mockedUseAuth.mockReturnValue({
      token: 'jwt',
      user: { id: 'u1', role: 'client' },
    });
    renderGuard();
    expect(screen.getByText('Painel')).toBeInTheDocument();
    expect(screen.queryByText('Área administrativa')).not.toBeInTheDocument();
  });

  it('permite o acesso a administradores', () => {
    mockedUseAuth.mockReturnValue({
      token: 'jwt',
      user: { id: 'u1', role: 'admin' },
    });
    renderGuard();
    expect(screen.getByText('Área administrativa')).toBeInTheDocument();
  });
});
