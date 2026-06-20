import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Clock, AlertTriangle, Cpu, MemoryStick, Code, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton, CodeBlock, EmptyState } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, UserCode, SubmissionResult, DebugResult, DebugType } from '@/types';

interface DebugTabProps {
  problem: Problem | null;
  code: UserCode | null;
  submission: SubmissionResult | null;
}

const DEBUG_TYPES: { type: DebugType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'TLE', label: 'Why TLE?', icon: <Clock className="w-4 h-4" />, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' },
  { type: 'WA', label: 'Why WA?', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20' },
  { type: 'RE', label: 'Why RE?', icon: <Bug className="w-4 h-4" />, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20' },
  { type: 'MLE', label: 'Why MLE?', icon: <MemoryStick className="w-4 h-4" />, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20' },
  { type: 'CE', label: 'Why CE?', icon: <Code className="w-4 h-4" />, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' },
];

export function DebugTab({ problem, code, submission }: DebugTabProps) {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<DebugType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoDetected = submission?.status && submission.status !== 'AC' && submission.status !== 'Unknown' && submission.status !== 'Pending'
    ? submission.status as DebugType
    : null;

  async function debug(type: DebugType) {
    if (!problem || !code) return;
    setActiveType(type);
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.debug(problem, code, type, submission ?? undefined);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Debug failed');
    } finally {
      setLoading(false);
    }
  }

  if (!problem) {
    return <EmptyState icon="🐛" title="No problem detected" description="Open a coding problem to use the debugger" />;
  }

  if (!code) {
    return <EmptyState icon="📝" title="No code found" description="Write some code in the editor, then use Debug to analyze it" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Debug Assistant</h3>
        <p className="text-xs text-slate-400 mt-0.5">Analyze your code for common errors</p>
      </div>

      {autoDetected && (
        <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <p className="text-xs text-violet-400">
            Auto-detected: <span className="font-semibold">{autoDetected}</span> from last submission
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {DEBUG_TYPES.map(({ type, label, icon, color }) => (
          <motion.button
            key={type}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs font-medium ${color} ${activeType === type ? 'ring-1 ring-offset-0 ring-current' : ''}`}
            onClick={() => debug(type)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {icon}
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15"><span className="text-red-400 shrink-0 mt-0.5">⚠</span><p className="text-xs text-red-300 leading-relaxed">{error}</p></div>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && !loading && (
          <motion.div key={activeType} variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Root Causes</p>
                <ul className="space-y-2">
                  {result.causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-red-400 mt-0.5 shrink-0">•</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>

            {result.explanation && (
              <motion.div variants={staggerItem}>
                <Card className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Explanation</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{result.explanation}</p>
                </Card>
              </motion.div>
            )}

            {result.failingTestCase && (
              <motion.div variants={staggerItem}>
                <Card className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Failing Test Case</p>
                  <pre className="text-sm font-mono text-red-300 bg-red-500/5 p-2 rounded-lg">{result.failingTestCase}</pre>
                </Card>
              </motion.div>
            )}

            {result.suspiciousLines.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Suspicious Lines</p>
                  <div className="flex gap-2 flex-wrap">
                    {result.suspiciousLines.map((line) => (
                      <span key={line} className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-xs font-mono border border-red-500/25">
                        Line {line}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {result.fix && (
              <motion.div variants={staggerItem}>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Suggested Fix</p>
                <CodeBlock code={result.fix} language={code?.language ?? 'python'} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && !error && (
        <EmptyState
          icon={<Bug className="w-10 h-10" />}
          title="Select error type to debug"
          description="Click one of the buttons above to diagnose why your code is failing"
        />
      )}
    </div>
  );
}
