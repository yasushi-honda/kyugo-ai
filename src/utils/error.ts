export function isTransientError(err: unknown): boolean {
  const status = (err as { status?: number }).status ?? (err as { code?: number }).code;
  if (status === 429 || status === 503) return true;
  const message = (err as Error).message ?? "";
  return /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up/i.test(message);
}
