import type { Platform, Problem, UserCode, SubmissionResult, Difficulty, SolutionLanguage } from '@/types';
import { generateId } from '@/utils/helpers';

export abstract class BasePlatform {
  abstract readonly platform: Platform;
  abstract readonly displayName: string;
  abstract readonly urlPatterns: RegExp[];

  matches(url: string): boolean {
    return this.urlPatterns.some((p) => p.test(url));
  }

  abstract extractProblem(): Problem | null;
  abstract extractUserCode(): UserCode | null;
  abstract extractSubmissionResult(): SubmissionResult | null;

  protected createProblem(data: Partial<Problem> & Pick<Problem, 'title' | 'statement'>): Problem {
    return {
      id: generateId(),
      title: data.title,
      statement: data.statement,
      constraints: data.constraints ?? [],
      examples: data.examples ?? [],
      tags: data.tags ?? [],
      difficulty: data.difficulty ?? 'Unknown',
      platform: this.platform,
      url: window.location.href,
      editorialAvailable: data.editorialAvailable ?? false,
      timeLimit: data.timeLimit,
      memoryLimit: data.memoryLimit,
    };
  }

  protected getText(selector: string, fallback = ''): string {
    return document.querySelector(selector)?.textContent?.trim() ?? fallback;
  }

  protected getTexts(selector: string): string[] {
    return Array.from(document.querySelectorAll(selector)).map((el) => el.textContent?.trim() ?? '');
  }

  protected getAttr(selector: string, attr: string, fallback = ''): string {
    return document.querySelector(selector)?.getAttribute(attr)?.trim() ?? fallback;
  }

  protected parseDifficulty(text: string): Difficulty {
    const lower = text.toLowerCase();
    if (lower.includes('easy') || lower.includes('1') || lower.includes('beginner')) return 'Easy';
    if (lower.includes('medium') || lower.includes('2') || lower.includes('moderate')) return 'Medium';
    if (lower.includes('hard') || lower.includes('3') || lower.includes('difficult') || lower.includes('expert')) return 'Hard';
    return 'Unknown';
  }

  protected parseLanguage(lang: string): SolutionLanguage {
    const lower = lang.toLowerCase().replace(/\s+/g, '');
    if (lower.includes('cpp') || lower.includes('c++') || lower === 'c++17' || lower === 'c++14') return 'cpp';
    if (lower.includes('java') && !lower.includes('script')) return 'java';
    if (lower.includes('python') || lower === 'py3' || lower === 'py') return 'python';
    if (lower.includes('javascript') || lower === 'js') return 'javascript';
    if (lower.includes('typescript') || lower === 'ts') return 'typescript';
    if (lower === 'go' || lower === 'golang') return 'go';
    if (lower === 'rust') return 'rust';
    if (lower === 'c' || lower === 'c99' || lower === 'clang') return 'c';
    return 'python';
  }

  protected cleanHtml(element: Element): string {
    const clone = element.cloneNode(true) as Element;
    clone.querySelectorAll('script, style, .ads, .advertisement').forEach((el) => el.remove());
    return clone.textContent?.trim().replace(/\n{3,}/g, '\n\n') ?? '';
  }
}
