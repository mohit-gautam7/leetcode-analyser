import type { Problem, UserCode, SubmissionResult } from '@/types';
import { BasePlatform } from './base';

export class GenericPlatform extends BasePlatform {
  readonly platform = 'generic' as const;
  readonly displayName = 'Unknown Platform';
  readonly urlPatterns = [/.*/];

  extractProblem(): Problem | null {
    try {
      const title =
        document.querySelector('h1')?.textContent?.trim() ??
        document.title.replace(' - ', ' | ').split(' | ')[0] ??
        'Unknown Problem';

      const mainContent =
        document.querySelector('main, article, .content, .problem') ??
        document.body;

      const statement = this.cleanHtml(mainContent);
      if (!statement || statement.length < 50) return null;

      return this.createProblem({ title, statement });
    } catch {
      return null;
    }
  }

  extractUserCode(): UserCode | null {
    // Try common editor patterns
    const editors = [
      document.querySelector('.CodeMirror'),
      document.querySelector('.monaco-editor'),
      document.querySelector('.ace_editor'),
    ];

    for (const editor of editors) {
      if (!editor) continue;
      const cm = (editor as HTMLElement & { CodeMirror?: { getValue?: () => string } }).CodeMirror;
      if (cm?.getValue) {
        const code = cm.getValue();
        if (code) return { code, language: 'python', lastModified: Date.now() };
      }
    }

    const textarea = document.querySelector('textarea[name*="code"], textarea[id*="code"]') as HTMLTextAreaElement;
    if (textarea?.value) {
      return { code: textarea.value, language: 'python', lastModified: Date.now() };
    }

    return null;
  }

  extractSubmissionResult(): SubmissionResult | null {
    return null;
  }
}
