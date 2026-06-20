import type { Problem, UserCode, SubmissionResult, ProblemExample } from '@/types';
import { BasePlatform } from './base';

export class LeetCodePlatform extends BasePlatform {
  readonly platform = 'leetcode' as const;
  readonly displayName = 'LeetCode';
  readonly urlPatterns = [
    /leetcode\.com\/problems\//,
    /leetcode\.com\/contest\//,
  ];

  extractProblem(): Problem | null {
    try {
      const title = this.extractTitle();
      if (!title) return null;

      return this.createProblem({
        title,
        statement: this.extractStatement(),
        examples: this.extractExamples(),
        constraints: this.extractConstraints(),
        difficulty: this.extractDifficulty(),
        tags: this.extractTags(),
        editorialAvailable: !!document.querySelector('[href*="/editorial"]'),
        companies: this.extractCompanies(),
      });
    } catch {
      return null;
    }
  }

  private extractTitle(): string {
    // Most reliable on LeetCode SPA: extract slug from URL
    // e.g. leetcode.com/problems/two-sum/submissions/ → "Two Sum"
    const urlSlug = this.slugFromUrl();
    if (urlSlug) {
      // Try to get the numbered title from DOM first
      const numbered = this.titleFromDom();
      if (numbered && !numbered.toLowerCase().includes('problem list') && !numbered.toLowerCase().includes('explore')) {
        return numbered;
      }
      return urlSlug;
    }

    return this.titleFromDom();
  }

  private slugFromUrl(): string {
    const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (!match) return '';
    // Convert "two-sum" → "Two Sum"
    return match[1]
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private titleFromDom(): string {
    // Parse document.title "123. Problem Name - LeetCode"
    const docTitle = document.title;
    if (docTitle && docTitle.includes(' - LeetCode')) {
      const clean = docTitle.replace(' - LeetCode', '').trim();
      if (clean.length > 2 && !clean.toLowerCase().includes('problem list') && !clean.toLowerCase().includes('explore')) {
        return clean;
      }
    }

    const selectors = [
      '[data-cy="question-title"]',
      '.text-title-large a',
      '.text-title-large',
      '[class*="title__"] a',
      '[class*="questionTitle"]',
      'h1[class*="title"]',
      'div[class*="description"] h1',
      'div[class*="question"] h1',
    ];

    for (const sel of selectors) {
      const text = document.querySelector(sel)?.textContent?.trim();
      if (text && text.length > 2) return text;
    }

    const h1 = document.querySelector('h1');
    return h1?.textContent?.trim() ?? '';
  }

  private extractStatement(): string {
    const selectors = [
      '[data-cy="question-content"]',
      '[class*="description__"]:not([class*="tab"])',
      '[data-track-load="description_content"]',
      '.elfjS',
      '[class*="content__"]',
      '.question-content',
      '[class*="questionContent"]',
      // newer LeetCode
      'div[class*="problem-description"]',
      '.px-5 .break-words',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 30) {
        return this.cleanHtml(el);
      }
    }
    return '';
  }

  private extractExamples(): ProblemExample[] {
    const examples: ProblemExample[] = [];
    document.querySelectorAll('pre').forEach((pre) => {
      const text = pre.textContent?.trim() ?? '';
      if (text.includes('Input:') && text.includes('Output:')) {
        const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/);
        const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/);
        const explMatch = text.match(/Explanation:\s*([\s\S]*?)$/);
        if (inputMatch && outputMatch) {
          examples.push({
            input: inputMatch[1].trim(),
            output: outputMatch[1].trim(),
            explanation: explMatch?.[1].trim(),
          });
        }
      }
    });
    return examples;
  }

  private extractConstraints(): string[] {
    const content = this.extractStatement();
    const section = content.match(/Constraints?:([\s\S]*?)(?=\n\n|$)/i);
    if (section) {
      return section[1].split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    }
    return [];
  }

  private extractDifficulty(): 'Easy' | 'Medium' | 'Hard' | 'Unknown' {
    // Try colored difficulty badge — LeetCode uses specific text colors
    const selectors = [
      '[class*="difficulty"]',
      '[diff]',
      '[class*="Difficulty"]',
      // LeetCode 2024+ uses inline color styles or class suffixes
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      '[class*="-easy"]',
      '[class*="-medium"]',
      '[class*="-hard"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim() ?? '';
      const d = this.parseDifficulty(text);
      if (d !== 'Unknown') return d;
    }

    // Scan visible text for difficulty keywords in colored elements
    const allEls = document.querySelectorAll('span, div');
    for (const el of Array.from(allEls)) {
      const text = el.textContent?.trim();
      if (text === 'Easy' || text === 'Medium' || text === 'Hard') {
        return text as 'Easy' | 'Medium' | 'Hard';
      }
    }
    return 'Unknown';
  }

  private extractTags(): string[] {
    const tagEls = document.querySelectorAll('[class*="tag-"], .topic-tag, [data-tag], [class*="topicTag"]');
    return Array.from(tagEls).map((el) => el.textContent?.trim() ?? '').filter((t) => t.length > 0);
  }

  private extractCompanies(): string[] {
    try {
      // LeetCode stores company tag data in __NEXT_DATA__ (global React server data)
      type CompanyTag = { name: string; slug: string };
      type CompanyStats = Record<string, CompanyTag[]>;
      type Question = { companyTagStats?: string | CompanyStats; companyTags?: CompanyTag[] };
      type Query = { state?: { data?: { question?: Question } } };
      type NextData = { props?: { pageProps?: { dehydratedState?: { queries?: Query[] } } } };

      const nextData = (window as unknown as { __NEXT_DATA__?: NextData }).__NEXT_DATA__;
      const queries = nextData?.props?.pageProps?.dehydratedState?.queries ?? [];

      for (const q of queries) {
        const question = q?.state?.data?.question;
        if (!question) continue;

        // companyTagStats is a JSON-encoded tier map: {"1":[...high freq], "2":[...med], "3":[...low], ...}
        // Merge ALL tiers (not just 1+2) so lower-frequency companies (e.g. Nvidia) aren't dropped.
        if (question.companyTagStats) {
          try {
            const stats: CompanyStats = typeof question.companyTagStats === 'string'
              ? (JSON.parse(question.companyTagStats) as CompanyStats)
              : (question.companyTagStats as CompanyStats);
            const tierKeys = Object.keys(stats).sort((a, b) => Number(a) - Number(b));
            const names = tierKeys.flatMap((t) => stats[t] ?? []).map((c) => c.name).filter(Boolean);
            const seen = new Set<string>();
            const companies = names.filter((n) => {
              if (seen.has(n)) return false;
              seen.add(n);
              return true;
            });
            if (companies.length > 0) return companies.slice(0, 10);
          } catch { /* skip */ }
        }

        // Newer API: direct companyTags array
        if (question.companyTags && question.companyTags.length > 0) {
          return question.companyTags.map((c) => c.name).filter(Boolean).slice(0, 10);
        }
      }
    } catch { /* skip */ }
    return [];
  }

  extractUserCode(): UserCode | null {
    try {
      // Method 1: Monaco editor via window.monaco
      const win = window as unknown as Record<string, unknown>;
      const monaco = win['monaco'] as { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } } | undefined;
      if (monaco?.editor?.getEditors) {
        const editors = monaco.editor.getEditors();
        if (editors?.length > 0) {
          const code = editors[0].getValue?.() ?? '';
          if (code) return { code, language: this.parseLanguage(this.extractLanguage()), lastModified: Date.now() };
        }
      }

      // Method 2: Look for monaco editor models
      const monacoEditor = win['MonacoEnvironment'] as unknown;
      if (monacoEditor) {
        // Try to get value from Monaco model
      }

      // Method 3: CodeMirror
      const cmEl = document.querySelector('.CodeMirror') as HTMLElement & { CodeMirror?: { getValue?: () => string } } | null;
      if (cmEl?.CodeMirror?.getValue) {
        const code = cmEl.CodeMirror.getValue();
        if (code) return { code, language: this.parseLanguage(this.extractLanguage()), lastModified: Date.now() };
      }

      // Method 4: Read Monaco view lines from DOM
      const viewLines = document.querySelectorAll('.view-line');
      if (viewLines.length > 0) {
        const code = Array.from(viewLines).map((l) => l.textContent ?? '').join('\n');
        if (code.trim()) return { code, language: this.parseLanguage(this.extractLanguage()), lastModified: Date.now() };
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractLanguage(): string {
    const selectors = [
      '[id*="headlessui-listbox-button"]',
      'button[class*="lang"]',
      '[class*="language"] button',
      '[class*="Language"] button',
      '[id*="language"]',
      'button[class*="language"]',
    ];
    for (const sel of selectors) {
      const text = document.querySelector(sel)?.textContent?.trim();
      if (text) return text;
    }
    // Detect from Monaco: check active tab or data attributes
    const langAttr = document.querySelector('[data-mode-id]')?.getAttribute('data-mode-id');
    if (langAttr) return langAttr;
    return 'cpp';
  }

  extractSubmissionResult(): SubmissionResult | null {
    try {
      const selectors = [
        '[data-e2e-locator="submission-result"]',
        '.result-state',
        '[class*="submission-result"]',
        '[class*="submissionResult"]',
        '[class*="resultState"]',
      ];

      let statusEl: Element | null = null;
      for (const sel of selectors) {
        statusEl = document.querySelector(sel);
        if (statusEl) break;
      }
      if (!statusEl) return null;

      const statusText = statusEl.textContent?.trim() ?? '';
      const status = this.parseStatus(statusText);

      const runtimeEl = document.querySelector('[data-e2e-locator="submission-runtime"]') ?? document.querySelector('[class*="runtime"]');
      const memoryEl = document.querySelector('[data-e2e-locator="submission-memory"]') ?? document.querySelector('[class*="memory"]');

      return {
        status,
        runtime: runtimeEl?.textContent?.trim(),
        memory: memoryEl?.textContent?.trim(),
        submittedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }

  private parseStatus(text: string): SubmissionResult['status'] {
    const lower = text.toLowerCase();
    if (lower.includes('accepted')) return 'AC';
    if (lower.includes('wrong')) return 'WA';
    if (lower.includes('time limit')) return 'TLE';
    if (lower.includes('memory limit')) return 'MLE';
    if (lower.includes('runtime error')) return 'RE';
    if (lower.includes('compile')) return 'CE';
    return 'Unknown';
  }
}
