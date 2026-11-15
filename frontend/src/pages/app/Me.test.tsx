import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { listFavorites } from '../../api/professionals.api';
import {
  listNotifications,
  markRead,
} from '../../api/notifications.api';
import { useAuth } from '../../context/AuthContext';
import Me from './Me';
import Notifications from './Notifications';

vi.mock('../../api/notifications.api', () => ({
  listNotifications: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('../../api/professionals.api', () => ({
  listProfessionals: vi.fn(),
  getProfessional: vi.fn(),
  listCategories: vi.fn(),
  listBairros: vi.fn(),
  listFavorites: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

const mockedListNotifications = listNotifications as Mock;
const mockedMarkRead = markRead as Mock;
const mockedListFavorites = listFavorites as Mock;
const mockedUseAuth = useAuth as Mock;

const logout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: {
      id: 'u1',
      name: 'Maria Client',
      email: 'maria@ex.com',
      role: 'client',
      avatarUrl: null,
    },
    token: 'jwt',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout,
  });
  mockedListFavorites.mockResolvedValue([]);
  mockedListNotifications.mockResolvedValue({
    data: [
      {
        id: 'n1',
        kind: 'message',
        body: 'Nova mensagem de Joaquim Neto',
        readAt: null,
        createdAt: '2026-11-14T10:00:00.000Z',
      },
    ],
    meta: { unread: 3 },
  });
  mockedMarkRead.mockResolvedValue({ updated: 3 });
});

function renderMe() {
  return render(
    <MemoryRouter initialEntries={['/app/me']}>
      <Routes>
        <Route path="/app/me" element={<Me />} />
        <Route path="/app/notificacoes" element={<Notifications />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Me', () => {
  it('mostra os dados do utilizador e chama logout no botão', async () => {
    const user = userEvent.setup();
    renderMe();

    expect(await screen.findByText('Maria Client')).toBeInTheDocument();
    expect(screen.getByText('maria@ex.com')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/3 não lidas/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /terminar sessão/i }),
    );

    expect(logout).toHaveBeenCalled();
  });
});

describe('Notifications', () => {
  it('marca as notificações como lidas ao abrir', async () => {
    render(
      <MemoryRouter initialEntries={['/app/notificacoes']}>
        <Routes>
          <Route path="/app/notificacoes" element={<Notifications />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Nova mensagem de Joaquim Neto'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedMarkRead).toHaveBeenCalled();
    });
  });
});
