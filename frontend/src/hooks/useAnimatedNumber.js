import { useEffect, useState, useRef } from 'react';

export function useAnimatedNumber(target, duration = 2000, trigger = true) {
  const [number, setNumber] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    if (!trigger) return;
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = (progress * target).toFixed(1);
      setNumber(Number(value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, trigger]);

  return number;
}

