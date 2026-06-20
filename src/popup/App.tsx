import React, { useState, useEffect } from 'react';
import {
  Brain, Code2, AlertCircle, CheckCircle, Trophy, Zap,
  BarChart2, HelpCircle, Bug, Play, BookOpen, UserCheck,
  Settings, ArrowLeft, RefreshCw, ChevronRight, Building2
} from 'lucide-react';
import { storage } from '@/storage';
import { aiService } from '@/services/ai-service';
import type { Settings as SettingsType, AIMode, Problem, UserCode, AnalysisResult } from '@/types';

const COMPANY_COLORS: Record<string, string> = {
  'Google': '#4285F4', 'Amazon': '#FF9900', 'Microsoft': '#00A4EF',
  'Meta': '#1877F2', 'Apple': '#A2AAAD', 'Netflix': '#E50914',
  'Uber': '#1FC7C7', 'LinkedIn': '#0A66C2', 'Adobe': '#FF0000',
  'Bloomberg': '#E85C0D', 'Goldman Sachs': '#5B8DEF', 'Walmart': '#007DC6',
  'Airbnb': '#FF5A5F', 'Stripe': '#635BFF', 'Oracle': '#F80000',
  'Atlassian': '#0052CC', 'TikTok': '#69C9D0', 'Twitter': '#1DA1F2',
};

const ACTIONS: { id: AIMode; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { id: 'analysis',     label: 'Analyze',   icon: <BarChart2 size={15} />,  color: '#8B5CF6', desc: 'Complexity & approach' },
  { id: 'help',         label: 'Hints',     icon: <HelpCircle size={15} />, color: '#22C55E', desc: 'Progressive hints' },
  { id: 'solution',     label: 'Solution',  icon: <Code2 size={15} />,      color: '#3B82F6', desc: 'Full solution code' },
  { id: 'optimization', label: 'Optimize',  icon: <Zap size={15} />,        color: '#F59E0B', desc: 'Improve your code' },
  { id: 'debug',        label: 'Debug',     icon: <Bug size={15} />,        color: '#EF4444', desc: 'Fix TLE / WA / RE' },
  { id: 'dryrun',       label: 'Dry Run',   icon: <Play size={15} />,       color: '#06B6D4', desc: 'Step-by-step trace' },
  { id: 'editorial',   label: 'Editorial',  icon: <BookOpen size={15} />,   color: '#A78BFA', desc: 'In-depth editorial' },
  { id: 'interview',   label: 'Interview',  icon: <UserCheck size={15} />,  color: '#EC4899', desc: 'FAANG mock prep' },
];

const SUPPORTED = ['leetcode.com','geeksforgeeks.org','codeforces.com','codechef.com','atcoder.jp','hackerrank.com','codingninjas.com','interviewbit.com','cses.fi','spoj.com'];
const SITE_NAMES: Record<string,string> = {'leetcode.com':'LeetCode','geeksforgeeks.org':'GeeksForGeeks','codeforces.com':'Codeforces','codechef.com':'CodeChef','atcoder.jp':'AtCoder','hackerrank.com':'HackerRank','codingninjas.com':'Coding Ninjas','interviewbit.com':'InterviewBit','cses.fi':'CSES','spoj.com':'SPOJ'};

type Screen = 'home' | 'analyzing' | 'result' | 'error';

// Reads the problem for the CURRENTLY ACTIVE tab only — never a stale/global
// "last detected" value that could belong to a different window's tab.
async function getDetectedProblem(): Promise<{ problem: Problem | null; code: UserCode | null }> {
  const [tab] = await new Promise<chrome.tabs.Tab[]>((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
  if (!tab?.id) return { problem: null, code: null };
  const tabId = tab.id;

  const stored = await new Promise<{ problem: Problem | null; code: UserCode | null }>((resolve) => {
    chrome.storage.local.get([`problem_${tabId}`, `code_${tabId}`], (r: Record<string, unknown>) =>
      resolve({
        problem: (r[`problem_${tabId}`] as Problem) ?? null,
        code: (r[`code_${tabId}`] as UserCode) ?? null,
      })
    );
  });
  if (stored.problem) return stored;

  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_PROBLEM' });
    return { problem: res?.problem ?? null, code: res?.code ?? stored.code };
  } catch {
    return stored;
  }
}

export default function PopupApp() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [currentSite, setCurrentSite] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [companyTags, setCompanyTags] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const SUPPORTED_LIST = SUPPORTED;

  useEffect(() => {
    storage.getSettings().then(setSettings);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.url) {
          const matched = SUPPORTED_LIST.find((s) => tab.url!.includes(s));
          setCurrentSite(matched ? SITE_NAMES[matched] : null);
          setIsSupported(!!matched);
        }
      });
    }
  }, []);

  async function openPanel(tab?: AIMode) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (tab) await new Promise<void>((r) => chrome.storage.local.set({ openToTab: tab }, r));
      const [t] = await new Promise<chrome.tabs.Tab[]>((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
      if (t?.id) { await chrome.sidePanel.open({ tabId: t.id }); window.close(); }
    }
  }

  async function runAnalysis() {
    setScreen('analyzing');
    setResult(null);
    setCompanyTags([]);
    setErrorMsg('');
    try {
      const { problem, code } = await getDetectedProblem();
      if (!problem) {
        setErrorMsg('No problem detected. Open a LeetCode/Codeforces problem first, then try again.');
        setScreen('error');
        return;
      }
      // Run analysis and company detection in parallel
      const [res, companies] = await Promise.all([
        aiService.analyze(problem, code ?? undefined),
        aiService.getCompanyTags(problem).catch(() => [] as string[]),
      ]);
      setResult(res);
      setCompanyTags(companies);
      setScreen('result');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Analysis failed. Check your API key in Settings.');
      setScreen('error');
    }
  }

  async function handleAction(id: AIMode) {
    if (id === 'analysis') {
      await runAnalysis();
    } else {
      await openPanel(id);
    }
  }

  async function toggleContest() {
    if (!settings) return;
    const updated = { ...settings, contestMode: !settings.contestMode };
    await storage.saveSettings(updated);
    setSettings(updated);
  }

  const hasKey = settings
    ? settings.aiProvider === 'openrouter' ? !!settings.openRouterApiKey : !!settings.apiKey
    : false;
  const providerLabel = settings?.aiProvider === 'openrouter' ? 'OpenRouter' : 'NVIDIA NIM';

  const S = (o: React.CSSProperties) => o;

  // ─── Header (shared) ────────────────────────────────────────────────────────
  const Header = (
    <div style={S({ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.08))', display: 'flex', alignItems: 'center', gap: 10 })}>
      {screen !== 'home' && (
        <button onClick={() => setScreen('home')} style={S({ background: 'none', border: 'none', cursor: 'pointer', color: '#8B5CF6', display: 'flex', alignItems: 'center', padding: 0, marginRight: 2 })}>
          <ArrowLeft size={16} />
        </button>
      )}
      <div style={S({ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.45)', flexShrink: 0 })}>
        <Brain size={17} color="white" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={S({ fontWeight: 700, fontSize: 14, color: '#F1F5F9', lineHeight: 1 })}>CodeSense AI</div>
        <div style={S({ fontSize: 11, color: '#8B5CF6', fontWeight: 500, marginTop: 2 })}>
          {screen === 'analyzing' ? 'Analyzing your code…' : screen === 'result' ? 'Analysis complete' : `Powered by ${providerLabel}`}
        </div>
      </div>
      <button onClick={() => openPanel('settings')} style={S({ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 7, padding: '5px 6px', cursor: 'pointer', color: '#94A3B8', display: 'flex' })}>
        <Settings size={14} />
      </button>
    </div>
  );

  // ─── Analyzing screen ────────────────────────────────────────────────────────
  if (screen === 'analyzing') {
    return (
      <div style={S({ width: 300, background: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter','Segoe UI Variable',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13 })}>
        {Header}
        <div style={S({ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 })}>
          <div style={S({ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <RefreshCw size={24} color="#8B5CF6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={S({ fontWeight: 600, color: '#E2E8F0', fontSize: 14 })}>Analyzing your solution</div>
            <div style={S({ color: '#64748B', fontSize: 12, marginTop: 4 })}>AI is reviewing complexity & approach…</div>
          </div>
          {[60, 45, 50].map((w, i) => (
            <div key={i} style={S({ height: 10, borderRadius: 5, background: 'rgba(100,116,139,0.2)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.2}s` })} />
          ))}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      </div>
    );
  }

  // ─── Error screen ────────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <div style={S({ width: 300, background: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter','Segoe UI Variable',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13 })}>
        {Header}
        <div style={S({ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 })}>
          <div style={S({ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 10 })}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={S({ fontWeight: 600, color: '#FCA5A5', fontSize: 12, marginBottom: 4 })}>Analysis Failed</div>
              <div style={S({ color: '#FDA4AF', fontSize: 11, lineHeight: 1.5 })}>{errorMsg}</div>
            </div>
          </div>
          <button onClick={runAnalysis} style={S({ padding: '9px', borderRadius: 9, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 })}>
            <RefreshCw size={13} /> Try Again
          </button>
          <button onClick={() => openPanel('settings')} style={S({ padding: '9px', borderRadius: 9, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)', color: '#94A3B8', fontSize: 12, cursor: 'pointer' })}>
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  // ─── Result screen ───────────────────────────────────────────────────────────
  if (screen === 'result' && result) {
    return (
      <div style={S({ width: 300, background: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter','Segoe UI Variable',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13, maxHeight: 560, display: 'flex', flexDirection: 'column' })}>
        {Header}
        <div style={S({ overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 })}>

          {/* Status badges */}
          <div style={S({ display: 'flex', gap: 6, flexWrap: 'wrap' })}>
            {[{ l: 'Approach', ok: true }, { l: 'Efficiency', ok: !result.canOptimize }, { l: 'Code Style', ok: result.codeQuality >= 70 }].map(b => (
              <span key={b.l} style={S({ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: b.ok ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${b.ok ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, color: b.ok ? '#4ADE80' : '#FCD34D' })}>
                <CheckCircle size={10} />{b.l}
              </span>
            ))}
          </div>

          {/* Company tags */}
          {companyTags.length > 0 && (
            <div style={S({ padding: '10px 12px', borderRadius: 10, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)' })}>
              <div style={S({ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 })}>
                <Building2 size={11} color="#8B5CF6" />
                <span style={S({ fontSize: 10, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.07em' })}>Asked by</span>
              </div>
              <div style={S({ display: 'flex', flexWrap: 'wrap', gap: 5 })}>
                {companyTags.map(name => {
                  const color = COMPANY_COLORS[name] ?? '#8B5CF6';
                  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <span key={name} style={S({ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 20, background: color + '18', border: `1px solid ${color}40`, fontSize: 10, fontWeight: 600, color })}>
                      <span style={S({ width: 16, height: 16, borderRadius: '50%', background: color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 })}>{initials}</span>
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approach */}
          <div style={S({ padding: '11px 13px', borderRadius: 10, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)' })}>
            <div style={S({ fontSize: 10, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 })}>⬡ Approach</div>
            <div style={S({ fontSize: 12, color: '#CBD5E1', lineHeight: 1.55 })}>{result.approach}</div>
          </div>

          {/* Complexity */}
          <div style={S({ padding: '11px 13px', borderRadius: 10, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)' })}>
            <div style={S({ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 })}>⚡ Efficiency</div>
            <div style={S({ display: 'flex', flexDirection: 'column', gap: 5 })}>
              {[
                { label: 'Time', value: result.currentComplexity.time, color: '#E2E8F0' },
                { label: 'Space', value: result.currentComplexity.space, color: '#E2E8F0' },
                ...(result.canOptimize ? [{ label: 'Optimal', value: result.requiredComplexity.time, color: '#4ADE80' }] : []),
              ].map(r => (
                <div key={r.label} style={S({ display: 'flex', alignItems: 'center', gap: 8 })}>
                  <span style={S({ fontSize: 11, color: '#64748B', width: 44 })}>{r.label}</span>
                  <span style={S({ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',Consolas,monospace", color: r.color })}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={S({ marginTop: 7, fontSize: 11, color: result.canOptimize ? '#FCD34D' : '#4ADE80', lineHeight: 1.45 })}>
              {result.canOptimize && result.optimizationSummary ? result.optimizationSummary : 'Your solution is already optimal.'}
            </div>
          </div>

          {/* Code quality bars */}
          <div style={S({ padding: '11px 13px', borderRadius: 10, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)' })}>
            <div style={S({ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 })}>◈ Code Style</div>
            {[
              { label: 'Readability', val: result.readability, color: '#22C55E' },
              { label: 'Quality', val: result.codeQuality, color: '#8B5CF6' },
              { label: 'Efficiency', val: result.efficiency, color: '#F59E0B' },
            ].map(b => (
              <div key={b.label} style={S({ marginBottom: 7 })}>
                <div style={S({ display: 'flex', justifyContent: 'space-between', marginBottom: 3 })}>
                  <span style={S({ fontSize: 11, color: '#94A3B8' })}>{b.label}</span>
                  <span style={S({ fontSize: 11, fontWeight: 600, color: b.color })}>{b.val}%</span>
                </div>
                <div style={S({ height: 5, borderRadius: 3, background: 'rgba(100,116,139,0.25)', overflow: 'hidden' })}>
                  <div style={S({ height: '100%', borderRadius: 3, background: b.color, width: `${b.val}%`, transition: 'width 0.6s ease' })} />
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div style={S({ padding: '11px 13px', borderRadius: 10, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.2)' })}>
              <div style={S({ fontSize: 10, fontWeight: 700, color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 })}>💡 Suggestions</div>
              {result.suggestions.slice(0, 3).map((s, i) => (
                <div key={i} style={S({ display: 'flex', gap: 7, marginBottom: 5 })}>
                  <ChevronRight size={12} color="#8B5CF6" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={S({ fontSize: 11, color: '#CBD5E1', lineHeight: 1.5 })}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Open full panel */}
          <button onClick={() => openPanel('analysis')} style={S({ width: '100%', padding: '9px', borderRadius: 9, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 })}>
            <Code2 size={13} /> Open Full Analysis in Panel
          </button>

          {/* Re-analyze */}
          <button onClick={runAnalysis} style={S({ width: '100%', padding: '8px', borderRadius: 9, background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(100,116,139,0.2)', color: '#94A3B8', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 })}>
            <RefreshCw size={11} /> Re-analyze
          </button>
        </div>
      </div>
    );
  }

  // ─── Home screen ─────────────────────────────────────────────────────────────
  return (
    <div style={S({ width: 300, background: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter','Segoe UI Variable',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13 })}>
      {Header}
      <div style={S({ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 })}>

        {/* Status row */}
        <div style={S({ display: 'flex', gap: 6 })}>
          <div style={S({ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, background: isSupported ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', border: `1px solid ${isSupported ? 'rgba(34,197,94,0.28)' : 'rgba(100,116,139,0.2)'}` })}>
            <CheckCircle size={13} color={isSupported ? '#22C55E' : '#64748B'} />
            <span style={S({ fontSize: 11, color: isSupported ? '#86EFAC' : '#64748B', fontWeight: 500 })}>{isSupported ? currentSite : 'Not supported'}</span>
          </div>
          <div style={S({ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, background: hasKey ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${hasKey ? 'rgba(34,197,94,0.28)' : 'rgba(245,158,11,0.3)'}` })}>
            {hasKey ? <Zap size={13} color="#22C55E" /> : <AlertCircle size={13} color="#F59E0B" />}
            <span style={S({ fontSize: 11, color: hasKey ? '#86EFAC' : '#FCD34D', fontWeight: 500 })}>{hasKey ? 'Key ready' : 'Key missing'}</span>
          </div>
        </div>

        {/* Open full panel */}
        <button onClick={() => openPanel()} style={S({ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.38)' })}>
          <Code2 size={15} /> Open AI Panel
        </button>

        {/* Quick Actions */}
        <div>
          <div style={S({ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 1 })}>Quick Actions</div>
          <div style={S({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 })}>
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAction(a.id)}
                style={S({ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 8, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(100,116,139,0.18)', cursor: 'pointer', textAlign: 'left', color: 'white' })}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = a.color + '55'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(100,116,139,0.18)'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.8)'; }}
              >
                <div style={S({ width: 26, height: 26, borderRadius: 7, background: a.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 })}>{a.icon}</div>
                <div>
                  <div style={S({ fontSize: 12, fontWeight: 600, color: '#E2E8F0', lineHeight: 1 })}>{a.label}</div>
                  <div style={S({ fontSize: 10, color: '#64748B', marginTop: 2, lineHeight: 1 })}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Contest Mode */}
        {settings && (
          <div style={S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(100,116,139,0.18)' })}>
            <div style={S({ display: 'flex', alignItems: 'center', gap: 7 })}>
              <Trophy size={14} color={settings.contestMode ? '#F59E0B' : '#64748B'} />
              <span style={S({ fontSize: 12, color: '#CBD5E1' })}>Contest Mode</span>
            </div>
            <div onClick={toggleContest} style={S({ width: 36, height: 20, borderRadius: 10, background: settings.contestMode ? '#8B5CF6' : '#334155', cursor: 'pointer', transition: 'background 0.2s', position: 'relative' })}>
              <div style={S({ position: 'absolute', top: 2, left: settings.contestMode ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' })} />
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <span style={S({ display: 'inline-block', padding: '2px 7px', borderRadius: 5, background: '#1E293B', border: '1px solid #334155', fontSize: 11, color: '#475569' })}>Ctrl+Shift+A</span>
          <span style={S({ fontSize: 11, color: '#334155', marginLeft: 5 })}>to open panel</span>
        </div>
      </div>
    </div>
  );
}
