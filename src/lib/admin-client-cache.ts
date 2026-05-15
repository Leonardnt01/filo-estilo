type CacheEntry<T> = {
  data: T;
  ts: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function fetchCachedJson<T>(
  url: string,
  opts?: { ttlMs?: number; force?: boolean },
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? 20_000;
  const force = opts?.force ?? false;
  const now = Date.now();
  const hit = cache.get(url) as CacheEntry<T> | undefined;

  if (!force && hit && now - hit.ts < ttlMs) {
    return hit.data;
  }

  const pending = inflight.get(url) as Promise<T> | undefined;
  if (pending) return pending;

  const req = fetch(url)
    .then(async (res) => {
      const json = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
      cache.set(url, { data: json, ts: Date.now() });
      return json as T;
    })
    .finally(() => inflight.delete(url));

  inflight.set(url, req);
  return req;
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

