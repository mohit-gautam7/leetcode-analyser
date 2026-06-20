import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, Skeleton, CodeBlock, EmptyState, Select, SectionHeader } from '@/components/ui';
import { ComplexityBadge } from '@/components/complexity/ComplexityDisplay';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem, expandCollapse } from '@/animations/variants';
import type { Problem, SolutionResult, SolutionLanguage } from '@/types';

const LANGUAGES: { value: SolutionLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'c', label: 'C' },
];

interface SolutionTabProps {
  problem: Problem | null;
  contestMode: boolean;
}

export function SolutionTab({ problem, contestMode }: SolutionTabProps) {
  const [result, setResult] = useState<SolutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<SolutionLanguage>('python');
  const [showDryRun, setShowDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contestMode) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-5xl">🏆</div>
        <h3 className="text-base font-semibold text-slate-200">Contest Mode Active</h3>
        <p className="text-sm text-slate-400 max-w-xs">
          Solutions are hidden during contests to maintain fair play.
          Disable Contest Mode in Settings to access solutions.
        </p>
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <span>✓ Hints available</span>
          <span>✓ Analysis available</span>
          <span>✗ Solutions blocked</span>
        </div>
      </div>
    );
  }

  if (!problem) {
    return <EmptyState icon="💡" title="No problem detected" description="Open a coding problem to get solutions" />;
  }

  async function getSolution() {
    if (!problem) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getSolution(problem, language);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get solution');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Optimal Solution"
          subtitle="Intuition, approach & code"
          icon={<Code2 className="w-4 h-4" />}
        />
        <div className="flex items-center gap-2">
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SolutionLanguage)}
            className="w-24 h-7 text-xs"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </Select>
          <Button size="sm" variant={result ? 'ghost' : 'primary'} onClick={getSolution} loading={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
            {result ? 'Refresh' : 'Solve'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15"><span className="text-red-400 shrink-0 mt-0.5">⚠</span><p className="text-xs text-red-300 leading-relaxed">{error}</p></div>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      )}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Intuition</p>
              <p className="text-sm text-slate-200 leading-relaxed">{result.intuition}</p>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Approach</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{result.approach}</p>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="flex justify-center gap-6">
              <ComplexityBadge notation={result.complexity.time} label="Time" />
              <ComplexityBadge notation={result.complexity.space} label="Space" />
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <CodeBlock
              code={result.code[language] || result.code.python || result.code.cpp || 'No code available'}
              language={language}
            />
          </motion.div>

          {result.dryRun && (
            <motion.div variants={staggerItem}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowDryRun(!showDryRun)}
              >
                {showDryRun ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDryRun ? 'Hide' : 'Show'} Dry Run
              </Button>
              <AnimatePresence>
                {showDryRun && (
                  <motion.div
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <Card className="p-4 mt-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Step-by-Step Trace</p>
                      <p className="text-sm text-slate-200 font-mono whitespace-pre-line text-xs leading-relaxed">{result.dryRun}</p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<Code2 className="w-10 h-10" />}
          title="Generate optimal solution"
          description={`Get a complete ${language} solution with intuition and complexity analysis`}
        />
      )}
    </div>
  );
}
