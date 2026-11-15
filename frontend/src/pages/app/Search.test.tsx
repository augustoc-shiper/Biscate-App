import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  listBairros,
  listCategories,
  listProfessionals,
} from '../../api/professionals.api';
import Search from './Search';

vi.mock('../../api/professionals.api', () => ({
  listProfessionals: vi.fn(),
  listCategories: vi.fn(),
  listBairros: vi.fn(),
  getProfessional: vi.fn(),
  listFavorites: vi.fn(),
  toggleFavorite: vi.fn(),
}));

const mockedListProfessionals = listProfessionals as Mock;
const mockedListCategories = listCategories as Mock;
const mockedListBairros = listBairros as Mock;

const FIXTURES = [
  {
    id: 'p1',
    name: 'Joaquim Neto',
    category: 'Canalizador',
    bairro: 'Talatona',
    priceMin: 5000,
    priceText: null,
    ratingAvg: 4.8,
    ratingCount: 12,
    verified: true,
    avatarUrl: null,
    availableToday: true,
    distanceKm: 4,
  },
  {
    id: 'p2',
    name: 'António Luz',
    category: 'Electricista',
    bairro: 'Maianga',
    priceMin: 4000,
    priceText: null,
    ratingAvg: 4.5,
    ratingCount: 8,
    verified: false,
    avatarUrl: null,
    availableToday: false,
    distanceKm: 9,
  },
];

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/app/search']}>
      <Search />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedListCategories.mockResolvedValue([
    { id: 1, name: 'Canalizador', icon: 'wrench' },
    { id: 2, name: 'Electricista', icon: 'zap' },
  ]);
  mockedListBairros.mockResolvedValue([
    { id: 1, name: 'Talatona' },
    { id: 2, name: 'Maianga' },
  ]);
  mockedListProfessionals.mockImplementation(
    async (params: { q?: string; category?: string } = {}) => {
      let rows = FIXTURES;
      if (params.q) {
        const q = params.q.toLowerCase();
        rows = rows.filter((r) => r.name.toLowerCase().includes(q));
      }
      if (params.category) {
        rows = rows.filter((r) => r.category === params.category);
      }
      return {
        data: rows,
        meta: { total: rows.length, page: 1, limit: 20 },
      };
    },
  );
});

describe('Search', () => {
  it('lista os profissionais e filtra ao digitar no input', async () => {
    const user = userEvent.setup();
    renderSearch();

    expect(await screen.findByText('Joaquim Neto')).toBeInTheDocument();
    expect(screen.getByText('António Luz')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/procurar/i), 'joaquim');

    await waitFor(() => {
      expect(screen.queryByText('António Luz')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Joaquim Neto')).toBeInTheDocument();
    expect(mockedListProfessionals).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'joaquim' }),
    );
  });

  it('chip de categoria muda o resultado', async () => {
    const user = userEvent.setup();
    renderSearch();

    expect(await screen.findByText('Joaquim Neto')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Electricista' }));

    await waitFor(() => {
      expect(screen.queryByText('Joaquim Neto')).not.toBeInTheDocument();
    });
    expect(screen.getByText('António Luz')).toBeInTheDocument();
    expect(mockedListProfessionals).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'Electricista' }),
    );
  });

  it('mostra estado vazio quando nada corresponde', async () => {
    const user = userEvent.setup();
    renderSearch();

    expect(await screen.findByText('Joaquim Neto')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/procurar/i), 'zzz');

    expect(await screen.findByText(/nenhum profissional/i)).toBeInTheDocument();
  });
});
