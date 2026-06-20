import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { parseComplexity, cn, getAlgorithmColor } from '@/utils/helpers';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { AlgorithmType } from '@/types';

interface ComplexityBadgeProps {
  notation: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ComplexityBadge({ notation, label, size = 'md' }: ComplexityBadgeProps) {
  const { type } = parseComplexity(notation);
  const colors = {
    good: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    ok: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    bad: 'text-red-400 bg-red-500/10 border-red-500/25',
    neutral: 'text-slate-300 bg-slate-700/40 border-slate-600/30',
  };
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.span
        className={cn('font-mono font-bold rounded-lg border', colors[type], sizes[size])}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {notation}
      </motion.span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

interface ComplexityComparisonProps {
  current: { time: string; space: string };
  required: { time: string; space: string };
}

export function ComplexityComparison({ current, required }: ComplexityComparisonProps) {
  const timeImproved = isImprovement(current.time, required.time);
  const spaceImproved = isImprovement(current.space, required.space);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div variants={staggerItem}>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Time Complexity</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <div className="text-xs text-slate-500 mb-1">Current</div>
            <span className={cn('font-mono text-sm font-bold px-3 py-1 rounded-lg border', getComplexityStyle(current.time))}>
              {current.time}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {timeImproved === 'better' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            ) : timeImproved === 'worse' ? (
              <TrendingUp className="w-5 h-5 text-red-400" />
            ) : (
              <Minus className="w-5 h-5 text-slate-500" />
            )}
            <span className="text-xs text-slate-500">→</span>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-slate-500 mb-1">Target</div>
            <span className={cn('font-mono text-sm font-bold px-3 py-1 rounded-lg border', getComplexityStyle(required.time))}>
              {required.time}
            </span>
          </div>
        </div>
        {timeImproved === 'better' && (
          <motion.div
            className="mt-2 text-center"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Improvement possible!
            </span>
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={staggerItem}>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Space Complexity</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <div className="text-xs text-slate-500 mb-1">Current</div>
            <span className={cn('font-mono text-sm font-bold px-3 py-1 rounded-lg border', getComplexityStyle(current.space))}>
              {current.space}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {spaceImproved === 'better' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            ) : (
              <Minus className="w-5 h-5 text-slate-500" />
            )}
            <span className="text-xs text-slate-500">→</span>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-slate-500 mb-1">Target</div>
            <span className={cn('font-mono text-sm font-bold px-3 py-1 rounded-lg border', getComplexityStyle(required.space))}>
              {required.space}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getComplexityStyle(notation: string): string {
  const { type } = parseComplexity(notation);
  const styles = {
    good: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    ok: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    bad: 'text-red-400 bg-red-500/10 border-red-500/25',
    neutral: 'text-slate-300 bg-slate-700/40 border-slate-600/30',
  };
  return styles[type];
}

function isImprovement(current: string, target: string): 'better' | 'worse' | 'same' {
  const complexityOrder = ['1', 'log N', 'N', 'N log N', 'N²', 'N^2', '2^N', 'N!'];
  const ci = complexityOrder.findIndex((c) => current.includes(c));
  const ti = complexityOrder.findIndex((c) => target.includes(c));
  if (ci === -1 || ti === -1) return 'same';
  if (ti < ci) return 'better';
  if (ti > ci) return 'worse';
  return 'same';
}

export function AlgorithmBadges({ algorithms }: { algorithms: string[] }) {
  if (!algorithms.length) return null;

  return (
    <motion.div
      className="flex flex-wrap gap-1.5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {algorithms.map((algo) => (
        <motion.span
          key={algo}
          variants={staggerItem}
          className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', getAlgorithmColor(algo as AlgorithmType))}
        >
          {algo}
        </motion.span>
      ))}
    </motion.div>
  );
}
