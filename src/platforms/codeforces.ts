import type { Problem, UserCode, SubmissionResult, ProblemExample } from '@/types';
import { BasePlatform } from './base';

export class CodeforcesPlatform extends BasePlatform {
  readonly platform = 'codeforces' as const;
  readonly displayName = 'Codeforces';
  readonly urlPatterns = [
    /codeforces\.com\/problemset\/problem\//,
    /codeforces\.com\/contest\/.*\/problem\//,
    /codeforces\.com\/gym\/.*\/problem\//,
  ];

  extractProblem(): Problem | null {
    try {
      const titleEl = document.querySelector('.problem-statement .title');
      const title = titleEl?.textContent?.trim();
      if (!title) return null;

      const statementEl = document.querySelector('.problem-statement');
      if (!statementEl) return null;

      const statement = this.extractStatement(statementEl);
      const examples = this.extractExamples();
      const constraints = this.extractConstraints(statementEl);
      const tags = this.extractTags();

      return this.createProblem({
        title,
        statement,
        examples,
        constraints,
        tags,
        timeLimit: this.getText('.time-limit'),
        memoryLimit: this.getText('.memory-limit'),
      });
    } catch {
      return null;
    }
  }

  private extractStatement(el: Element): string {
    const clone = el.cloneNode(true) as Element;
    // Remove examples section
    clone.querySelector('.sample-tests')?.remove();
    clone.querySelector('.note')?.remove();
    return this.cleanHtml(clone);
  }

  private extractExamples(): ProblemExample[] {
    const inputs = document.querySelectorAll('.sample-test .input pre');
    const outputs = document.querySelectorAll('.sample-test .output pre');
    const examples: ProblemExample[] = [];

    inputs.forEach((inp, i) => {
      examples.push({
        input: inp.textContent?.trim() ?? '',
        output: outputs[i]?.textContent?.trim() ?? '',
      });
    });

    return examples;
  }

  private extractConstraints(el: Element): string[] {
    const limits = [
      el.querySelector('.time-limit')?.textContent?.trim(),
      el.querySelector('.memory-limit')?.textContent?.trim(),
    ].filter(Boolean) as string[];

    // Also look for constraint-like patterns in statement
    const text = el.textContent ?? '';
    const constraintMatches = text.match(/\d+\s*[≤<=]\s*\w+\s*[≤<=]\s*\d+/g) ?? [];

    return [...limits, ...constraintMatches.slice(0, 10)];
  }

  private extractTags(): string[] {
    const tagEls = document.querySelectorAll('.tag-box');
    return Array.from(tagEls)
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean);
  }

  extractUserCode(): UserCode | null {
    try {
      // Codeforces uses a textarea for code submission
      const textarea = document.querySelector('#sourceCodeTextarea, #editor textarea, .ace_text-input') as HTMLTextAreaElement;
      if (textarea?.value) {
        const langSelect = document.querySelector('#programTypeId') as HTMLSelectElement;
        const lang = langSelect?.options[langSelect.selectedIndex]?.text ?? 'python';
        return { code: textarea.value, language: this.parseLanguage(lang), lastModified: Date.now() };
      }

      // Try Ace editor
      const aceEl = document.querySelector('.ace_editor');
      if (aceEl) {
        const aceInstance = (aceEl as HTMLElement & { env?: { document?: { getValue?: () => string } } }).env?.document?.getValue?.();
        if (aceInstance) {
          const langSelect = document.querySelector('#programTypeId') as HTMLSelectElement;
          const lang = langSelect?.options[langSelect.selectedIndex]?.text ?? 'python';
          return { code: aceInstance, language: this.parseLanguage(lang), lastModified: Date.now() };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    try {
      const verdictEl = document.querySelector('.verdict-accepted, .verdict-rejected, [class*="verdict"]');
      if (!verdictEl) return null;

      const text = verdictEl.textContent?.trim() ?? '';
      return {
        status: this.parseVerdict(text),
        runtime: document.querySelector('.time-consumed-cell')?.textContent?.trim(),
        memory: document.querySelector('.memory-consumed-cell')?.textContent?.trim(),
      };
    } catch {
      return null;
    }
  }

  private parseVerdict(text: string): SubmissionResult['status'] {
    if (text.includes('Accepted')) return 'AC';
    if (text.includes('Wrong answer')) return 'WA';
    if (text.includes('Time limit')) return 'TLE';
    if (text.includes('Memory limit')) return 'MLE';
    if (text.includes('Runtime error')) return 'RE';
    if (text.includes('Compilation error')) return 'CE';
    return 'Unknown';
  }
}
