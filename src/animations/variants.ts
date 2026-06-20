import type { Variants, Transition } from 'framer-motion';

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: 'tween',
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: smoothTransition },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: -40 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

export const expandCollapse: Variants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { height: { duration: 0.3, ease: 'easeOut' }, opacity: { duration: 0.2 } },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { height: { duration: 0.25 }, opacity: { duration: 0.15 } },
  },
};

export const tabSwitchVariants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: (direction: number) => ({ x: direction > 0 ? -30 : 30, opacity: 0, transition: { duration: 0.15 } }),
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(139, 92, 246, 0)',
      '0 0 0 8px rgba(139, 92, 246, 0.15)',
      '0 0 0 0 rgba(139, 92, 246, 0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const shimmer: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
};

export const float: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-6, 6, -6],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const ripple: Variants = {
  initial: { scale: 0, opacity: 0.5 },
  animate: {
    scale: 4,
    opacity: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const magneticHover = {
  whileHover: { scale: 1.04, transition: springTransition },
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
};
