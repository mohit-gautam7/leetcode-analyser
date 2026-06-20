import type { AlgorithmType, Difficulty, SolutionLanguage } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'Easy': return 'text-emerald-400';
    case 'Medium': return 'text-amber-400';
    case 'Hard': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'AC': return 'text-emerald-400';
    case 'WA': return 'text-red-400';
    case 'TLE': return 'text-amber-400';
    case 'MLE': return 'text-orange-400';
    case 'RE': return 'text-purple-400';
    case 'CE': return 'text-blue-400';
    default: return 'text-slate-400';
  }
}

export function getAlgorithmColor(algo: AlgorithmType): string {
  const colors: Record<string, string> = {
    'DFS': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'BFS': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'DP': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Greedy': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Trie': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Heap': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Segment Tree': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Fenwick Tree': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    'Union Find': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Backtracking': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Binary Search': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Two Pointers': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Sliding Window': 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    'Graph': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'Sorting': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'Math': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'String': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    'Hashing': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return colors[algo] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

export function getLanguageIcon(lang: SolutionLanguage): string {
  const icons: Record<SolutionLanguage, string> = {
    cpp: 'C++',
    java: 'Java',
    python: 'Py',
    javascript: 'JS',
    typescript: 'TS',
    go: 'Go',
    rust: 'Rs',
    c: 'C',
  };
  return icons[lang] ?? lang;
}

export function parseComplexity(text: string): { notation: string; type: 'good' | 'ok' | 'bad' | 'neutral' } {
  const match = text.match(/O\([^)]+\)/);
  const notation = match?.[0] ?? text;

  if (notation.includes('1') && !notation.includes('N')) return { notation, type: 'good' };
  if (notation.includes('log')) return { notation, type: 'good' };
  if (notation.includes('N²') || notation.includes('N^2') || notation.includes('2^N')) return { notation, type: 'bad' };
  if (notation.includes('N!')) return { notation, type: 'bad' };
  if (notation.includes('N')) return { notation, type: 'ok' };
  return { notation, type: 'neutral' };
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function isLowEndDevice(): boolean {
  try {
    const nav = navigator as Navigator & { hardwareConcurrency?: number; deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const memory = nav.deviceMemory ?? 4;
    return cores <= 2 || memory <= 2;
  } catch {
    return false;
  }
}

export function extractCodeFromText(text: string, lang?: string): string {
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];
  if (matches.length > 0) {
    return matches[0][1].trim();
  }
  return text.trim();
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
