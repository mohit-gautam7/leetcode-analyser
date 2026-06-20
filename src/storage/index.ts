import type { Settings, ChatSession, LearningProgress, Problem, AnalysisResult, StorageData, CacheEntry } from '@/types';
import { encryptApiKey, decryptApiKey } from '@/utils/crypto';
import { createCacheEntry, isCacheValid } from '@/utils/cache';

const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'nvidia',
  apiKey: '',
  openRouterApiKey: '',
  model: 'auto',
  openRouterModel: 'auto',
  contestMode: false,
  theme: 'dark',
  fontSize: 14,
  defaultLanguage: 'cpp',
  showComplexityBadge: true,
  autoAnalyze: false,
  streamingEnabled: true,
  offlineCacheEnabled: true,
};

function chromeGet<T>(keys: string[]): Promise<Record<string, T>> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result: Record<string, T> = {};
      for (const key of keys) {
        const val = localStorage.getItem(key);
        if (val) {
          try { result[key] = JSON.parse(val); } catch { result[key] = val as unknown as T; }
        }
      }
      resolve(result);
    }
  });
}

function chromeSet(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(data, resolve);
    } else {
      for (const [key, val] of Object.entries(data)) {
        localStorage.setItem(key, JSON.stringify(val));
      }
      resolve();
    }
  });
}

export const storage = {
  async getSettings(): Promise<Settings> {
    const data = await chromeGet<Settings>(['settings']);
    const saved = data['settings'] as Partial<Settings> | undefined;
    const settings = { ...DEFAULT_SETTINGS, ...saved };
    // Migrate removed model IDs to 'auto'
    const VALID_NVIDIA = [
      'auto', 'meta/llama-3.3-70b-instruct', 'meta/llama-4-maverick-17b-128e-instruct',
      'nvidia/nemotron-3-ultra-550b-a55b', 'nvidia/nemotron-3-super-120b-a12b',
    ];
    if (!VALID_NVIDIA.includes(settings.model as string)) settings.model = 'auto';

    const VALID_OPENROUTER = [
      'auto', 'anthropic/claude-sonnet-4.6', 'anthropic/claude-opus-4', 'anthropic/claude-3.5-haiku',
      'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/o4-mini',
      'google/gemini-3.5-flash', 'google/gemini-3.1-pro-preview',
      'deepseek/deepseek-r1', 'deepseek/deepseek-v3.2',
      'meta-llama/llama-3.3-70b-instruct:free', 'meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-large-2512', 'qwen/qwen3-235b-a22b',
      'nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'qwen/qwen3-coder:free',
    ];
    if (!VALID_OPENROUTER.includes(settings.openRouterModel as string)) settings.openRouterModel = 'auto';
    if (settings.apiKey) {
      settings.apiKey = decryptApiKey(settings.apiKey);
    }
    if (settings.openRouterApiKey) {
      settings.openRouterApiKey = decryptApiKey(settings.openRouterApiKey);
    }
    return settings;
  },

  async saveSettings(settings: Settings): Promise<void> {
    const toSave = { ...settings };
    if (toSave.apiKey) {
      toSave.apiKey = encryptApiKey(toSave.apiKey);
    }
    if (toSave.openRouterApiKey) {
      toSave.openRouterApiKey = encryptApiKey(toSave.openRouterApiKey);
    }
    await chromeSet({ settings: toSave });
  },

  async getChatSession(problemId: string): Promise<ChatSession | null> {
    const data = await chromeGet<Record<string, ChatSession>>(['chatSessions']);
    const sessions = data['chatSessions'] ?? {};
    return sessions[problemId] ?? null;
  },

  async saveChatSession(session: ChatSession): Promise<void> {
    const data = await chromeGet<Record<string, ChatSession>>(['chatSessions']);
    const sessions = (data['chatSessions'] ?? {}) as Record<string, ChatSession>;
    sessions[session.problemId] = session;
    await chromeSet({ chatSessions: sessions });
  },

  async getLearningProgress(): Promise<LearningProgress> {
    const data = await chromeGet<LearningProgress>(['learningProgress']);
    return data['learningProgress'] ?? {
      topics: [],
      totalProblems: 0,
      streak: 0,
      nextRecommended: [],
    };
  },

  async saveLearningProgress(progress: LearningProgress): Promise<void> {
    await chromeSet({ learningProgress: progress });
  },

  async getCachedProblem(url: string): Promise<Problem | null> {
    const data = await chromeGet<Record<string, CacheEntry<Problem>>>(['problemCache']);
    const cache = data['problemCache'] ?? {};
    const entry = cache[url];
    if (!entry || !isCacheValid(entry)) return null;
    return entry.data;
  },

  async cacheProblem(url: string, problem: Problem): Promise<void> {
    const data = await chromeGet<Record<string, CacheEntry<Problem>>>(['problemCache']);
    const cache = (data['problemCache'] ?? {}) as Record<string, CacheEntry<Problem>>;
    cache[url] = createCacheEntry(problem);
    // Limit cache size
    const entries = Object.entries(cache);
    if (entries.length > 100) {
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const trimmed = Object.fromEntries(sorted.slice(-50));
      await chromeSet({ problemCache: trimmed });
    } else {
      await chromeSet({ problemCache: cache });
    }
  },

  async getCachedAnalysis(key: string): Promise<AnalysisResult | null> {
    const data = await chromeGet<Record<string, CacheEntry<AnalysisResult>>>(['analysisCache']);
    const cache = data['analysisCache'] ?? {};
    const entry = cache[key];
    if (!entry || !isCacheValid(entry)) return null;
    return entry.data;
  },

  async cacheAnalysis(key: string, analysis: AnalysisResult): Promise<void> {
    const data = await chromeGet<Record<string, CacheEntry<AnalysisResult>>>(['analysisCache']);
    const cache = (data['analysisCache'] ?? {}) as Record<string, CacheEntry<AnalysisResult>>;
    cache[key] = createCacheEntry(analysis);
    const entries = Object.entries(cache);
    if (entries.length > 50) {
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const trimmed = Object.fromEntries(sorted.slice(-25));
      await chromeSet({ analysisCache: trimmed });
    } else {
      await chromeSet({ analysisCache: cache });
    }
  },

  async clearAll(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise<void>((resolve) => chrome.storage.local.clear(resolve));
    } else {
      localStorage.clear();
    }
  },
};
