import type {
  Problem,
  UserCode,
  SubmissionResult,
  AnalysisResult,
  HintResult,
  SolutionResult,
  OptimizationResult,
  DebugResult,
  DryRunResult,
  EditorialResult,
  InterviewResult,
  SimilarProblemsResult,
  SimilarProblem,
  NvidiaModel,
  OpenRouterModel,
  AIMode,
  DebugType,
  InterviewStyle,
  SolutionLanguage,
} from '@/types';
import { nimRequest, nimStream, selectAutoModel } from './nvidia-nim';
import { openRouterComplete, openRouterStream, selectAutoOpenRouterModel } from './openrouter';
import { prompts } from './prompt-engine';
import { storage } from '@/storage';
import { memoryCache, getCacheKey } from '@/utils/cache';

type ProblemEntry = { title: string; difficulty: string; companies: string[] };
let _problemsData: Record<string, ProblemEntry> | null = null;
let _loadPromise: Promise<Record<string, ProblemEntry>> | null = null;

function loadProblemsData(): Promise<Record<string, ProblemEntry>> {
  if (_problemsData) return Promise.resolve(_problemsData);
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const url = typeof chrome !== 'undefined' && chrome.runtime
        ? chrome.runtime.getURL('data/problems-data.json')
        : '/data/problems-data.json';
      const res = await fetch(url);
      _problemsData = await res.json() as Record<string, ProblemEntry>;
    } catch {
      _problemsData = {};
    }
    return _problemsData!;
  })();
  return _loadPromise;
}

// Kick off the data fetch immediately so it's ready before the first problem is detected
loadProblemsData();

type MessageList = Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

function parseJSON<T>(text: string, fallback: T): T {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Direct parse
  try { return JSON.parse(cleaned) as T; } catch { /**/ }

  // Walk brace-depth to find the outermost complete JSON object
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch { break; }
        }
      }
    }
    // Last resort: greedy regex
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]) as T; } catch { /**/ } }
  }

  return fallback;
}

async function getCredentials(mode: AIMode): Promise<
  | { provider: 'nvidia'; apiKey: string; model: NvidiaModel }
  | { provider: 'openrouter'; apiKey: string; model: OpenRouterModel }
> {
  const settings = await storage.getSettings();

  if (settings.aiProvider === 'openrouter') {
    if (!settings.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured. Please add it in Settings.');
    }
    const model: OpenRouterModel = settings.openRouterModel === 'auto'
      ? selectAutoOpenRouterModel(mode)
      : settings.openRouterModel;
    return { provider: 'openrouter', apiKey: settings.openRouterApiKey, model };
  }

  if (!settings.apiKey) {
    throw new Error('NVIDIA NIM API key not configured. Please add it in Settings.');
  }
  const model: NvidiaModel = settings.model === 'auto' ? selectAutoModel(mode) : settings.model;
  return { provider: 'nvidia', apiKey: settings.apiKey, model };
}

async function callAI(messages: MessageList, mode: AIMode, opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
  const creds = await getCredentials(mode);
  if (creds.provider === 'openrouter') {
    return openRouterComplete({
      apiKey: creds.apiKey,
      model: creds.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      maxTokens: opts?.maxTokens ?? 2048,
    });
  }
  return nimRequest({
    model: creds.model,
    messages,
    apiKey: creds.apiKey,
    temperature: opts?.temperature ?? 0.3,
    maxTokens: opts?.maxTokens,
  });
}

async function* streamAI(messages: MessageList, mode: AIMode, opts?: { maxTokens?: number; temperature?: number }): AsyncGenerator<string> {
  const creds = await getCredentials(mode);
  if (creds.provider === 'openrouter') {
    yield* openRouterStream({
      apiKey: creds.apiKey,
      model: creds.model,
      messages,
      temperature: opts?.temperature ?? 0.7,
      maxTokens: opts?.maxTokens ?? 2048,
      stream: true,
    });
  } else {
    yield* nimStream({
      model: creds.model,
      messages,
      apiKey: creds.apiKey,
      stream: true,
      temperature: opts?.temperature ?? 0.7,
      maxTokens: opts?.maxTokens ?? 2048,
    });
  }
}

export const aiService = {
  async analyze(problem: Problem, code?: UserCode): Promise<AnalysisResult> {
    const cacheKey = getCacheKey('analysis', problem.url, code?.code?.substring(0, 200) ?? '');
    const cached = memoryCache.get<AnalysisResult>(cacheKey);
    if (cached) return cached;

    const messages = prompts.analysis(problem, code);
    const raw = await callAI(messages, 'analysis', { temperature: 0.2, maxTokens: 3072 });

    const result = parseJSON<AnalysisResult>(raw, {
      approach: 'Unable to analyze',
      currentComplexity: { time: 'Unknown', space: 'Unknown' },
      requiredComplexity: { time: 'Unknown', space: 'Unknown' },
      codeQuality: 0,
      readability: 0,
      efficiency: 0,
      suggestions: [],
      algorithms: [],
      canOptimize: false,
    });

    memoryCache.set(cacheKey, result);
    return result;
  },

  async getHints(problem: Problem, revealCount = 0): Promise<HintResult> {
    const messages = prompts.help(problem, revealCount);
    const raw = await callAI(messages, 'help', { temperature: 0.4, maxTokens: 3072 });

    return parseJSON<HintResult>(raw, {
      hints: ['Unable to generate hints'],
      keyObservation: '',
      revealed: 0,
    });
  },

  async getSolution(problem: Problem, language: SolutionLanguage = 'python'): Promise<SolutionResult> {
    const messages = prompts.solution(problem, language);
    const raw = await callAI(messages, 'solution', { maxTokens: 6144, temperature: 0.2 });

    return parseJSON<SolutionResult>(raw, {
      intuition: '',
      approach: '',
      complexity: { time: 'Unknown', space: 'Unknown' },
      code: { python: '', cpp: '', java: '', javascript: '', typescript: '', go: '', rust: '', c: '' },
    });
  },

  async optimize(problem: Problem, code: UserCode): Promise<OptimizationResult> {
    const messages = prompts.optimization(problem, code);
    const raw = await callAI(messages, 'optimization', { maxTokens: 6144, temperature: 0.2 });

    return parseJSON<OptimizationResult>(raw, {
      currentCode: code.code,
      optimizedCode: code.code,
      language: code.language,
      beforeComplexity: { time: 'Unknown', space: 'Unknown' },
      afterComplexity: { time: 'Unknown', space: 'Unknown' },
      changes: [],
      explanation: '',
    });
  },

  async debug(problem: Problem, code: UserCode, type: DebugType, submission?: SubmissionResult): Promise<DebugResult> {
    const messages = prompts.debug(problem, code, type, submission);
    const raw = await callAI(messages, 'debug', { temperature: 0.3, maxTokens: 4096 });

    return parseJSON<DebugResult>(raw, {
      type,
      causes: [],
      suspiciousLines: [],
      explanation: '',
    });
  },

  async dryRun(problem: Problem, code: UserCode): Promise<DryRunResult> {
    const messages = prompts.dryRun(problem, code);
    const raw = await callAI(messages, 'dryrun', { maxTokens: 6144, temperature: 0.1 });

    return parseJSON<DryRunResult>(raw, {
      steps: [],
      finalAnswer: 'Unknown',
    });
  },

  async editorial(problem: Problem): Promise<EditorialResult> {
    const messages = prompts.editorial(problem);
    const raw = await callAI(messages, 'editorial', { maxTokens: 8192, temperature: 0.3 });

    return parseJSON<EditorialResult>(raw, {
      observation: '',
      insight: '',
      proof: '',
      approach: '',
      complexity: { time: 'Unknown', space: 'Unknown' },
      code: '',
      language: 'python',
    });
  },

  async interview(problem: Problem, style: InterviewStyle, code?: UserCode): Promise<InterviewResult> {
    const messages = prompts.interview(problem, style, code);
    const raw = await callAI(messages, 'interview', { temperature: 0.6, maxTokens: 3072 });

    return parseJSON<InterviewResult>(raw, {
      style,
      questions: [],
    });
  },

  async similarProblems(problem: Problem): Promise<SimilarProblemsResult> {
    const cacheKey = getCacheKey('similar', problem.url);
    const cached = memoryCache.get<SimilarProblemsResult>(cacheKey);
    if (cached) return cached;

    const messages = prompts.similarProblems(problem);
    const raw = await callAI(messages, 'analysis', { temperature: 0.5, maxTokens: 3072 });

    const result = parseJSON<SimilarProblemsResult>(raw, { easy: [], medium: [], hard: [] });
    memoryCache.set(cacheKey, result);
    return result;
  },

  async *chatStream(
    problem: Problem,
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    code?: UserCode
  ): AsyncGenerator<string> {
    const messages = prompts.chat(problem, question, history, code);
    yield* streamAI(messages, 'help', { temperature: 0.7, maxTokens: 3072 });
  },

  async chat(
    problem: Problem,
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    code?: UserCode
  ): Promise<string> {
    const messages = prompts.chat(problem, question, history, code);
    return callAI(messages, 'help', { temperature: 0.7, maxTokens: 3072 });
  },

  async analyzeSubmission(problem: Problem, code: UserCode, result: SubmissionResult): Promise<string> {
    const messages = prompts.submissionAnalysis(problem, code, result);
    return callAI(messages, 'analysis', { temperature: 0.3 });
  },

  async detectAlgorithms(problem: Problem, code: UserCode): Promise<string[]> {
    const analysis = await this.analyze(problem, code);
    return analysis.algorithms.map((a) => String(a));
  },

  async applySuggestion(problem: Problem, code: UserCode, suggestion: string): Promise<string> {
    const lines = code.code.split('\n');
    const messages: MessageList = [
      {
        role: 'user',
        content: `You are a surgical code editor. Apply ONE specific suggestion to the code below.

SUGGESTION: "${suggestion}"

ABSOLUTE RULES — violating any of these makes the output wrong:
1. NEVER change class names, method names, or function signatures. Online judges require exact names.
2. NEVER rewrite the algorithm or change control flow.
3. NEVER add new functions, classes, or restructure the file.
4. ONLY touch the lines that directly implement this suggestion:
   - Rename a variable → change only that identifier on every line it appears
   - Add a comment → insert only that comment line
   - Use a constant → replace only the magic number with the named constant
5. Every line NOT touched by the suggestion must be byte-for-byte identical to the original.
6. The output must have the same number of lines ± the added/removed lines for the suggestion only.

Problem: ${problem.title}
Language: ${code.language}
Total lines: ${lines.length}

Current code (${lines.length} lines):
\`\`\`${code.language}
${code.code}
\`\`\`

Output: the same code with only the minimal change for the suggestion. No markdown fences, no explanation.`,
      },
    ];
    const result = await callAI(messages, 'analysis', { temperature: 0.05, maxTokens: 3072 });
    return result.replace(/^```[\w]*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  },

  async getCompanyTags(problem: Problem): Promise<string[]> {
    const cacheKey = getCacheKey('companies', problem.url);
    const cached = memoryCache.get<string[]>(cacheKey);
    if (cached) return cached;

    const slugMatch = problem.url?.match(/\/problems\/([^\/\s?#]+)/);
    const slug = slugMatch ? slugMatch[1].toLowerCase() : null;

    const data = await loadProblemsData();
    const staticCompanies: string[] = slug ? (data[slug]?.companies ?? []).slice(0, 10) : [];

    // Merge any DOM-extracted companies (LeetCode Premium users)
    const domCompanies = problem.companies ?? [];
    const seen = new Set(staticCompanies.map(c => c.toLowerCase()));
    const merged = [...staticCompanies];
    for (const c of domCompanies) {
      if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); merged.push(c); }
    }

    const result = merged.slice(0, 10);
    if (result.length > 0) memoryCache.set(cacheKey, result);
    return result;
  },

  async getCompanyProblems(company: string, problem: Problem, page = 0, pageSize = 8): Promise<{ problems: SimilarProblem[]; hasMore: boolean }> {
    const data = await loadProblemsData();
    const companyLower = company.toLowerCase();

    // Collect all problems that include this company, preserving frequency order
    const matches: Array<{ slug: string; title: string; difficulty: string; rank: number }> = [];
    for (const [slug, entry] of Object.entries(data)) {
      const idx = entry.companies.findIndex(c => c.toLowerCase() === companyLower);
      if (idx !== -1 && entry.title !== problem.title) {
        matches.push({ slug, title: entry.title, difficulty: entry.difficulty, rank: idx });
      }
    }
    // Sort by rank (lower = higher frequency for this company)
    matches.sort((a, b) => a.rank - b.rank);

    const start = page * pageSize;
    const slice = matches.slice(start, start + pageSize);
    const hasMore = start + pageSize < matches.length;

    const problems: SimilarProblem[] = slice.map(m => ({
      title: m.title,
      platform: 'leetcode' as const,
      difficulty: m.difficulty as SimilarProblem['difficulty'],
      url: `https://leetcode.com/problems/${m.slug}/`,
      reason: undefined,
    }));

    return { problems, hasMore };
  },
};
