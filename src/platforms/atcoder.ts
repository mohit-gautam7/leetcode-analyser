import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class AtCoderPlatform extends BasePlatform {
  readonly platform = 'atcoder' as const;
  readonly displayName = 'AtCoder';
  readonly urlPatterns = [/atcoder\.jp\/contests\/.*\/tasks\//];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('#task-statement h2, .h2');
      if (!title) return null;

      const statementEl = document.querySelector('#task-statement');
      const statement = statementEl ? this.cleanHtml(statementEl) : '';

      const examples = this.extractExamples();
      const constraints = this.extractConstraints(statementEl);

      return this.createProblem({
        title,
        statement,
        examples,
        constraints,
        timeLimit: this.getText('.time-limit'),
        memoryLimit: this.getText('.memory-limit'),
      });
    } catch {
      return null;
    }
  }

  private extractExamples() {
    const examples = [];
    const inputs = document.querySelectorAll('[id^="pre-sample"] ~ pre:first-of-type, .sample-input pre');
    const outputs = document.querySelectorAll('.sample-output pre');

    for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
      examples.push({
        input: inputs[i].textContent?.trim() ?? '',
        output: outputs[i].textContent?.trim() ?? '',
      });
    }

    if (examples.length === 0) {
      const pres = document.querySelectorAll('#task-statement pre');
      for (let i = 0; i + 1 < pres.length; i += 2) {
        examples.push({
          input: pres[i].textContent?.trim() ?? '',
          output: pres[i + 1].textContent?.trim() ?? '',
        });
      }
    }

    return examples;
  }

  private extractConstraints(el: Element | null): string[] {
    if (!el) return [];
    const constraintEl = el.querySelector('.constraints, [id*="constraints"]');
    if (constraintEl) return this.cleanHtml(constraintEl).split('\n').filter(Boolean);
    return [];
  }

  extractUserCode(): UserCode | null {
    try {
      const textarea = document.querySelector('#sourceCode, textarea[name="sourceCode"]') as HTMLTextAreaElement;
      if (textarea?.value) {
        const langSelect = document.querySelector('select[name="language_id"], #select-lang') as HTMLSelectElement;
        const lang = langSelect?.options[langSelect.selectedIndex]?.text ?? 'python';
        return { code: textarea.value, language: this.parseLanguage(lang), lastModified: Date.now() };
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('.submission-verdict, [class*="verdict"]');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: text.includes('AC') ? 'AC' : text.includes('WA') ? 'WA' : text.includes('TLE') ? 'TLE' : 'Unknown',
      runtime: document.querySelector('.time')?.textContent?.trim(),
      memory: document.querySelector('.memory')?.textContent?.trim(),
    };
  }
}
