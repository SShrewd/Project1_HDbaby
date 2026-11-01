import { useEffect, useState } from 'react';
import { useReducedMotion, animate } from 'framer-motion';
import { money } from '../services/api';
export function AnimatedNumber({ value, currency = false }: { value: number; currency?: boolean }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const control = animate(0, value, { duration: 0.35, onUpdate: (v) => setShown(Math.round(v)) });
    return () => control.stop();
  }, [value, reduced]);
  return <>{currency ? money(shown) : shown.toLocaleString('vi-VN')}</>;
}
