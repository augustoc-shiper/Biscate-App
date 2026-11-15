import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Landing from './Landing';

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('mostra o título principal', () => {
    renderLanding();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Encontre quem resolve. Ou seja quem resolve.',
      }),
    ).toBeInTheDocument();
  });

  it('tem 5 perguntas no FAQ', () => {
    const { container } = renderLanding();

    expect(container.querySelectorAll('details')).toHaveLength(5);
  });

  it('CTA "Experimentar a app" navega para /login', async () => {
    const user = userEvent.setup();
    renderLanding();

    const links = screen.getAllByRole('link', {
      name: /experimentar a app/i,
    });
    await user.click(links[0]);

    expect(await screen.findByText('Página de login')).toBeInTheDocument();
  });
});
