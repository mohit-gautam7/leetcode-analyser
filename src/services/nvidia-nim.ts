import type { NvidiaModel, ModelInfo } from '@/types';

export const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

// Only confirmed-alive NVIDIA NIM free-tier models (as of June 2026)
export const AI_MODELS: Record<NvidiaModel | 'auto', ModelInfo | null> = {
  auto: null,
  'meta/llama-3.3-70b-instruct': {
    id: 'meta/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'Default for everything — proven reliable across analysis, code, debug, dry run',
    contextLength: 128000,
    strengths: ['Deep reasoning', 'Code understanding', 'Step-by-step', 'Reliable JSON output'],
    bestFor: ['analysis', 'debug', 'editorial', 'interview', 'solution', 'optimization', 'help', 'dryrun'],
    speed: 'medium',
  },
  'meta/llama-4-maverick-17b-128e-instruct': {
    id: 'meta/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    description: 'Manual option — faster, huge context, but less reliable on strict JSON tasks (e.g. dry run)',
    contextLength: 1000000,
    strengths: ['Fast inference', 'Code generation', 'Ultra-long context'],
    bestFor: [],
    speed: 'fast',
  },
  // Candidates below: confirmed to exist (verified via OpenRouter's live catalog, free tier,
  // NVIDIA's own models) but NOT YET confirmed to work on NVIDIA's direct NIM endpoint —
  // select to test; the 404/410 auto-fallback above protects against them not working.
  'nvidia/nemotron-3-ultra-550b-a55b': {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    name: 'Nemotron 3 Ultra 550B (untested)',
    description: 'NVIDIA\'s newest, largest free reasoning model — untested on direct NIM API',
    contextLength: 1000000,
    strengths: ['Frontier reasoning', 'Huge context'],
    bestFor: ['analysis', 'debug', 'editorial', 'interview'],
    speed: 'slow',
  },
  'nvidia/nemotron-3-super-120b-a12b': {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    name: 'Nemotron 3 Super 120B (untested)',
    description: 'Faster free Nemotron 3 variant — untested on direct NIM API',
    contextLength: 1000000,
    strengths: ['Strong reasoning', 'Faster than Ultra'],
    bestFor: ['analysis', 'debug', 'editorial', 'interview'],
    speed: 'medium',
  },
};

// Single consistent model for every task — proven reliable throughout testing.
// Llama 4 Maverick remains manually selectable in Settings, but auto no longer
// picks it: it produced unreliable JSON on strict-format tasks (e.g. dry run).
export function selectAutoModel(_mode: string): NvidiaModel {
  return 'meta/llama-3.3-70b-instruct';
}

export interface NimMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NimOptions {
  model: NvidiaModel;
  messages: NimMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  apiKey: string;
}

interface NimResponse {
  choices: Array<{ message: { content: string }; finish_reason: string; index: number }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

let abortController: AbortController | null = null;

export function cancelActiveRequest(): void {
  abortController?.abort();
  abortController = null;
}

const FALLBACK: NvidiaModel = 'meta/llama-3.3-70b-instruct';

export async function nimRequest(options: NimOptions, _retried = false): Promise<string> {
  abortController = new AbortController();
  const { model, messages, temperature = 0.3, maxTokens = 2048, apiKey } = options;

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    // Auto-retry with fallback if this model is gone/unavailable
    if ((response.status === 404 || response.status === 410) && !_retried && model !== FALLBACK) {
      console.warn(`[NIM] ${model} unavailable (${response.status}) — retrying with ${FALLBACK}`);
      return nimRequest({ ...options, model: FALLBACK }, true);
    }
    const body = await response.text();
    let msg = `NVIDIA NIM Error ${response.status}`;
    try { msg = (JSON.parse(body) as { detail?: string }).detail ?? msg; } catch { /* raw */ }
    throw new Error(msg);
  }

  const data = (await response.json()) as NimResponse;
  const choice = data.choices[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') {
    console.warn(`[NIM] ${model} response finished with reason "${choice.finish_reason}" — output may be truncated/incomplete`);
  }
  return choice?.message?.content ?? '';
}

export async function* nimStream(options: NimOptions, _retried = false): AsyncGenerator<string> {
  abortController = new AbortController();
  const { model, messages, temperature = 0.3, maxTokens = 2048, apiKey } = options;

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    if ((response.status === 404 || response.status === 410) && !_retried && model !== FALLBACK) {
      console.warn(`[NIM] ${model} unavailable (${response.status}) — stream retry with ${FALLBACK}`);
      yield* nimStream({ ...options, model: FALLBACK }, true);
      return;
    }
    const body = await response.text();
    let msg = `NVIDIA NIM Error ${response.status}`;
    try { msg = (JSON.parse(body) as { detail?: string }).detail ?? msg; } catch { /* raw */ }
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(t.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch { /* skip */ }
      }
    }
  } finally { reader.releaseLock(); }
}
