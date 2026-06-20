import type { Problem, UserCode, SubmissionResult, ProblemExample, Difficulty } from '@/types';
import { BasePlatform } from './base';

export class GFGPlatform extends BasePlatform {
  readonly platform = 'gfg' as const;
  readonly displayName = 'GeeksForGeeks';
  readonly urlPatterns = [
    /practice\.geeksforgeeks\.org\/problems\//,
    /www\.geeksforgeeks\.org\/problems\//,
    /geeksforgeeks\.org\/problems\//,
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
        editorialAvailable: !!document.querySelector('a[href*="/editorial"], [class*="editorial" i]'),
      });
    } catch {
      return null;
    }
  }

  private extractTitle(): string {
    const selectors = [
      'h3.problem-name',
      '.problems_header h3',
      '.problem-name',
      'h1.problem-name',
      '.problem-tab-content h1',
      '.problem-tab-content h2',
      'div[class*="problemHeading" i]',
      'div[class*="ProblemHeading" i]',
      '[class*="problem-title" i]',
      '[class*="problemTitle" i]',
      '[data-testid*="problem-title" i]',
      'main h1',
      'main h2',
      'h1',
    ];
    for (const sel of selectors) {
      const text = document.querySelector(sel)?.textContent?.trim();
      if (text && this.looksLikeTitle(text)) return text;
    }

    const fromDocTitle = this.titleFromDocTitle();
    if (fromDocTitle) return fromDocTitle;

    return this.titleFromUrl();
  }

  private looksLikeTitle(text: string): boolean {
    if (text.length < 3 || text.length > 120) return false;
    const lower = text.toLowerCase();
    if (lower.includes('geeksforgeeks') || lower === 'practice' || lower === 'problem') return false;
    return true;
  }

  private titleFromDocTitle(): string {
    const t = document.title;
    if (!t) return '';
    const parts = t.split(/\s*[|\-–]\s*/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (this.looksLikeTitle(part)) return part;
    }
    return '';
  }

  private titleFromUrl(): string {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    if (!match) return '';
    return match[1]
      .replace(/-\d+$/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private extractStatement(): string {
    const selectors = [
      '.problem-statement',
      '.problems_content',
      '.problem-body',
      'div[class*="problemStatement" i]',
      'div[class*="ProblemStatement" i]',
      '[class*="problem-content" i]',
      '[class*="problemContent" i]',
      'main article',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 30) return this.cleanHtml(el);
    }
    return '';
  }

  private extractExamples(): ProblemExample[] {
    const examples: ProblemExample[] = [];
    const containers = document.querySelectorAll(
      '.example-card, [class*="example" i], .ip-output-area, pre'
    );
    containers.forEach((el) => {
      const text = el.textContent?.trim() ?? '';
      if (/input\s*:/i.test(text) && /output\s*:/i.test(text)) {
        const inputMatch = text.match(/Input\s*:\s*([\s\S]*?)(?=Output\s*:|$)/i);
        const outputMatch = text.match(/Output\s*:\s*([\s\S]*?)(?=Explanation\s*:|$)/i);
        const explMatch = text.match(/Explanation\s*:\s*([\s\S]*?)$/i);
        if (inputMatch && outputMatch) {
          examples.push({
            input: inputMatch[1].trim(),
            output: outputMatch[1].trim(),
            explanation: explMatch?.[1]?.trim(),
          });
        }
      }
    });
    if (examples.length > 0) return this.dedupeExamples(examples);

    // Fallback: scan visible body text for repeated Input/Output/Explanation blocks
    const bodyText = document.body.innerText ?? '';
    const blocks = bodyText.split(/(?=Input\s*:\s*)/i).filter((b) => /Input\s*:/i.test(b) && /Output\s*:/i.test(b));
    for (const block of blocks.slice(0, 6)) {
      const inputMatch = block.match(/Input\s*:\s*([\s\S]*?)(?=Output\s*:)/i);
      const outputMatch = block.match(/Output\s*:\s*([\s\S]*?)(?=Explanation\s*:|Input\s*:|$)/i);
      const explMatch = block.match(/Explanation\s*:\s*([\s\S]*?)(?=Input\s*:|$)/i);
      if (inputMatch && outputMatch) {
        const input = inputMatch[1].trim().slice(0, 300);
        const output = outputMatch[1].trim().slice(0, 300);
        if (input && output) {
          examples.push({ input, output, explanation: explMatch?.[1]?.trim().slice(0, 300) });
        }
      }
    }
    return this.dedupeExamples(examples);
  }

  private dedupeExamples(examples: ProblemExample[]): ProblemExample[] {
    const seen = new Set<string>();
    const out: ProblemExample[] = [];
    for (const ex of examples) {
      const key = ex.input + '|' + ex.output;
      if (!seen.has(key)) { seen.add(key); out.push(ex); }
    }
    return out.slice(0, 5);
  }

  private extractConstraints(): string[] {
    const selectors = ['.problem-constraints', '.constraint-field', '[class*="constraint" i]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const lines = this.cleanHtml(el).split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }
    const bodyText = document.body.innerText ?? '';
    const section = bodyText.match(/Constraints?\s*:([\s\S]*?)(?=\n\s*\n|Examples?\s*:|Expected|$)/i);
    if (section) {
      return section[1].split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 10);
    }
    return [];
  }

  private extractDifficulty(): Difficulty {
    const selectors = ['.problem-difficulty', '[class*="difficulty" i]', '[class*="Difficulty"]'];
    for (const sel of selectors) {
      const d = this.parseDifficulty(document.querySelector(sel)?.textContent ?? '');
      if (d !== 'Unknown') return d;
    }
    const match = (document.body.innerText ?? '').match(/Difficulty\s*:?\s*(Easy|Medium|Hard)/i);
    if (match) return this.parseDifficulty(match[1]);
    return 'Unknown';
  }

  private extractTags(): string[] {
    const tags = this.getTexts('.problem-tags a, .tags a, [class*="tag" i] a').filter(Boolean);
    if (tags.length > 0) return tags;
    return this.getTexts('[class*="topic" i] a, [class*="Topic" i] a').filter(Boolean);
  }

  extractUserCode(): UserCode | null {
    try {
      const win = window as unknown as Record<string, unknown>;
      const monaco = win['monaco'] as { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } } | undefined;
      if (monaco?.editor?.getEditors) {
        const editors = monaco.editor.getEditors();
        if (editors?.length > 0) {
          const code = editors[0].getValue?.() ?? '';
          if (code) return { code, language: this.parseLanguage(this.extractLanguage()), lastModified: Date.now() };
        }
      }

      const codeEl = document.querySelector('.CodeMirror') as HTMLElement & { CodeMirror?: { getValue?: () => string } } | null;
      if (codeEl?.CodeMirror?.getValue) {
        const code = codeEl.CodeMirror.getValue();
        if (code) return { code, language: this.parseLanguage(this.extractLanguage()), lastModified: Date.now() };
      }

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
    const langSelect = document.querySelector('select.lang-switcher, #language') as HTMLSelectElement | null;
    if (langSelect) {
      const text = langSelect.options[langSelect.selectedIndex]?.text;
      if (text) return text;
    }
    const langButton = document.querySelector('[class*="language" i] button, button[class*="lang" i]');
    if (langButton?.textContent) return langButton.textContent.trim();
    return 'cpp';
  }

  extractSubmissionResult(): SubmissionResult | null {
    const resultEl = document.querySelector('.verdict, .result-section, [class*="verdict" i]');
    if (!resultEl) return null;
    const text = resultEl.textContent?.trim() ?? '';
    return {
      status: text.toLowerCase().includes('correct') ? 'AC' : text.toLowerCase().includes('wrong') ? 'WA' : 'Unknown',
      runtime: document.querySelector('.time-taken')?.textContent?.trim(),
    };
  }
}
