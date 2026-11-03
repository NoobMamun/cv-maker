import "server-only";

/**
 * Best-effort fixed-window limiter (per server instance). Good enough to stop
 * accidental hammering of the paid AI API; put a shared store such as
 * Upstash/Redis in front for multi-instance production deployments.
 */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE) || 8, windowMs = 60_000) {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 5000) {
      for (const [k, v] of windows) if (now - v.start > windowMs) windows.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  w.count += 1;
  if (w.count > limit) return { ok: false, retryAfter: Math.ceil((w.start + windowMs - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
