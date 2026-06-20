import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class CodingNinjasPlatform extends BasePlatform {
  readonly platform = 'codingninjas' as const;
  readonly displayName = 'Coding Ninjas';
  readonly urlPatterns = [
    /codingninjas\.com\/studio\/problems\//,
    /naukri\.com\/code360\/problems\//,
  ];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('h1.problem-title, [class*="problem-title"], [class*="ProblemTitle"]');
      if (!title) return null;

      const statement = this.extractStatement();
      const examples = this.extractExamples();
      const constraints = this.extractConstraints();
      const difficulty = this.parseDifficulty(this.getText('[class*="difficulty"], [class*="Difficulty"]'));

      return this.createProblem({ title, statement, examples, constraints, difficulty });
    } catch {
      return null;
    }
  }

  private extractStatement(): string {
    const el = document.querySelector('[class*="problem-statement"], [class*="ProblemStatement"]');
    return el ? this.cleanHtml(el) : '';
  }

  private extractExamples() {
    const examples = [];
    const inputEls = document.querySelectorAll('[class*="sample"] [class*="input"], [class*="Sample"] [class*="Input"]');
    const outputEls = document.querySelectorAll('[class*="sample"] [class*="output"], [class*="Sample"] [class*="Output"]');

    for (let i = 0; i < inputEls.length; i++) {
      examples.push({
        input: inputEls[i].textContent?.trim() ?? '',
        output: outputEls[i]?.textContent?.trim() ?? '',
      });
    }
    return examples;
  }

  private extractConstraints(): string[] {
    const el = document.querySelector('[class*="constraint"], [class*="Constraint"]');
    return el ? this.cleanHtml(el).split('\n').filter(Boolean) : [];
  }

  extractUserCode(): UserCode | null {
    try {
      const monacoEl = document.querySelector('.monaco-editor');
      if (monacoEl) {
        const monaco = (window as unknown as Record<string, unknown>)['monaco'];
        if (monaco) {
          const editors = (monaco as { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } }).editor?.getEditors?.();
          if (editors && editors.length > 0) {
            const code = editors[0].getValue?.() ?? '';
            const lang = document.querySelector('[class*="language-selector"]')?.textContent?.trim() ?? 'python';
            return code ? { code, language: this.parseLanguage(lang), lastModified: Date.now() } : null;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('[class*="verdict"], [class*="Verdict"]');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: text.toLowerCase().includes('accepted') ? 'AC' : text.toLowerCase().includes('wrong') ? 'WA' : 'Unknown',
    };
  }
}
