import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';

function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <span data-testid="path">{location.pathname}</span>
      <button type="button" onClick={() => navigate('/login')}>
        Ir para login
      </button>
    </>
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Probe />
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('Splash integrada na aplicação', () => {
  it('aparece uma vez, termina e não reaparece ao navegar entre páginas', () => {
    renderApp();

    expect(screen.getByTestId('splash')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ir para login/i }));
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument();
  });

  it('não reaparece depois de remontar a app na mesma sessão', () => {
    const first = renderApp();
    act(() => vi.advanceTimersByTime(1600));
    first.unmount();

    renderApp();
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument();
  });
});
