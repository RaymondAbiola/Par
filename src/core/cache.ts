interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Process-local TTL cache. Enough for a single Next instance; swap for KV if we ever scale out. */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async wrap(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;

    const value = await load();
    this.set(key, value, ttlMs);
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}
