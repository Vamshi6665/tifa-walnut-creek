'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { usePrefersReducedMotion } from './useInView';

/**
 * Card with spring-driven 3D tilt + glare that follows the pointer and
 * settles with inertia when the pointer leaves.
 */
export default function InertiaCard({ children, className = '', max = 10, glare = true, as = 'div', ...rest }) {
  const ref = useRef(null);
  const reduce = usePrefersReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 170, damping: 14, mass: 0.6 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const gx = useTransform(px, [0, 1], ['0%', '100%']);
  const gy = useTransform(py, [0, 1], ['0%', '100%']);
  const glareBg = useTransform([gx, gy], ([x, y]) => `radial-gradient(400px circle at ${x} ${y}, rgba(255,247,214,0.14), transparent 45%)`);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });
  const Comp = motion[as] ?? motion.div;

  const onMove = (e) => {
    if (reduce || e.pointerType === 'touch') return;
    const b = ref.current.getBoundingClientRect();
    px.set((e.clientX - b.left) / b.width);
    py.set((e.clientY - b.top) / b.height);
    glareOpacity.set(1);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <Comp
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      className={`relative ${className}`}
      {...rest}
    >
      {children}
      {glare && !reduce ? (
        <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glareBg, opacity: glareOpacity }} />
      ) : null}
    </Comp>
  );
}
