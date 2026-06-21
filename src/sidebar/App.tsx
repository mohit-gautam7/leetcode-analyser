import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, HelpCircle, Code2, Zap, Bug, Play,
  BookOpen, UserCheck, Trophy, Settings, MessageSquare,
  Brain, AlertCircle, RefreshCw, Building2
} from 'lucide-react';
import { aiService } from '@/services/ai-service';
import { AnalysisTab } from '@/components/tabs/AnalysisTab';
import { HelpTab } from '@/components/tabs/HelpTab';
import { SolutionTab } from '@/components/tabs/SolutionTab';
import { OptimizationTab } from '@/components/tabs/OptimizationTab';
import { DebugTab } from '@/components/tabs/DebugTab';
import { DryRunTab } from '@/components/tabs/DryRunTab';
import { EditorialTab } from '@/components/tabs/EditorialTab';
import { InterviewTab } from '@/components/tabs/InterviewTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { LiquidBackground, FloatingOrbs, ParticleField } from '@/animations/liquid';
import { storage } from '@/storage';
import { getDifficultyColor, getStatusColor, cn } from '@/utils/helpers';
import type { AIMode, Problem, UserCode, SubmissionResult, Settings as SettingsType, ExtensionMessage, SimilarProblem } from '@/types';

// ─── Tab definition ────────────────────────────────────────────────────────────
interface TabDef {
  id: AIMode;
  label: string;
  short: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  contestBlocked?: boolean;
}

const TABS: TabDef[] = [
  { id: 'analysis',     label: 'Analysis',  short: 'Analyze',  icon: BarChart2,  color: '#8B5CF6' },
  { id: 'help',         label: 'Hints',     short: 'Hints',    icon: HelpCircle, color: '#22C55E' },
  { id: 'solution',     label: 'Solution',  short: 'Solve',    icon: Code2,      color: '#3B82F6', contestBlocked: true },
  { id: 'optimization', label: 'Optimize',  short: 'Opt',      icon: Zap,        color: '#F59E0B' },
  { id: 'debug',        label: 'Debug',     short: 'Debug',    icon: Bug,        color: '#EF4444' },
  { id: 'dryrun',       label: 'Dry Run',   short: 'Run',      icon: Play,       color: '#06B6D4' },
  { id: 'editorial',    label: 'Editorial', short: 'Edit',     icon: BookOpen,   color: '#A78BFA', contestBlocked: true },
  { id: 'interview',    label: 'Interview', short: 'Mock',     icon: UserCheck,  color: '#EC4899' },
  { id: 'settings',     label: 'Settings',  short: 'Settings', icon: Settings,   color: '#64748B' },
];

const PLATFORM_LABELS: Record<string, string> = {
  leetcode: 'LeetCode', gfg: 'GeeksForGeeks', codeforces: 'Codeforces',
  codechef: 'CodeChef', atcoder: 'AtCoder', hackerrank: 'HackerRank',
  codingninjas: 'Coding Ninjas', interviewbit: 'InterviewBit',
  cses: 'CSES', spoj: 'SPOJ', generic: 'Platform',
};

// ─── Company brand colors ──────────────────────────────────────────────────────
const COMPANY_COLORS: Record<string, string> = {
  'Google':          '#4285F4',
  'Amazon':          '#FF9900',
  'Microsoft':       '#00A4EF',
  'Meta':            '#1877F2',
  'Apple':           '#A2AAAD',
  'Netflix':         '#E50914',
  'Uber':            '#1FC7C7',
  'LinkedIn':        '#0A66C2',
  'Adobe':           '#FF0000',
  'Bloomberg':       '#E85C0D',
  'Goldman Sachs':   '#5B8DEF',
  'Walmart':         '#007DC6',
  'Airbnb':          '#FF5A5F',
  'Stripe':          '#635BFF',
  'Oracle':          '#F80000',
  'Atlassian':       '#0052CC',
  'TikTok':          '#69C9D0',
  'Twitter':         '#1DA1F2',
  'Salesforce':      '#00A1E0',
  'JPMorgan':        '#005EB8',
};

function CompanyBadge({ name, selected, onClick, delay = 0 }: { name: string; selected?: boolean; onClick?: () => void; delay?: number }) {
  const color = COMPANY_COLORS[name] ?? '#8B5CF6';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.75, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22, delay }}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px 2px 4px', borderRadius: 20,
        background: selected ? color + '30' : color + '18',
        border: `1px solid ${selected ? color : color + '40'}`,
        fontSize: 10, fontWeight: 600, color, whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default', letterSpacing: '0.01em',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      whileHover={{ scale: 1.07, y: -1 }}
      whileTap={onClick ? { scale: 0.93 } : {}}
      title={onClick ? `See more ${name} questions` : name}
    >
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color }}>
        {initials}
      </span>
      {name}
    </motion.span>
  );
}

function CompanySkeletonBadge({ delay = 0, width = 64 }: { delay?: number; width?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px 2px 4px', borderRadius: 20,
        border: '1px solid rgba(100,116,139,0.12)',
        overflow: 'hidden', position: 'relative',
        width, height: 20, background: 'rgba(30,41,59,0.5)',
      }}
    >
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.08) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay }}
      />
    </motion.span>
  );
}

const DIFFICULTY_STYLES: Record<string, { color: string; bg: string }> = {
  Easy:    { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
  Medium:  { color: '#FCD34D', bg: 'rgba(245,158,11,0.12)' },
  Hard:    { color: '#F87171', bg: 'rgba(239,68,68,0.12)' },
  Unknown: { color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
};

// ─── Storage helpers (tab-scoped — each window's panel tracks its own active tab) ──
async function readFromStorage(tabId: number): Promise<{ problem: Problem | null; code: UserCode | null }> {
  return new Promise((resolve) => {
    chrome.storage.local.get([`problem_${tabId}`, `code_${tabId}`], (r: Record<string, unknown>) =>
      resolve({
        problem: (r[`problem_${tabId}`] as Problem) ?? null,
        code: (r[`code_${tabId}`] as UserCode) ?? null,
      })
    );
  });
}

async function askContentScript(tabId: number): Promise<{ problem: Problem | null; code: UserCode | null }> {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'GET_PROBLEM' });
    return { problem: r?.problem ?? null, code: r?.code ?? null };
  } catch { return { problem: null, code: null }; }
}

// ─── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]     = useState<AIMode>('analysis');
  const [problem, setProblem]         = useState<Problem | null>(null);
  const [code, setCode]               = useState<UserCode | null>(null);
  const [submission, setSubmission]   = useState<SubmissionResult | null>(null);
  const [settings, setSettings]       = useState<SettingsType | null>(null);
  const [showChat, setShowChat]       = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [noApiKey, setNoApiKey]       = useState(false);
  const [autoRun, setAutoRun]         = useState(false);
  const [companyTags, setCompanyTags] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyProblems, setCompanyProblems] = useState<SimilarProblem[]>([]);
  const [companyProblemsPage, setCompanyProblemsPage] = useState(0);
  const [companyProblemsHasMore, setCompanyProblemsHasMore] = useState(false);
  const [loadingCompanyProblems, setLoadingCompanyProblems] = useState(false);
  const hasProblemRef = useRef(false);
  const activeTabIdRef = useRef<number | null>(null);

  const fetchCompanies = useCallback(async (p: Problem) => {
    setLoadingCompanies(true);
    try {
      const tags = await aiService.getCompanyTags(p);
      setCompanyTags(tags);
    } catch { setCompanyTags([]); }
    finally { setLoadingCompanies(false); }
  }, []);

  function applyProblem(p: Problem | null, c: UserCode | null = null) {
    if (!p) return;
    hasProblemRef.current = true;
    setProblem(p);
    if (c) setCode(c);
    setCompanyTags([]);
    setSelectedCompany(null);
    setCompanyProblems([]);
    setCompanyProblemsPage(0);
    setCompanyProblemsHasMore(false);
    fetchCompanies(p);
  }

  async function toggleCompanyProblems(name: string) {
    if (!problem) return;
    if (selectedCompany === name) { setSelectedCompany(null); return; }
    setSelectedCompany(name);
    setCompanyProblems([]);
    setCompanyProblemsPage(0);
    setCompanyProblemsHasMore(false);
    setLoadingCompanyProblems(true);
    try {
      const { problems, hasMore } = await aiService.getCompanyProblems(name, problem, 0);
      setCompanyProblems(problems);
      setCompanyProblemsPage(1);
      setCompanyProblemsHasMore(hasMore);
    } catch { setCompanyProblems([]); }
    finally { setLoadingCompanyProblems(false); }
  }

  async function loadMoreCompanyProblems() {
    if (!problem || !selectedCompany) return;
    setLoadingCompanyProblems(true);
    try {
      const { problems, hasMore } = await aiService.getCompanyProblems(selectedCompany, problem, companyProblemsPage);
      setCompanyProblems(prev => [...prev, ...problems]);
      setCompanyProblemsPage(p => p + 1);
      setCompanyProblemsHasMore(hasMore);
    } catch { /* keep existing */ }
    finally { setLoadingCompanyProblems(false); }
  }

  // ── 1. Settings + popup routing ─────────────────────────────────────────────
  useEffect(() => {
    storage.getSettings().then((s) => {
      setSettings(s);
      setNoApiKey(s.aiProvider === 'openrouter' ? !s.openRouterApiKey : !s.apiKey);
    });
    chrome.storage.local.get(['openToTab', 'autoRun'], (res) => {
      if (res.openToTab) setActiveTab(res.openToTab as AIMode);
      if (res.autoRun)   setAutoRun(true);
      chrome.storage.local.remove(['openToTab', 'autoRun']);
    });
  }, []);

  // ── 2. Track this panel's own window's active tab — switching tabs/windows
  //      must never pull in another tab's problem, and switching to a new tab
  //      in THIS window must reload for that tab. ───────────────────────────────
  useEffect(() => {
    let myWindowId: number | null = null;
    let pollToken = 0;

    async function loadForTab(tabId: number) {
      const myToken = ++pollToken;
      hasProblemRef.current = false;
      setProblem(null);
      setCode(null);
      setSubmission(null);
      setCompanyTags([]);

      for (const delay of [0, 400, 1000, 2000, 3500, 6000]) {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (myToken !== pollToken || activeTabIdRef.current !== tabId) return; // tab switched mid-poll
        const stored = await readFromStorage(tabId);
        if (stored.problem) { applyProblem(stored.problem, stored.code); return; }
        const fromCs = await askContentScript(tabId);
        if (fromCs.problem) { applyProblem(fromCs.problem, fromCs.code); return; }
      }
    }

    async function syncToActiveTab() {
      const win = await chrome.windows.getCurrent();
      myWindowId = win.id ?? null;
      const [tab] = await chrome.tabs.query({ active: true, windowId: myWindowId ?? undefined });
      const tabId = tab?.id ?? null;
      if (tabId !== activeTabIdRef.current) {
        activeTabIdRef.current = tabId;
        if (tabId != null) loadForTab(tabId);
      }
    }

    function onActivated(info: chrome.tabs.OnActivatedInfo) {
      if (myWindowId == null || info.windowId === myWindowId) syncToActiveTab();
    }

    // Detect URL navigation within the same tab (e.g. moving between LeetCode problems)
    function onUpdated(tabId: number, info: chrome.tabs.TabChangeInfo) {
      if (info.status !== 'complete') return;
      if (tabId !== activeTabIdRef.current) return;
      // Re-poll — content script may not have fired yet
      loadForTab(tabId);
    }

    syncToActiveTab();
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      pollToken++;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  // ── 3. Storage change listener — only react to this tab's own keys ──────────
  useEffect(() => {
    function onChange(changes: Record<string, chrome.storage.StorageChange>) {
      const tabId = activeTabIdRef.current;
      if (tabId == null) return;
      const problemKey = `problem_${tabId}`;
      const codeKey = `code_${tabId}`;
      if (changes[problemKey]?.newValue)
        applyProblem(changes[problemKey].newValue as Problem,
                     (changes[codeKey]?.newValue ?? null) as UserCode | null);
      else if (changes[codeKey]?.newValue && hasProblemRef.current)
        setCode(changes[codeKey].newValue as UserCode);
    }
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  // ── 4. Message listener — only react to messages from this tab ──────────────
  useEffect(() => {
    function onMsg(msg: ExtensionMessage) {
      if (msg.tabId == null || msg.tabId !== activeTabIdRef.current) return;
      if (msg.type === 'PROBLEM_DETECTED' && msg.payload)
        applyProblem((msg.payload as { problem: Problem }).problem);
      if (msg.type === 'CODE_CHANGED' && msg.payload)
        setCode((msg.payload as { code: UserCode }).code);
      if (msg.type === 'SUBMISSION_DETECTED' && msg.payload)
        setSubmission((msg.payload as { submission: SubmissionResult }).submission);
    }
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  async function refreshProblem() {
    const tabId = activeTabIdRef.current;
    if (tabId == null) return;
    setRefreshing(true);
    try {
      const stored = await readFromStorage(tabId);
      if (stored.problem) { applyProblem(stored.problem, stored.code); return; }
      const fromCs = await askContentScript(tabId);
      if (fromCs.problem) applyProblem(fromCs.problem, fromCs.code);
    } finally { setTimeout(() => setRefreshing(false), 600); }
  }

  function handleSettingsChange(s: SettingsType) {
    setSettings(s);
    setNoApiKey(s.aiProvider === 'openrouter' ? !s.openRouterApiKey : !s.apiKey);
  }

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060C1A' }}>
        <motion.div
          style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Brain size={20} color="white" />
        </motion.div>
      </div>
    );
  }

  const isContest = settings.contestMode;
  const difficulty = problem?.difficulty ?? 'Unknown';
  const diffStyle = DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES.Unknown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#060C1A', color: '#F1F5F9', fontFamily: "'Inter','Segoe UI Variable','Segoe UI',-apple-system,BlinkMacSystemFont,system-ui,sans-serif", overflow: 'hidden', position: 'relative' }}>
      <LiquidBackground />
      <FloatingOrbs />
      <ParticleField />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', zIndex: 10, flexShrink: 0, borderBottom: '1px solid rgba(124,58,237,0.2)', background: 'linear-gradient(180deg,rgba(124,58,237,0.14) 0%,rgba(6,12,26,0) 100%)', padding: '10px 12px 8px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {/* Animated logo */}
          <motion.div
            style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.5)', flexShrink: 0, position: 'relative' }}
            animate={{ boxShadow: ['0 0 16px rgba(124,58,237,0.4)', '0 0 28px rgba(124,58,237,0.7)', '0 0 16px rgba(124,58,237,0.4)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Brain size={17} color="white" />
            <motion.div
              style={{ position: 'absolute', inset: -2, borderRadius: 12, border: '1px solid rgba(124,58,237,0.5)' }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </motion.div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg,#C4B5FD,#818CF8,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Inter', sans-serif" }}>CodeSense <em style={{ fontStyle: 'italic', fontWeight: 300 }}>AI</em></span>
              {isContest && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Trophy size={8} /> Contest
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#6366F1', marginTop: 1, fontWeight: 500 }}>
              {problem ? (PLATFORM_LABELS[problem.platform] ?? 'Platform') : 'Waiting for problem…'}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <motion.button
              onClick={refreshProblem}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: refreshing ? '#8B5CF6' : '#64748B' }}
              whileHover={{ scale: 1.07, borderColor: 'rgba(139,92,246,0.4)' }}
              whileTap={{ scale: 0.93 }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </motion.button>
            <motion.button
              onClick={() => setShowChat(!showChat)}
              style={{ width: 30, height: 30, borderRadius: 8, background: showChat ? 'rgba(124,58,237,0.25)' : 'rgba(30,41,59,0.8)', border: `1px solid ${showChat ? 'rgba(124,58,237,0.4)' : 'rgba(100,116,139,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showChat ? '#A78BFA' : '#64748B' }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
            >
              <MessageSquare size={13} />
            </motion.button>
          </div>
        </div>

        {/* Problem title + difficulty */}
        <AnimatePresence mode="wait">
          {problem ? (
            <motion.div key={problem.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{problem.title}</span>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: diffStyle.bg, color: diffStyle.color }}>
                  {difficulty}
                </span>
                {submission && (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: getStatusColor(submission.status) }}>{submission.status}</span>
                )}
              </div>

              {/* Company tags row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minHeight: 20 }}>
                <AnimatePresence mode="wait">
                  {companyTags.length > 0 ? (
                    <motion.div key="badges" style={{ display: 'contents' }}>
                      <Building2 size={10} color="#4B5563" style={{ flexShrink: 0 }} />
                      {companyTags.map((c, i) => (
                        <CompanyBadge
                          key={c}
                          name={c}
                          selected={selectedCompany === c}
                          onClick={() => toggleCompanyProblems(c)}
                          delay={i * 0.04}
                        />
                      ))}
                    </motion.div>
                  ) : loadingCompanies ? (
                    <motion.div key="skeletons" style={{ display: 'flex', alignItems: 'center', gap: 4 }} exit={{ opacity: 0 }}>
                      <CompanySkeletonBadge width={70} delay={0} />
                      <CompanySkeletonBadge width={56} delay={0.08} />
                      <CompanySkeletonBadge width={80} delay={0.16} />
                      <CompanySkeletonBadge width={50} delay={0.24} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Company-specific question list panel */}
              <AnimatePresence>
                {selectedCompany && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ marginTop: 7, padding: '8px 9px', borderRadius: 10, background: 'rgba(15,23,42,0.7)', border: `1px solid ${(COMPANY_COLORS[selectedCompany] ?? '#8B5CF6')}30`, maxHeight: 230, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: COMPANY_COLORS[selectedCompany] ?? '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          More {selectedCompany} Questions
                        </span>
                        <button
                          onClick={() => setSelectedCompany(null)}
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>

                      {loadingCompanyProblems && companyProblems.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} style={{ height: 28, borderRadius: 6, background: 'rgba(100,116,139,0.12)' }} />
                          ))}
                        </div>
                      ) : companyProblems.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {companyProblems.map((p, i) => {
                            const ds = DIFFICULTY_STYLES[p.difficulty] ?? DIFFICULTY_STYLES.Unknown;
                            return (
                              <a
                                key={i}
                                href={p.url ?? `https://leetcode.com/problems/${p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none', display: 'block', padding: '6px 8px', borderRadius: 8, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.15)', cursor: 'pointer' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#E2E8F0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: ds.bg, color: ds.color }}>{p.difficulty}</span>
                                </div>
                              </a>
                            );
                          })}
                          {companyProblemsHasMore && (
                            <button
                              onClick={loadMoreCompanyProblems}
                              disabled={loadingCompanyProblems}
                              style={{ marginTop: 2, padding: '6px 8px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px dashed rgba(139,92,246,0.35)', color: '#A78BFA', fontSize: 10.5, fontWeight: 600, cursor: loadingCompanyProblems ? 'default' : 'pointer', textAlign: 'center', opacity: loadingCompanyProblems ? 0.6 : 1 }}
                            >
                              {loadingCompanyProblems ? 'Loading…' : '+ Load More'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: 10.5, color: '#475569', fontStyle: 'italic' }}>No problems found for {selectedCompany}.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.p key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 11, color: '#334155' }}>
              Open a coding problem on any supported platform
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      {/* ── API KEY BANNER ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {noApiKey && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ position: 'relative', zIndex: 10, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ margin: '6px 10px 0', padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={13} color="#F59E0B" />
              <span style={{ fontSize: 11, color: '#FCD34D' }}>
                No API key. <button style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#FCD34D', cursor: 'pointer', fontSize: 11, padding: 0 }} onClick={() => setActiveTab('settings')}>Add in Settings →</button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TAB GRID ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, padding: '6px 8px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.25)' }}>
        {TABS.map((tab) => {
          const isActive  = activeTab === tab.id;
          const isBlocked = isContest && tab.contestBlocked;
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => !isBlocked && setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 4px',
                borderRadius: 10,
                border: isActive ? `1px solid ${tab.color}44` : '1px solid rgba(100,116,139,0.1)',
                background: isActive ? `linear-gradient(135deg,${tab.color}22,${tab.color}0C)` : 'rgba(15,23,42,0.5)',
                cursor: isBlocked ? 'not-allowed' : 'pointer',
                opacity: isBlocked ? 0.35 : 1,
                boxShadow: isActive ? `0 4px 20px ${tab.color}22, inset 0 1px 0 ${tab.color}18` : 'none',
                transformStyle: 'preserve-3d',
              }}
              whileHover={!isBlocked ? { scale: 1.04, rotateX: 4, rotateY: 2, y: -1 } : {}}
              whileTap={!isBlocked ? { scale: 0.95 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Colored icon pill */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: isActive ? `${tab.color}28` : 'rgba(100,116,139,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? tab.color : '#718096',
                transition: 'all 0.2s',
              }}>
                <Icon size={13} />
              </div>
              <span style={{
                fontSize: 9.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#F1F5F9' : '#718096',
                letterSpacing: '0.01em',
                transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif",
              }}>
                {tab.short}
              </span>
              {/* Active dot */}
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  style={{ width: 4, height: 4, borderRadius: '50%', background: tab.color, position: 'absolute', bottom: 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── CONTENT AREA ─────────────────────────────────────────────────────── */}
      {/* Keep-alive panels: all tabs stay mounted so switching tabs never loses
          an in-flight request or result. Keyed by problem identity (not activeTab)
          so navigating to a genuinely different problem still resets everything. */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, overflowY: 'auto', padding: '12px 12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.3) transparent' }}>
        <div key={problem ? `${problem.platform}:${problem.title}` : 'none'}>
          {TABS.map((tab) => (
            <div key={tab.id} className={activeTab === tab.id ? 'tab-panel active' : 'tab-panel inactive'}>
              {tab.id === 'analysis'     && <AnalysisTab problem={problem} code={code} autoRun={autoRun} onAutoRunDone={() => setAutoRun(false)} />}
              {tab.id === 'help'         && <HelpTab problem={problem} />}
              {tab.id === 'solution'     && <SolutionTab problem={problem} contestMode={isContest} />}
              {tab.id === 'optimization' && <OptimizationTab problem={problem} code={code} />}
              {tab.id === 'debug'        && <DebugTab problem={problem} code={code} submission={submission} />}
              {tab.id === 'dryrun'       && <DryRunTab problem={problem} code={code} />}
              {tab.id === 'editorial'    && <EditorialTab problem={problem} contestMode={isContest} />}
              {tab.id === 'interview'    && <InterviewTab problem={problem} code={code} />}
              {tab.id === 'settings'     && <SettingsTab settings={settings} onSettingsChange={handleSettingsChange} />}
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showChat && <ChatPanel problem={problem} code={code} onClose={() => setShowChat(false)} />}
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.6); }
      `}</style>
    </div>
  );
}
