import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button, Card, Skeleton, EmptyState, SectionHeader } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { fadeIn, staggerContainer, staggerItem } from '@/animations/variants';
import type { Problem, UserCode, DryRunResult, DryRunStep } from '@/types';

interface DryRunTabProps {
  problem: Problem | null;
  code: UserCode | null;
}

export function DryRunTab({ problem, code }: DryRunTabProps) {
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  async function runDryRun() {
    if (!problem || !code) return;
    setLoading(true);
    setError(null);
    setCurrentStep(0);
    try {
      const res = await aiService.dryRun(problem, code);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dry run failed');
    } finally {
      setLoading(false);
    }
  }

  if (!problem) return <EmptyState icon="▶️" title="No problem detected" />;
  if (!code) return <EmptyState icon="📝" title="No code found" description="Write code first, then trace its execution" />;

  const step = result?.steps[currentStep];
  const totalSteps = result?.steps.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Dry Run</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">Step-by-step execution trace</p>
        </div>
        <Button size="sm" variant={result ? 'secondary' : 'primary'} onClick={runDryRun} loading={loading} className="shrink-0">
          <Play className="w-3 h-3" />
          {result ? 'Re-run' : 'Trace'}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-32" />
          <Skeleton className="h-20" />
        </div>
      )}

      {result && !loading && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          {/* Step Navigation */}
          <motion.div variants={staggerItem}>
            <Card className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCurrentStep(0)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                    disabled={currentStep === totalSteps - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500 rounded-full"
                  animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </Card>
          </motion.div>

          {/* Current Step */}
          <AnimatePresence mode="wait">
            {step && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Card className="p-4 border-violet-500/20 bg-violet-500/5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center shrink-0 font-bold">
                      {step.step}
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed">{step.description}</p>
                  </div>
                  {step.highlight && (
                    <p className="mt-2 text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded-md">💡 {step.highlight}</p>
                  )}
                </Card>

                {/* Variables */}
                {Object.keys(step.variables).length > 0 && (
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Variables</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(step.variables).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-mono text-violet-300 shrink-0">{key}</span>
                          <span className="text-xs text-slate-400">=</span>
                          <span className="text-xs font-mono text-emerald-300 truncate">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Call Stack */}
                {step.callStack && step.callStack.length > 0 && (
                  <Card className="p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Call Stack</p>
                    <div className="space-y-1">
                      {[...step.callStack].reverse().map((fn, i) => (
                        <div key={i} className={`text-xs font-mono px-2 py-1 rounded ${i === 0 ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800/40 text-slate-400'}`}>
                          {fn}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* DP Table */}
          {result.dpTable && (
            <motion.div variants={staggerItem}>
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">DP Table</p>
                <div className="overflow-x-auto">
                  <table className="text-xs font-mono">
                    <tbody>
                      {result.dpTable.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="w-8 h-8 text-center border border-slate-700/40 text-slate-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Final Answer */}
          {result.finalAnswer && (
            <motion.div variants={staggerItem}>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-emerald-400 font-medium">Final Answer</p>
                <p className="text-base font-mono font-bold text-emerald-300 mt-0.5">{result.finalAnswer}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <EmptyState
          icon={<Play className="w-10 h-10" />}
          title="Trace execution step by step"
          description="See variables change, stack evolve, and DP tables fill up"
        />
      )}
    </div>
  );
}
