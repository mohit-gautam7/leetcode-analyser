import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class CodeChefPlatform extends BasePlatform {
  readonly platform = 'codechef' as const;
  readonly displayName = 'CodeChef';
  readonly urlPatterns = [
    /codechef\.com\/problems\//,
    /codechef\.com\/.*\/problems\//,
  ];

  extractProblem(): Problem | null {
    try {
      const title = this.getText('h1.problem-title, ._title__section h1, [class*="problem-title"]');
      if (!title) return null;

      const statement = this.extractStatement();
      const examples = this.extractExamples();
      const constraints = this.extractConstraints();

      return this.createProblem({ title, statement, examples, constraints });
    } catch {
      return null;
    }
  }

  private extractStatement(): string {
    const el = document.querySelector('._problem-statement, .problem-statement, [class*="problemStatement"]');
    return el ? this.cleanHtml(el) : '';
  }

  private extractExamples() {
    const examples = [];
    const sampleTests = document.querySelectorAll('.sample, [class*="sample"]');
    sampleTests.forEach((el) => {
      const input = el.querySelector('[class*="input"] pre, .input pre')?.textContent?.trim() ?? '';
      const output = el.querySelector('[class*="output"] pre, .output pre')?.textContent?.trim() ?? '';
      if (input || output) examples.push({ input, output });
    });
    return examples;
  }

  private extractConstraints(): string[] {
    const content = this.extractStatement();
    const match = content.match(/Constraints?:([\s\S]*?)(?=\n\n|$)/i);
    if (match) return match[1].split('\n').map((l) => l.trim()).filter(Boolean);
    return [];
  }

  extractUserCode(): UserCode | null {
    try {
      const aceEl = document.querySelector('.ace_editor');
      if (aceEl) {
        const ace = (window as unknown as Record<string, unknown>)['ace'];
        if (ace) {
          const editor = (ace as { edit?: (el: Element) => { getValue?: () => string } }).edit?.(aceEl);
          const code = editor?.getValue?.() ?? '';
          if (code) {
            const lang = this.getAttr('[name="language"]', 'value') ??
              document.querySelector('.language-selector')?.textContent?.trim() ?? 'python';
            return { code, language: this.parseLanguage(lang), lastModified: Date.now() };
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  extractSubmissionResult(): SubmissionResult | null {
    const el = document.querySelector('[class*="verdict"], .verdict-cell');
    if (!el) return null;
    const text = el.textContent?.trim() ?? '';
    return {
      status: this.parseVerdict(text),
      runtime: document.querySelector('.time-cell')?.textContent?.trim(),
      memory: document.querySelector('.memory-cell')?.textContent?.trim(),
    };
  }

  private parseVerdict(text: string): SubmissionResult['status'] {
    if (text.includes('AC') || text.includes('Accepted')) return 'AC';
    if (text.includes('WA') || text.includes('Wrong')) return 'WA';
    if (text.includes('TLE') || text.includes('Time')) return 'TLE';
    if (text.includes('MLE') || text.includes('Memory')) return 'MLE';
    if (text.includes('RE') || text.includes('Runtime')) return 'RE';
    return 'Unknown';
  }
}
