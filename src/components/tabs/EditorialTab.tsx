import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton, CodeBlock, EmptyState, SectionHeader } from '@/components/ui';
import { ComplexityBadge } from '@/components/complexity/ComplexityDisplay';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, EditorialResult } from '@/types';

interface EditorialTabProps {
  problem: Problem | null;
  contestMode: boolean;
}

export function EditorialTab({ problem, contestMode }: EditorialTabProps) {
  const [result, setResult] = useState<EditorialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contestMode) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <h3 className="text-sm font-semibold text-slate-200">Editorial Hidden</h3>
        <p className="text-xs text-slate-400">Contest Mode is active. Disable it in Settings.</p>
      </div>
    );
  }

  if (!problem) return <EmptyState icon="📖" title="No problem detected" />;

  async function getEditorial() {
    if (!problem) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.editorial(problem);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate editorial');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="AI Editorial" subtitle="Official-style problem editorial" icon={<BookOpen className="w-4 h-4" />} />
        <Button size="sm" variant={result ? 'ghost' : 'primary'} onClick={getEditorial} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          {result ? 'Refresh' : 'Generate'}
        </Button>
      </div>

      {error && <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15"><span className="text-red-400 shrink-0 mt-0.5">⚠</span><p className="text-xs text-red-300 leading-relaxed">{error}</p></div>}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-48" />
        </div>
      )}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          {[
            { label: 'Observation', content: result.observation },
            { label: 'Key Insight', content: result.insight },
            { label: 'Proof', content: result.proof },
            { label: 'Approach', content: result.approach },
          ].filter((s) => s.content).map(({ label, content }) => (
            <motion.div key={label} variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-2">{label}</p>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{content}</p>
              </Card>
            </motion.div>
          ))}

          <motion.div variants={staggerItem}>
            <div className="flex justify-center gap-6">
              <ComplexityBadge notation={result.complexity.time} label="Time" />
              <ComplexityBadge notation={result.complexity.space} label="Space" />
            </div>
          </motion.div>

          {result.code && (
            <motion.div variants={staggerItem}>
              <CodeBlock code={result.code} language={result.language} />
            </motion.div>
          )}

          {result.followUp && result.followUp.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Follow-up Questions</p>
                <ul className="space-y-1">
                  {result.followUp.map((q, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-violet-400 shrink-0">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title="Generate editorial"
          description="Get an official-style editorial with observations, insights, and proofs"
        />
      )}
    </div>
  );
}
