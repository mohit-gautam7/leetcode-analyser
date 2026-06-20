import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Eye, EyeOff, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button, Card, Skeleton, EmptyState, Badge } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem, expandCollapse } from '@/animations/variants';
import type { Problem, HintResult } from '@/types';

interface HelpTabProps {
  problem: Problem | null;
}

export function HelpTab({ problem }: HelpTabProps) {
  const [result, setResult] = useState<HintResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function getHints() {
    if (!problem) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getHints(problem, revealed);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get hints');
    } finally {
      setLoading(false);
    }
  }

  function revealNext() {
    if (result && revealed < result.hints.length - 1) {
      setRevealed((r) => r + 1);
    }
  }

  if (!problem) {
    return <EmptyState icon="💡" title="No problem detected" description="Open a coding problem to get hints" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Guided Hints</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            <em className="not-italic" style={{ color: '#4ADE80' }}>Solution hidden</em> — learn step by step
          </p>
        </div>
        <Button size="sm" variant={result ? 'secondary' : 'primary'} onClick={getHints} loading={loading} className="shrink-0">
          <RefreshCw className="w-3 h-3" />
          {result ? 'Refresh' : 'Get Hints'}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          {result.hints.map((hint, i) => (
            <motion.div key={i} variants={staggerItem}>
              <HintCard
                index={i + 1}
                hint={hint}
                locked={i > revealed}
                onReveal={i === revealed + 1 ? revealNext : undefined}
              />
            </motion.div>
          ))}

          {revealed < result.hints.length - 1 && (
            <motion.div variants={staggerItem}>
              <Button variant="outline" size="sm" className="w-full" onClick={revealNext}>
                <Eye className="w-3.5 h-3.5" />
                Reveal Next Hint ({revealed + 1}/{result.hints.length})
              </Button>
            </motion.div>
          )}

          {result.keyObservation && (
            <motion.div variants={staggerItem}>
              <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">Key Observation</p>
                    <p className="text-sm text-amber-200/80">{result.keyObservation}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {(result.dataStructure || result.algorithm) && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Suggested Approach</p>
                <div className="flex gap-2 flex-wrap">
                  {result.dataStructure && (
                    <Badge variant="info">DS: {result.dataStructure}</Badge>
                  )}
                  {result.algorithm && (
                    <Badge variant="default">Algo: {result.algorithm}</Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<Lightbulb className="w-10 h-10" />}
          title="Progressive hints available"
          description="Hints are revealed gradually so you can learn without spoilers"
        />
      )}
    </div>
  );
}

function HintCard({ index, hint, locked, onReveal }: {
  index: number;
  hint: string;
  locked: boolean;
  onReveal?: () => void;
}) {
  return (
    <Card className={`p-4 transition-all ${locked ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          locked ? 'bg-slate-700 text-slate-500' : 'bg-violet-600 text-white'
        }`}>
          {locked ? <EyeOff className="w-3 h-3" /> : index}
        </div>
        <div className="flex-1">
          {locked ? (
            <div>
              <div className="h-3 bg-slate-700/60 rounded mb-1.5" />
              <div className="h-3 bg-slate-700/40 rounded w-3/4" />
              {onReveal && (
                <Button size="sm" variant="ghost" className="mt-2 h-6 text-xs" onClick={onReveal}>
                  <Eye className="w-3 h-3" /> Reveal
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-200 leading-relaxed">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
