import type { CacheEntry } from '@/types';

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function createCacheEntry<T>(data: T, ttl = DEFAULT_TTL): CacheEntry<T> {
  return { data, timestamp: Date.now(), ttl };
}

export function isCacheValid<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

export function getCacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].join(':');
}

// Simple in-memory cache for session use
class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    this.store.set(key, createCacheEntry(data, ttl));
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (!isCacheValid(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const memoryCache = new MemoryCache();
