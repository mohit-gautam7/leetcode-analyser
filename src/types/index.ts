export type Platform =
  | 'leetcode'
  | 'gfg'
  | 'codeforces'
  | 'codechef'
  | 'atcoder'
  | 'hackerrank'
  | 'codingninjas'
  | 'interviewbit'
  | 'cses'
  | 'spoj'
  | 'generic';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Unknown';

export type SubmissionStatus =
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'MLE'
  | 'RE'
  | 'CE'
  | 'Pending'
  | 'Unknown';

export type AIMode =
  | 'analysis'
  | 'help'
  | 'solution'
  | 'optimization'
  | 'debug'
  | 'dryrun'
  | 'editorial'
  | 'interview'
  | 'contest'
  | 'settings';

export type AIProvider = 'nvidia' | 'openrouter';

export type NvidiaModel =
  | 'meta/llama-3.3-70b-instruct'
  | 'meta/llama-4-maverick-17b-128e-instruct'
  | 'nvidia/nemotron-3-ultra-550b-a55b'
  | 'nvidia/nemotron-3-super-120b-a12b';

// Verified against OpenRouter's live model catalog (2026-06-17) — all confirmed to exist.
export type OpenRouterModel =
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-opus-4'
  | 'anthropic/claude-3.5-haiku'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'openai/o4-mini'
  | 'google/gemini-3.5-flash'
  | 'google/gemini-3.1-pro-preview'
  | 'deepseek/deepseek-r1'
  | 'deepseek/deepseek-v3.2'
  | 'meta-llama/llama-3.3-70b-instruct:free'
  | 'meta-llama/llama-3.3-70b-instruct'
  | 'mistralai/mistral-large-2512'
  | 'qwen/qwen3-235b-a22b'
  | 'nvidia/nemotron-3-ultra-550b-a55b:free'
  | 'nvidia/nemotron-3-super-120b-a12b:free'
  | 'qwen/qwen3-coder:free'
  | 'deepseek/deepseek-r1:free'
  | 'deepseek/deepseek-v3:free'
  | 'google/gemini-2.0-flash-exp:free';

export type AIModel = NvidiaModel | OpenRouterModel;

export type AlgorithmType =
  | 'DFS'
  | 'BFS'
  | 'DP'
  | 'Greedy'
  | 'Trie'
  | 'Heap'
  | 'Segment Tree'
  | 'Fenwick Tree'
  | 'Union Find'
  | 'Backtracking'
  | 'Binary Search'
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Graph'
  | 'Sorting'
  | 'Math'
  | 'String'
  | 'Hashing';

export type SolutionLanguage =
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'rust'
  | 'c';

export type DebugType = 'TLE' | 'WA' | 'RE' | 'MLE' | 'CE';

export type InterviewStyle = 'google' | 'meta' | 'amazon' | 'microsoft' | 'apple';

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  statement: string;
  constraints: string[];
  examples: ProblemExample[];
  tags: string[];
  difficulty: Difficulty;
  platform: Platform;
  url: string;
  editorialAvailable?: boolean;
  timeLimit?: string;
  memoryLimit?: string;
  inputFormat?: string;
  outputFormat?: string;
  companies?: string[];
}

export interface UserCode {
  code: string;
  language: SolutionLanguage;
  lastModified: number;
}

export interface SubmissionResult {
  status: SubmissionStatus;
  runtime?: string;
  memory?: string;
  passedTests?: number;
  totalTests?: number;
  errorMessage?: string;
  submittedAt?: number;
}

export interface ComplexityInfo {
  time: string;
  space: string;
  explanation?: string;
}

export interface AnalysisResult {
  approach: string;
  currentComplexity: ComplexityInfo;
  requiredComplexity: ComplexityInfo;
  codeQuality: number;
  readability: number;
  efficiency: number;
  suggestions: string[];
  algorithms: AlgorithmType[];
  canOptimize: boolean;
  optimizationSummary?: string;
}

export interface HintResult {
  hints: string[];
  keyObservation: string;
  dataStructure?: string;
  algorithm?: string;
  revealed: number;
}

export interface SolutionResult {
  intuition: string;
  approach: string;
  proof?: string;
  dryRun?: string;
  complexity: ComplexityInfo;
  code: Record<SolutionLanguage, string>;
  optimalCode?: string;
}

export interface OptimizationResult {
  currentCode: string;
  optimizedCode: string;
  language: SolutionLanguage;
  beforeComplexity: ComplexityInfo;
  afterComplexity: ComplexityInfo;
  changes: OptimizationChange[];
  explanation: string;
}

export interface OptimizationChange {
  line?: number;
  description: string;
  impact: 'time' | 'space' | 'both' | 'readability';
}

export interface DebugResult {
  type: DebugType;
  causes: string[];
  failingTestCase?: string;
  suspiciousLines: number[];
  explanation: string;
  fix?: string;
}

export interface DryRunStep {
  step: number;
  description: string;
  variables: Record<string, string | number | boolean | null>;
  callStack?: string[];
  highlight?: string;
}

export interface DryRunResult {
  steps: DryRunStep[];
  dpTable?: string[][];
  recursionTree?: string;
  finalAnswer?: string;
}

export interface EditorialResult {
  observation: string;
  insight: string;
  proof: string;
  approach: string;
  complexity: ComplexityInfo;
  code: string;
  language: SolutionLanguage;
  followUp?: string[];
}

export interface InterviewQuestion {
  question: string;
  type: 'followup' | 'tradeoff' | 'alternative' | 'edge-case' | 'complexity';
  hint?: string;
}

export interface InterviewResult {
  style: InterviewStyle;
  feedback?: string;
  questions: InterviewQuestion[];
  score?: number;
  improvements?: string[];
}

export interface SimilarProblem {
  title: string;
  platform: string;
  url?: string;
  difficulty: Difficulty;
  reason?: string;
}

export interface SimilarProblemsResult {
  easy: SimilarProblem[];
  medium: SimilarProblem[];
  hard: SimilarProblem[];
}

export interface LearningTopic {
  name: string;
  score: number;
  problems: number;
  lastPracticed?: number;
}

export interface LearningProgress {
  topics: LearningTopic[];
  totalProblems: number;
  streak: number;
  nextRecommended: SimilarProblem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  problemId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  aiProvider: AIProvider;
  apiKey: string;
  openRouterApiKey: string;
  model: NvidiaModel | 'auto';
  openRouterModel: OpenRouterModel | 'auto';
  contestMode: boolean;
  theme: 'dark' | 'light' | 'system';
  fontSize: 12 | 13 | 14 | 15 | 16;
  defaultLanguage: SolutionLanguage;
  showComplexityBadge: boolean;
  autoAnalyze: boolean;
  streamingEnabled: boolean;
  offlineCacheEnabled: boolean;
}

export interface ModelInfo {
  id: NvidiaModel;
  name: string;
  description: string;
  contextLength: number;
  strengths: string[];
  bestFor: string[];
  speed: 'fast' | 'medium' | 'slow';
}

export interface ExtensionState {
  problem: Problem | null;
  userCode: UserCode | null;
  submissionResult: SubmissionResult | null;
  activeMode: AIMode;
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  platform: Platform;
  chatSession: ChatSession | null;
  contestModeActive: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface StorageData {
  settings: Settings;
  chatSessions: Record<string, ChatSession>;
  learningProgress: LearningProgress;
  problemCache: Record<string, CacheEntry<Problem>>;
  analysisCache: Record<string, CacheEntry<AnalysisResult>>;
}

export type MessageType =
  | 'PROBLEM_DETECTED'
  | 'CODE_CHANGED'
  | 'SUBMISSION_DETECTED'
  | 'OPEN_SIDEBAR'
  | 'GET_PROBLEM'
  | 'GET_CODE'
  | 'SETTINGS_UPDATED'
  | 'ANALYZE_REQUEST'
  | 'ANALYZE_RESPONSE'
  | 'PING'
  | 'PONG';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  tabId?: number;
  error?: string;
}
