import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class CSESPlatform extends BasePlatform {
  readonly platform = 'cses' as const;
  readonly displayName = 'CSES';
  readonly urlPatterns = [/cses\.fi\/problemset\/task\//];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('h1');
      if (!title) return null;

      const statementEl = document.querySelector('.task-body, .content');
      const statement = statementEl ? this.cleanHtml(statementEl) : '';

      const examples = this.extractExamples();
      const constraints = this.extractConstraints();

      return this.createProblem({ title, statement, examples, constraints });
    } catch {
      return null;
    }
  }

  private extractExamples() {
    const examples = [];
    const tables = document.querySelectorAll('table.io-table');
    tables.forEach((table) => {
      const cells = table.querySelectorAll('td pre');
      if (cells.length >= 2) {
        examples.push({
          input: cells[0].textContent?.trim() ?? '',
          output: cells[1].textContent?.trim() ?? '',
        });
      }
    });
    return examples;
  }

  private extractConstraints(): string[] {
    const text = this.getText('.task-body');
    const match = text.match(/(\d+\s*[≤<]\s*[\w\s,]+\s*[≤<]\s*\d+)/g);
    return match ?? [];
  }

  extractUserCode(): UserCode | null {
    try {
      const codeEl = document.querySelector('textarea[name="code"]') as HTMLTextAreaElement;
      if (codeEl?.value) {
        const lang = (document.querySelector('select[name="lang"]') as HTMLSelectElement)?.value ?? 'CPP17';
        return { code: codeEl.value, language: this.parseLanguage(lang), lastModified: Date.now() };
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('.verdict');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: text.includes('ACCEPTED') ? 'AC' : text.includes('WRONG') ? 'WA' : text.includes('TIME') ? 'TLE' : 'Unknown',
    };
  }
}
