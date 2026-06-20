import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class SPOJPlatform extends BasePlatform {
  readonly platform = 'spoj' as const;
  readonly displayName = 'SPOJ';
  readonly urlPatterns = [/spoj\.com\/problems\//];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('#problem-name, h2.title, .problem-title');
      if (!title) return null;

      const statementEl = document.querySelector('.problem-text, #problem-body');
      const statement = statementEl ? this.cleanHtml(statementEl) : '';

      const examples = this.extractExamples(statement);

      return this.createProblem({
        title,
        statement,
        examples,
        timeLimit: this.getText('.timelimit'),
        memoryLimit: this.getText('.memorylimit'),
      });
    } catch {
      return null;
    }
  }

  private extractExamples(statement: string) {
    const examples = [];
    const inputMatch = statement.match(/Example Input[\s\S]*?(?=Example Output)/i);
    const outputMatch = statement.match(/Example Output[\s\S]*?(?=$|\n\n)/i);
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[0].replace(/Example Input\s*/i, '').trim(),
        output: outputMatch[0].replace(/Example Output\s*/i, '').trim(),
      });
    }
    return examples;
  }

  extractUserCode(): UserCode | null {
    try {
      const textarea = document.querySelector('#file, textarea[name="file"]') as HTMLTextAreaElement;
      if (textarea?.value) {
        const langSelect = document.querySelector('select[name="lang"]') as HTMLSelectElement;
        const lang = langSelect?.options[langSelect.selectedIndex]?.text ?? 'python';
        return { code: textarea.value, language: this.parseLanguage(lang), lastModified: Date.now() };
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    return null;
  }
}
