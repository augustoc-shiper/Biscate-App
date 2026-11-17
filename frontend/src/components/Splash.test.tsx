import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Splash from './Splash';

function splash(): HTMLElement {
  return screen.getByTestId('splash');
}

function isVisible(part: string): boolean {
  return (
    splash().querySelector(`[data-part="${part}"]`)?.getAttribute('data-visible') ===
    'true'
  );
}

function taglineVisible(): boolean {
  return splash().querySelector('.splash-tagline')?.getAttribute('data-visible') === 'true';
}

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe('Splash', () => {
  it('etapa 1: b e k aparecem juntos e reservam o espaço da marca completa', () => {
    vi.useFakeTimers();
    render(<Splash onDone={vi.fn()} />);

    expect(screen.getByRole('status')).toBe(splash());
    expect(splash()).toHaveAttribute('data-stage', 'initial');
    expect(isVisible('b')).toBe(true);
    expect(isVisible('k')).toBe(true);
    expect(isVisible('is')).toBe(false);
    expect(isVisible('ato')).toBe(false);
    expect(taglineVisible()).toBe(false);

    const parts = Array.from(splash().querySelectorAll('[data-part]'))
      .map((node) => node.getAttribute('data-part'))
      .join('');
    expect(parts).toBe('biskato');
  });

  it('sequência: b+k → biskato → slogan → fade → onDone', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<Splash onDone={onDone} />);

    act(() => vi.advanceTimersByTime(260));
    expect(splash()).toHaveAttribute('data-stage', 'brand');
    expect(isVisible('is')).toBe(true);
    expect(isVisible('ato')).toBe(true);
    expect(taglineVisible()).toBe(false);

    act(() => vi.advanceTimersByTime(300));
    expect(splash()).toHaveAttribute('data-stage', 'slogan');
    expect(taglineVisible()).toBe(true);
    expect(onDone).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(640));
    expect(splash()).toHaveAttribute('data-stage', 'exit');

    act(() => vi.advanceTimersByTime(400));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('usa slogan, cores e grafia exactos', () => {
    vi.useFakeTimers();
    render(<Splash onDone={vi.fn()} />);

    expect(
      within(splash()).getByText('O seu kamba para qualquer biskate'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/biscate/i)).not.toBeInTheDocument();

    expect(splash().style.getPropertyValue('--splash-bg')).toBe('#C8102E');
    expect(splash().style.getPropertyValue('--splash-bis')).toBe('#FFFFFF');
    expect(splash().style.getPropertyValue('--splash-kato')).toBe('#F2B705');
    expect(splash().querySelector('.splash-letter--bis')).not.toBeNull();
    expect(splash().querySelector('.splash-letter--kato')).not.toBeNull();
  });

  it('respeita prefers-reduced-motion e termina sem bloquear a aplicação', () => {
    vi.useFakeTimers();
    mockReducedMotion();
    const onDone = vi.fn();
    render(<Splash onDone={onDone} />);

    act(() => vi.advanceTimersByTime(0));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
