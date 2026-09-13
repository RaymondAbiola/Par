export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`${status} from ${url}`);
    this.name = "HttpError";
  }
}

interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialises callers to at most one request per interval, shared across concurrent workers. */
export function createRateLimiter(minIntervalMs: number) {
  let next = 0;
  return async function acquire(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + minIntervalMs;
    if (at > now) await sleep(at - now);
  };
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 5_000 * 3 ** attempt;
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 15_000, retries = 4, headers } = options;

  let lastError: unknown;
  let backoffMs = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (backoffMs > 0) await sleep(backoffMs);

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });

      // free tiers rate limit hard and stay limited for tens of seconds, so back off in seconds
      if (response.status === 429) {
        lastError = new HttpError(429, url);
        backoffMs = retryAfterMs(response, attempt);
        continue;
      }
      if (response.status >= 500) {
        lastError = new HttpError(response.status, url);
        backoffMs = 1_000 * 2 ** attempt;
        continue;
      }
      if (!response.ok) throw new HttpError(response.status, url);

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      backoffMs = 1_000 * 2 ** attempt;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

/** Runs tasks with bounded concurrency so discovery stays inside free-tier rate limits. */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await fn(item, index);
    }
  });

  await Promise.all(workers);
  return results;
}
