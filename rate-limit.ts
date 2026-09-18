type Bucket = {
  startedAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/**
 * A small per-instance guard for public routes that fan out to upstream APIs.
 * Vercel's edge protections remain the global layer; this prevents a single
 * warm function instance from doing unbounded work during a burst.
 */
export function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs = 60_000,
) {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);

  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    if (buckets.size > MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (now - bucket.startedAt >= windowMs) buckets.delete(bucketKey);
      }
    }
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfter: 0 };
  }

  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
  return {
    allowed: current.count <= limit,
    remaining: Math.max(limit - current.count, 0),
    retryAfter,
  };
}
