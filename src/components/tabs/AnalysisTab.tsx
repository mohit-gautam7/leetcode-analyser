import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Lightbulb, Zap, AlertCircle, RefreshCw, CheckCircle, ChevronRight, Code2, Layers, Wand2, Copy, Check } from 'lucide-react';
import { Button, Card, Skeleton, SectionHeader, ScoreRing } from '@/components/ui';
import { AlgorithmBadges } from '@/components/complexity/ComplexityDisplay';
import { aiService } from '@/services/ai-service';
import { fadeIn, staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, UserCode, AnalysisResult } from '@/types';

interface AnalysisTabProps {
  problem: Problem | null;
  code: UserCode | null;
  autoRun?: boolean;
  onAutoRunDone?: () => void;
}

function SuggestionItem({
  suggestion, index, problem, code,
}: { suggestion: string; index: number; problem: Problem; code: UserCode | null }) {
  const [applying, setApplying] = useState(false);
  const [improvedCode, setImprovedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function apply() {
    if (!code) return;
    setApplying(true);
    setError(false);
    setImprovedCode(null);
    try {
      const result = await aiService.applySuggestion(problem, code, suggestion);
      setImprovedCode(result);
    } catch {
      setError(true);
    } finally {
      setApplying(false);
    }
  }

  async function copy() {
    if (!improvedCode) return;
    await navigator.clipboard.writeText(improvedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
      className="space-y-2"
    >
      <div className="flex items-start gap-2">
        <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
        <span className="text-xs text-slate-300 leading-relaxed flex-1">{suggestion}</span>
        {code && (
          <motion.button
            onClick={apply}
            disabled={applying}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/35 disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            <Wand2 className={`w-2.5 h-2.5 ${applying ? 'animate-spin' : ''}`} />
            {applying ? 'Applying…' : 'Apply'}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {improvedCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="ml-5 rounded-lg overflow-hidden border border-violet-500/20 bg-slate-900/80"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide">Improved Code</span>
              <button onClick={copy} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-[10px] text-slate-300 p-3 overflow-x-auto leading-relaxed max-h-48 overflow-y-auto font-mono whitespace-pre">
              {improvedCode}
            </pre>
          </motion.div>
        )}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="ml-5 text-[10px] text-red-400"
          >
            Failed to apply — try again.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function ComplexityChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
}

export function AnalysisTab({ problem, code, autoRun, onAutoRunDone }: AnalysisTabProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggeredRef = useRef(false);

  const analyze = useCallback(async () => {
    if (!problem || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.analyze(problem, code ?? undefined);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [problem, code, loading]);

  // Auto-run when triggered from popup quick action
  useEffect(() => {
    if (autoRun && problem && !triggeredRef.current && !result) {
      triggeredRef.current = true;
      onAutoRunDone?.();
      analyze();
    }
  }, [autoRun, problem, result, analyze, onAutoRunDone]);

  // Auto-run when problem first loads (if settings.autoAnalyze)
  useEffect(() => {
    if (problem && !result && !loading && !triggeredRef.current) {
      // Check autoAnalyze setting
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['settings'], (s) => {
          if (s.settings?.autoAnalyze) {
            triggeredRef.current = true;
            analyze();
          }
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="w-10 h-10 text-slate-700 mb-3" />
        <p className="text-sm font-medium text-slate-400">No problem detected</p>
        <p className="text-xs text-slate-600 mt-1">Open a coding problem on any supported platform</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* One-click header button — like LeetCode's analyze button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Code Analysis</p>
          <p className="text-xs text-slate-500">{code ? `${code.language.toUpperCase()} · ${problem.title}` : problem.title}</p>
        </div>
        <motion.button
          onClick={analyze}
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            loading
              ? 'bg-violet-600/40 text-violet-300 cursor-wait'
              : result
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing…' : result ? 'Re-analyze' : 'Analyze'}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {/* Loading skeleton — matches LeetCode's card layout */}
        {loading && (
          <motion.div key="loading" variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="space-y-3">
            {[80, 56, 64, 48].map((h, i) => (
              <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/40 overflow-hidden" style={{ height: h }}>
                <div className="h-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse" />
              </div>
            ))}
            <p className="text-center text-xs text-violet-400 animate-pulse">AI is analyzing your solution…</p>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <motion.div key="error" variants={fadeIn} initial="hidden" animate="visible"
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-400">Analysis Failed</p>
              <p className="text-xs text-red-400/70 mt-0.5 leading-relaxed">{error}</p>
              <button onClick={analyze} className="text-xs text-red-300 underline mt-1">Try again</button>
            </div>
          </motion.div>
        )}

        {/* Results — LeetCode-style cards */}
        {result && !loading && (
          <motion.div key="result" variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">

            {/* Summary badge row */}
            <motion.div variants={staggerItem} className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Approach', ok: true },
                { label: 'Efficiency', ok: !result.canOptimize },
                { label: 'Code Style', ok: result.codeQuality >= 70 },
              ].map((b) => (
                <span key={b.label} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                  b.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                }`}>
                  <CheckCircle className="w-3 h-3" />
                  {b.label}
                </span>
              ))}
            </motion.div>

            {/* Approach card */}
            <motion.div variants={staggerItem}>
              <Card className="p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Approach</p>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{result.approach}</p>
                {result.algorithms.length > 0 && (
                  <div className="mt-2.5">
                    <AlgorithmBadges algorithms={result.algorithms} />
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Efficiency card */}
            <motion.div variants={staggerItem}>
              <Card className="p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Efficiency</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="col-span-2 flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Code</span>
                  </div>
                  <ComplexityChip label="Time" value={result.currentComplexity.time} color="text-slate-200" />
                  <ComplexityChip label="Space" value={result.currentComplexity.space} color="text-slate-200" />
                  <div className="col-span-2 flex items-center gap-1.5 mt-1 mb-0.5">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Expected Optimal</span>
                  </div>
                  <ComplexityChip label="Time" value={result.requiredComplexity.time} color={result.requiredComplexity.time !== result.currentComplexity.time ? 'text-emerald-400' : 'text-slate-400'} />
                  <ComplexityChip label="Space" value={result.requiredComplexity.space} color={result.requiredComplexity.space !== result.currentComplexity.space ? 'text-emerald-400' : 'text-slate-400'} />
                </div>
                {result.canOptimize && result.optimizationSummary ? (
                  <p className="text-xs text-amber-300/80 mt-2.5 leading-relaxed">{result.optimizationSummary}</p>
                ) : (
                  <p className="text-xs text-emerald-400/80 mt-2.5">Your solution already matches the optimal complexity.</p>
                )}
              </Card>
            </motion.div>

            {/* Code Quality card */}
            {code && (
              <motion.div variants={staggerItem}>
                <Card className="p-3.5">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Code Style</p>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="Readability" value={result.readability} color="#22C55E" />
                    <ScoreBar label="Quality" value={result.codeQuality} color="#8B5CF6" />
                    <ScoreBar label="Efficiency" value={result.efficiency} color="#F59E0B" />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Suggestions with Apply */}
            {result.suggestions.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                    <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Suggestions</p>
                    {code && <span className="text-[10px] text-slate-500 ml-auto">Click Apply to patch your code</span>}
                  </div>
                  <ul className="space-y-3">
                    {result.suggestions.map((s, i) => (
                      <SuggestionItem key={i} suggestion={s} index={i} problem={problem} code={code} />
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Empty state — shown only when not loading and no result */}
        {!result && !loading && !error && (
          <motion.div key="empty" variants={fadeIn} initial="hidden" animate="visible"
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <motion.div
              className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-3"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <Brain className="w-7 h-7 text-violet-400" />
            </motion.div>
            <p className="text-sm font-semibold text-slate-300">Ready to analyze</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[180px] leading-relaxed">
              Click <span className="text-violet-400 font-medium">Analyze</span> to get instant AI insights
            </p>
            <motion.button
              onClick={analyze}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="mt-4 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-violet-500/25 transition-colors"
            >
              Analyze Now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
