import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton, CodeBlock, EmptyState, SectionHeader, Badge } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, UserCode, OptimizationResult } from '@/types';

interface OptimizationTabProps {
  problem: Problem | null;
  code: UserCode | null;
}

export function OptimizationTab({ problem, code }: OptimizationTabProps) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function optimize() {
    if (!problem || !code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.optimize(problem, code);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }

  if (!problem) return <EmptyState icon="⚡" title="No problem detected" />;
  if (!code) return <EmptyState icon="📝" title="No code found" description="Write some code first, then optimize it" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Code Optimizer" subtitle="Improve time & space complexity" icon={<Zap className="w-4 h-4" />} />
        <Button size="sm" variant={result ? 'ghost' : 'primary'} onClick={optimize} loading={loading}>
          <Zap className="w-3.5 h-3.5" />
          {result ? 'Re-optimize' : 'Optimize'}
        </Button>
      </div>

      {error && <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15"><span className="text-red-400 shrink-0 mt-0.5">⚠</span><p className="text-xs text-red-300 leading-relaxed">{error}</p></div>}

      {loading && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Complexity Improvement</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2 text-center">Before</p>
                  <div className="space-y-1 text-center">
                    <div className="font-mono text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1">
                      {result.beforeComplexity.time}
                    </div>
                    <div className="font-mono text-sm font-bold text-red-400/70 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-1">
                      {result.beforeComplexity.space}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2 text-center">After</p>
                  <div className="space-y-1 text-center">
                    <div className="font-mono text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1">
                      {result.afterComplexity.time}
                    </div>
                    <div className="font-mono text-sm font-bold text-emerald-400/70 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-1">
                      {result.afterComplexity.space}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {result.changes.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Changes Made</p>
                <ul className="space-y-2">
                  {result.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant={change.impact === 'time' ? 'warning' : change.impact === 'space' ? 'info' : 'success'} className="mt-0.5 shrink-0">
                        {change.impact}
                      </Badge>
                      <p className="text-sm text-slate-300">{change.description}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}

          <motion.div variants={staggerItem}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Optimized Code</p>
            <CodeBlock code={result.optimizedCode} language={result.language} />
          </motion.div>

          {result.explanation && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Explanation</p>
                <p className="text-sm text-slate-200 leading-relaxed">{result.explanation}</p>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <EmptyState icon={<Zap className="w-10 h-10" />} title="Optimize your code" description="Get a more efficient version with better time and space complexity" />
      )}
    </div>
  );
}
