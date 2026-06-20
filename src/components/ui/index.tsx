import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';
import { magneticHover } from '@/animations/variants';
import { Loader2 } from 'lucide-react';

// ───────────────────────────────────────
// Button
// ───────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';
    const variants = {
      primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
      secondary: 'bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 border border-slate-600/50',
      ghost: 'hover:bg-slate-700/50 text-slate-300 hover:text-white',
      danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30',
      outline: 'border border-violet-500/30 text-violet-300 hover:bg-violet-500/10',
    };
    const sizes = {
      sm: 'h-7 px-2.5 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// ───────────────────────────────────────
// Badge
// ───────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  );
}

// ───────────────────────────────────────
// Card
// ───────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl bg-slate-800/60 border border-slate-700/40 backdrop-blur-sm', className)}>
      {children}
    </div>
  );
}

// ───────────────────────────────────────
// Skeleton
// ───────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-lg bg-slate-700/40', className)}
      style={{
        background: 'linear-gradient(90deg, rgba(51,65,85,0.4) 0%, rgba(100,116,139,0.3) 50%, rgba(51,65,85,0.4) 100%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ───────────────────────────────────────
// Progress Bar
// ───────────────────────────────────────
export function ProgressBar({ value, className, color = '#8B5CF6' }: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn('h-1.5 rounded-full bg-slate-700/60 overflow-hidden', className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ───────────────────────────────────────
// Input
// ───────────────────────────────────────
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ───────────────────────────────────────
// Select
// ───────────────────────────────────────
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors appearance-none cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

// ───────────────────────────────────────
// Switch
// ───────────────────────────────────────
export function Switch({ checked, onCheckedChange, label }: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      {label && <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50',
          checked ? 'bg-violet-600' : 'bg-slate-700'
        )}
      >
        <motion.span
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
          style={{ margin: 2 }}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </label>
  );
}

// ───────────────────────────────────────
// Tooltip
// ───────────────────────────────────────
export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-slate-200 whitespace-nowrap shadow-xl pointer-events-none z-50"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────────────────
// Spinner
// ───────────────────────────────────────
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={cn('rounded-full border-2 border-slate-700 border-t-violet-500', className)}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ───────────────────────────────────────
// Code Block
// ───────────────────────────────────────
export function CodeBlock({ code, language = 'python', className }: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative rounded-xl overflow-hidden bg-slate-900/80 border border-slate-700/40', className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/40 bg-slate-800/40">
        <span className="text-xs font-mono text-slate-500 uppercase">{language}</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-6 text-xs">
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="p-4 text-sm font-mono text-slate-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ───────────────────────────────────────
// Section Header
// ───────────────────────────────────────
export function SectionHeader({ title, subtitle, icon }: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 mb-4">
      {icon && <div className="mt-0.5 text-violet-400">{icon}</div>}
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────
// Empty State
// ───────────────────────────────────────
export function EmptyState({ icon, title, description }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {icon && <div className="text-slate-600 mb-3 text-4xl">{icon}</div>}
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
    </motion.div>
  );
}

// ───────────────────────────────────────
// Score Ring
// ───────────────────────────────────────
export function ScoreRing({ value, label, color = '#8B5CF6', size = 72 }: {
  value: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={4} stroke="rgba(51,65,85,0.8)" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={4}
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{value}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
