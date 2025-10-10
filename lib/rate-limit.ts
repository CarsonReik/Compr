// Simple in-memory rate limiter
// For production, consider using Redis or a database

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp
}

// Store rate limits by IP address
const rateLimitStore = new Map<string, RateLimitEntry>();

const DAILY_LIMIT = 3;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up expired entries every hour to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request from an IP is allowed
 * Returns whether the request is allowed and how many searches remain
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // No entry or entry expired - create new entry
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + RESET_INTERVAL_MS,
    };
    rateLimitStore.set(ip, newEntry);

    return {
      allowed: true,
      remaining: DAILY_LIMIT - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Entry exists and is valid
  if (entry.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(ip, entry);

  return {
    allowed: true,
    remaining: DAILY_LIMIT - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get remaining searches for an IP without incrementing
 */
export function getRemainingSearches(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      resetAt: now + RESET_INTERVAL_MS,
    };
  }

  return {
    allowed: entry.count < DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Extract IP address from NextRequest
 */
export function getClientIP(request: Request): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (in local dev, this will be the same for everyone)
  return 'unknown';
}
