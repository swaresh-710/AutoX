/**
 * Shared auth check for scheduler-invoked endpoints (publish cron, metrics
 * refresh). Vercel Cron and the GitHub Actions workflows send
 * "Authorization: Bearer <CRON_SECRET>".
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured — allow only outside production so local dev works.
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET is not set; refusing to run scheduler endpoint in production.");
      return false;
    }
    return true;
  }
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}
