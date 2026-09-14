import "server-only";

// In-memory sliding-window limiter. Fine for a single-process deployment
// (matches today's SQLite/single-instance setup); revisit with a shared
// store (e.g. Redis) once this runs behind more than one server instance,
// since each instance would otherwise keep its own independent counters.
const attempts = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** Returns true if `key` (e.g. a normalized email) is currently rate-limited. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, timestamps);
  return timestamps.length >= MAX_ATTEMPTS;
}

/** Records a failed attempt against `key`. */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const timestamps = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  attempts.set(key, timestamps);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
