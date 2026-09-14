'use client';

import { animate, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

/** A restrained entrance wrapper that honors the operating-system reduced-motion setting. */
export function PageEntrance({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.36, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Reusable card treatment for high-value dashboard surfaces. */
export function MotionCard({
  children,
  className = 'card',
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -2, borderColor: 'rgba(94,234,212,.32)' }}
      transition={{ duration: reducedMotion ? 0 : 0.28, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Small live-state marker for monitored or waiting workflow states. */
export function MotionPulse({ tone = 'positive', label }: { tone?: 'positive' | 'warning'; label: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <span className={`live-state ${tone}`}>
      <motion.span
        aria-hidden="true"
        className="live-dot"
        animate={reducedMotion ? undefined : { opacity: [0.55, 1, 0.55], scale: [1, 1.35, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {label}
    </span>
  );
}

/** A number transition for seeded financial figures; it always renders the final value with reduced motion. */
export function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const controls = animate(0, value, {
      duration: 0.7,
      ease,
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [reducedMotion, value]);

  const renderedValue = reducedMotion ? value : displayValue;
  return (
    <span className={className} aria-label={`$${Math.round(value).toLocaleString('en-US')}`}>
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(renderedValue)}
    </span>
  );
}
