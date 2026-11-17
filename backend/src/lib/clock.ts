/**
 * Relógio injectável.
 *
 * Os serviços de subscrições/pagamentos recebem `now` como parâmetro em vez de
 * lerem `new Date()` directamente. Assim os testes podem avançar o tempo com
 * `vi.setSystemTime` sem depender do relógio do PostgreSQL (`now()`).
 */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

/** Janela em que o profissional continua visível até à primeira mensagem. */
export const ACTIVATION_GRACE_DAYS = 3;
