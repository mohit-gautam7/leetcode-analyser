import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class HackerRankPlatform extends BasePlatform {
  readonly platform = 'hackerrank' as const;
  readonly displayName = 'HackerRank';
  readonly urlPatterns = [
    /hackerrank\.com\/challenges\//,
    /hackerrank\.com\/contests\//,
  ];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('.challenge-header .title, h1.ui-icon-label, h1');
      if (!title) return null;

      const statement = this.extractStatement();
      const examples = this.extractExamples();
      const constraints = this.extractConstraints();
      const difficulty = this.parseDifficulty(this.getText('.difficulty-badge, [class*="difficulty"]'));

      return this.createProblem({ title, statement, examples, constraints, difficulty });
    } catch {
      return null;
    }
  }

  private extractStatement(): string {
    const el = document.querySelector('.challenge-body-html, .problem-statement, [class*="challenge-text"]');
    return el ? this.cleanHtml(el) : '';
  }

  private extractExamples() {
    const statement = this.extractStatement();
    const examples = [];
    const inputMatch = statement.match(/Sample Input[\s\S]*?(?=Sample Output)/gi);
    const outputMatch = statement.match(/Sample Output[\s\S]*?(?=Explanation|$)/gi);

    if (inputMatch && outputMatch) {
      for (let i = 0; i < Math.min(inputMatch.length, outputMatch.length); i++) {
        examples.push({
          input: inputMatch[i].replace(/Sample Input\s*\d*\s*/i, '').trim(),
          output: outputMatch[i].replace(/Sample Output\s*\d*\s*/i, '').trim(),
        });
      }
    }
    return examples;
  }

  private extractConstraints(): string[] {
    const el = document.querySelector('.challenge-constraints, [class*="constraint"]');
    return el ? this.cleanHtml(el).split('\n').filter(Boolean) : [];
  }

  extractUserCode(): UserCode | null {
    try {
      const cm = document.querySelector('.CodeMirror');
      if (cm) {
        const instance = (cm as HTMLElement & { CodeMirror?: { getValue?: () => string } }).CodeMirror;
        const code = instance?.getValue?.() ?? '';
        if (code) {
          const lang = document.querySelector('.Select-value-label, [class*="language"] .Select-value')?.textContent?.trim() ?? 'python';
          return { code, language: this.parseLanguage(lang), lastModified: Date.now() };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('.result-state, [class*="submission-result"]');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: text.toLowerCase().includes('accepted') ? 'AC' : text.toLowerCase().includes('wrong') ? 'WA' : 'Unknown',
      runtime: document.querySelector('[class*="time"]')?.textContent?.trim(),
    };
  }
}
