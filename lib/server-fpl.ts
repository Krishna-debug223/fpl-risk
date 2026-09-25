const FPL_BASE = "https://fantasy.premierleague.com/api";
const DEFAULT_TIMEOUT_MS = 8_000;
const cache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

export async function fplFetch<T>(path: string, revalidate = 300, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const fetchFresh = async () => {
    const response = await fetch(`${FPL_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FPL-Prism/0.5 (independent public beta)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) throw new Error(`FPL API returned ${response.status}`);
    return response.json();
  };

  if (revalidate <= 0) return fetchFresh() as Promise<T>;

  const now = Date.now();
  const current = cache.get(path);
  if (current && current.expiresAt > now) return current.promise as Promise<T>;

  const promise = fetchFresh();
  cache.set(path, { expiresAt: now + revalidate * 1_000, promise });
  promise.catch(() => {
    if (cache.get(path)?.promise === promise) cache.delete(path);
  });
  return promise as Promise<T>;
}
