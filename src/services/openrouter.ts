import { OpenRouterModel } from '../types';

export const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export const OPENROUTER_MODELS: Array<{
  id: OpenRouterModel;
  name: string;
  description: string;
  contextLength: number;
  speed: 'fast' | 'medium' | 'slow';
  free?: boolean;
}> = [
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    description: 'Anthropic — Best coding & reasoning balance',
    contextLength: 1000000,
    speed: 'fast',
  },
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    description: 'Anthropic — Most powerful, best for complex problems',
    contextLength: 200000,
    speed: 'slow',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Anthropic — Fastest Claude model',
    contextLength: 200000,
    speed: 'fast',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI — Strong coding & multimodal',
    contextLength: 128000,
    speed: 'fast',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'OpenAI — Fast & cost-effective',
    contextLength: 128000,
    speed: 'fast',
  },
  {
    id: 'openai/o4-mini',
    name: 'o4-mini',
    description: 'OpenAI — Best for reasoning & algorithms',
    contextLength: 200000,
    speed: 'slow',
  },
  {
    id: 'google/gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Google — Ultra-fast, large context',
    contextLength: 1048576,
    speed: 'fast',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    description: 'Google — Huge context window',
    contextLength: 1048576,
    speed: 'medium',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    description: 'DeepSeek — Chain-of-thought reasoning',
    contextLength: 163840,
    speed: 'slow',
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    description: 'DeepSeek — Fast & cost-effective',
    contextLength: 131072,
    speed: 'fast',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    description: 'Meta — Default for everything, free, proven reliable',
    contextLength: 131072,
    speed: 'medium',
    free: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'Meta — Open-source powerhouse (paid tier)',
    contextLength: 131072,
    speed: 'medium',
  },
  {
    id: 'mistralai/mistral-large-2512',
    name: 'Mistral Large',
    description: 'Mistral — European efficiency leader',
    contextLength: 262144,
    speed: 'medium',
  },
  {
    id: 'qwen/qwen3-235b-a22b',
    name: 'Qwen3 235B',
    description: 'Alibaba — Massive MoE model',
    contextLength: 131072,
    speed: 'medium',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B',
    description: 'NVIDIA — Free, frontier reasoning, 1M context',
    contextLength: 1000000,
    speed: 'slow',
    free: true,
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super 120B',
    description: 'NVIDIA — Free, strong reasoning, faster than Ultra',
    contextLength: 1000000,
    speed: 'medium',
    free: true,
  },
  {
    id: 'qwen/qwen3-coder:free',
    name: 'Qwen3 Coder',
    description: 'Alibaba — Free, coding-specialized, 1M context',
    contextLength: 1048576,
    speed: 'fast',
    free: true,
  },
];

// Single consistent free model for every task — same model family already
// proven reliable on NVIDIA NIM, for true cross-provider consistency.
export function selectAutoOpenRouterModel(_mode: string): OpenRouterModel {
  return 'meta-llama/llama-3.3-70b-instruct:free';
}

export interface OpenRouterOptions {
  apiKey: string;
  model: OpenRouterModel;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function* openRouterStream(options: OpenRouterOptions): AsyncGenerator<string> {
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/codesense-ai/extension',
      'X-Title': 'CodeSense AI',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error?.error?.message || `OpenRouter API error ${response.status}`);
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
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function openRouterComplete(options: OpenRouterOptions): Promise<string> {
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/codesense-ai/extension',
      'X-Title': 'CodeSense AI',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error?.error?.message || `OpenRouter API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
