import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page transition wrapper - simple fade for route changes (UX: smooth navigation)
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered children animation - simple fade (UX: progressive reveal)
 */
export function StaggerContainer({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Stagger item - simple wrapper (keep for compatibility)
 */
export function StaggerItem({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Hover feedback for interactive cards (UX: interaction feedback)
 */
export function HoverCard({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Simple fade - removed (use CSS transition instead)
 */
export function FadeIn({ children, className = '' }: PageTransitionProps & { delay?: number }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
