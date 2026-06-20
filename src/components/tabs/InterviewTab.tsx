import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Card, Skeleton, EmptyState, SectionHeader, Badge } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, UserCode, InterviewResult, InterviewStyle } from '@/types';

const INTERVIEW_STYLES: { style: InterviewStyle; label: string; emoji: string; color: string }[] = [
  { style: 'google', label: 'Google', emoji: '🔵', color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
  { style: 'meta', label: 'Meta', emoji: '🟣', color: 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10' },
  { style: 'amazon', label: 'Amazon', emoji: '🟠', color: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10' },
  { style: 'microsoft', label: 'Microsoft', emoji: '🔷', color: 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10' },
  { style: 'apple', label: 'Apple', emoji: '⚪', color: 'border-slate-500/30 bg-slate-500/5 hover:bg-slate-500/10' },
];

interface InterviewTabProps {
  problem: Problem | null;
  code: UserCode | null;
}

export function InterviewTab({ problem, code }: InterviewTabProps) {
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStyle, setActiveStyle] = useState<InterviewStyle>('google');
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!problem) return <EmptyState icon="💼" title="No problem detected" />;

  async function startInterview(style: InterviewStyle) {
    if (!problem) return;
    setActiveStyle(style);
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.interview(problem, style, code ?? undefined);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview session failed');
    } finally {
      setLoading(false);
    }
  }

  const typeColors: Record<string, string> = {
    followup: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    tradeoff: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    alternative: 'bg-green-500/15 text-green-400 border-green-500/25',
    'edge-case': 'bg-red-500/15 text-red-400 border-red-500/25',
    complexity: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Mock Interview"
        subtitle="Practice with top tech company styles"
        icon={<UserCheck className="w-4 h-4" />}
      />

      <div className="grid grid-cols-5 gap-1.5">
        {INTERVIEW_STYLES.map(({ style, label, emoji, color }) => (
          <motion.button
            key={style}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-xs font-medium transition-all ${color} ${activeStyle === style && result ? 'ring-1 ring-violet-500' : ''}`}
            onClick={() => startInterview(style)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            <span className="text-base">{emoji}</span>
            <span className="text-slate-300">{label}</span>
          </motion.button>
        ))}
      </div>

      {error && <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15"><span className="text-red-400 shrink-0 mt-0.5">⚠</span><p className="text-xs text-red-300 leading-relaxed">{error}</p></div>}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          {result.feedback && (
            <motion.div variants={staggerItem}>
              <Card className="p-4 border-violet-500/20 bg-violet-500/5">
                <p className="text-xs text-violet-400 font-medium mb-2">Interviewer Feedback</p>
                <p className="text-sm text-slate-200">{result.feedback}</p>
                {result.score !== null && result.score !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Score:</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${result.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white">{result.score}/100</span>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          <motion.div variants={staggerItem}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Interview Questions ({result.questions.length})</p>
            <div className="space-y-2">
              {result.questions.map((q, i) => (
                <motion.div key={i} variants={staggerItem}>
                  <Card className="overflow-hidden">
                    <button
                      className="w-full p-4 text-left flex items-start gap-3"
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center shrink-0 font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${typeColors[q.type] ?? ''}`}>
                            {q.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 text-left">{q.question}</p>
                      </div>
                      {expandedQ === i ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedQ === i && q.hint && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4"
                        >
                          <div className="pl-9 pt-2 border-t border-slate-700/40">
                            <p className="text-xs text-slate-500 font-medium mb-1">Hint</p>
                            <p className="text-xs text-slate-400">{q.hint}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {result.improvements && result.improvements.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Improvements</p>
                <ul className="space-y-1">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-violet-400 shrink-0">→</span>
                      {imp}
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
          icon={<UserCheck className="w-10 h-10" />}
          title="Select company style"
          description="Practice with FAANG interview styles — get follow-ups, tradeoffs, and feedback"
        />
      )}
    </div>
  );
}
