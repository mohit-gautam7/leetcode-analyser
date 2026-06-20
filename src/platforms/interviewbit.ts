import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class InterviewBitPlatform extends BasePlatform {
  readonly platform = 'interviewbit' as const;
  readonly displayName = 'InterviewBit';
  readonly urlPatterns = [/interviewbit\.com\/problems\//];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('.problem-title, h1.problem-name, .coding_statement_header h1');
      if (!title) return null;

      const statementEl = document.querySelector('.coding_statement, .problem-statement');
      const statement = statementEl ? this.cleanHtml(statementEl) : '';
      const tags = this.getTexts('.tag, .topic-tag').filter(Boolean);

      return this.createProblem({ title, statement, tags });
    } catch {
      return null;
    }
  }

  extractUserCode(): UserCode | null {
    try {
      const cm = document.querySelector('.CodeMirror');
      if (cm) {
        const instance = (cm as HTMLElement & { CodeMirror?: { getValue?: () => string } }).CodeMirror;
        const code = instance?.getValue?.() ?? '';
        const lang = document.querySelector('.language-selector')?.textContent?.trim() ?? 'python';
        return code ? { code, language: this.parseLanguage(lang), lastModified: Date.now() } : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('[class*="submission-status"], .submit-result');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: text.toLowerCase().includes('correct') ? 'AC' : 'WA',
    };
  }
}
