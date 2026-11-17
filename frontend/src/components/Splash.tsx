import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './Splash.css';

/** Cores exactas da identidade Biskato, expostas ao CSS sem tokens globais. */
const COLORS = {
  background: '#C8102E',
  bis: '#FFFFFF',
  kato: '#F2B705',
} as const;

type Stage = 'initial' | 'brand' | 'slogan' | 'exit';

/**
 * Linha do tempo (ms). As transições CSS usam os mesmos instantes:
 * 0 b+k | 260 is+ato | 560 slogan | 1200 fade | 1600 conclusão.
 */
const STAGE_TIMERS: ReadonlyArray<{ stage: Stage; at: number }> = [
  { stage: 'brand', at: 260 },
  { stage: 'slogan', at: 560 },
  { stage: 'exit', at: 1200 },
];
const DONE_AT = 1600;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

type Part = 'b' | 'is' | 'k' | 'ato';

export default function Splash({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<Stage>('initial');
  const doneRef = useRef(onDone);
  const finishedRef = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = (): void => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      doneRef.current();
    };

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia(REDUCED_MOTION).matches;

    // Com movimento reduzido, termina imediatamente: sem animação e sem bloqueio.
    if (reduced) {
      const id = window.setTimeout(finish, 0);
      return () => window.clearTimeout(id);
    }

    const timers = STAGE_TIMERS.map(({ stage: next, at }) =>
      window.setTimeout(() => setStage(next), at),
    );
    // Timeout único e determinístico: a aplicação nunca fica presa na splash.
    timers.push(window.setTimeout(finish, DONE_AT));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  // Na etapa 1 só b e k são visíveis; os espaços de "is"/"ato" ficam reservados.
  const partVisible = (part: Part): boolean =>
    stage !== 'initial' || part === 'b' || part === 'k';
  const sloganVisible = stage === 'slogan' || stage === 'exit';

  return (
    <div
      className={`splash splash--${stage}`}
      data-testid="splash"
      data-stage={stage}
      role="status"
      aria-label="Biskato — O seu kamba para qualquer biskate"
      style={
        {
          '--splash-bg': COLORS.background,
          '--splash-bis': COLORS.bis,
          '--splash-kato': COLORS.kato,
        } as CSSProperties
      }
    >
      <div className="splash-inner">
        <div className="splash-word" aria-hidden="true">
          <span
            className="splash-letter splash-letter--bis"
            data-part="b"
            data-visible={partVisible('b')}
          >
            b
          </span>
          <span
            className="splash-letter splash-letter--bis"
            data-part="is"
            data-visible={partVisible('is')}
          >
            is
          </span>
          <span
            className="splash-letter splash-letter--kato"
            data-part="k"
            data-visible={partVisible('k')}
          >
            k
          </span>
          <span
            className="splash-letter splash-letter--kato"
            data-part="ato"
            data-visible={partVisible('ato')}
          >
            ato
          </span>
        </div>
        <p className="splash-tagline" data-visible={sloganVisible}>
          O seu kamba para qualquer biskate
        </p>
      </div>
    </div>
  );
}
