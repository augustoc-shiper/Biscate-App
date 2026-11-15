import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import './Splash.css';

export default function Splash({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      doneRef.current();
      return;
    }
    const timer = window.setTimeout(() => doneRef.current(), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="splash"
      data-testid="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="splash-inner"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="splash-logo">
          bis<span>kato</span>
        </div>
        <p className="splash-tagline">O seu kamba para qualquer biscate.</p>
      </motion.div>
    </motion.div>
  );
}
