import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ProfessionalCard from './ProfessionalCard';

const PRO = {
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
};

describe('ProfessionalCard', () => {
  it('mostra nome, nota, verified badge e preço', () => {
    render(
      <MemoryRouter>
        <ProfessionalCard pro={PRO} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Joaquim Neto')).toBeInTheDocument();
    expect(screen.getByLabelText(/nota: 4.8 de 5/i)).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    expect(screen.getByText(/5000/)).toBeInTheDocument();
  });

  it('sem verified badge quando não verificado', () => {
    render(
      <MemoryRouter>
        <ProfessionalCard pro={{ ...PRO, verified: false }} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Verificado')).not.toBeInTheDocument();
  });
});
