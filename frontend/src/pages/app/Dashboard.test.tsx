import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { getDashboard } from '../../api/dashboard.api';
import Dashboard from './Dashboard';

vi.mock('../../api/dashboard.api', () => ({ getDashboard: vi.fn() }));

const mockGetDashboard = getDashboard as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  it('mostra as stats e o estado activo do plano', async () => {
    mockGetDashboard.mockResolvedValue({
      visitas: 42,
      contactos: 7,
      ratingAvg: 4.5,
      plan: { active: true, daysLeft: 12 },
      pendingOffers: [
        {
          id: 'off-1',
          price: 9000,
          message: 'Posso fazer amanhã de manhã',
          status: 'sent',
          createdAt: '2026-11-14T10:00:00.000Z',
          request: {
            id: 'req-1',
            description: 'Lavar o ar condicionado',
            status: 'open',
          },
        },
      ],
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('Plano activo')).toBeInTheDocument();
    expect(screen.getByText('12 dias restantes')).toBeInTheDocument();
    expect(
      screen.getByText('Lavar o ar condicionado'),
    ).toBeInTheDocument();
    expect(screen.getByText('Posso fazer amanhã de manhã')).toBeInTheDocument();
  });

  it('mostra o CTA Escolher plano quando o plano está expirado', async () => {
    mockGetDashboard.mockResolvedValue({
      visitas: 3,
      contactos: 0,
      ratingAvg: 0,
      plan: { active: false, daysLeft: 0 },
      pendingOffers: [],
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Plano expirado')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /escolher plano/i });
    expect(cta).toHaveAttribute('href', '/app/plans');
    expect(screen.getByText('Nenhuma proposta pendente.')).toBeInTheDocument();
  });
});
