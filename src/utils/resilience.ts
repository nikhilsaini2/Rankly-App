/**
 * Production-grade resilience utility for handling API calls with retries,
 * timeouts, and exponential backoff.
 */

export interface ResilienceOptions {
  retries?: number;
  timeoutMs?: number;
  backoffBaseMs?: number;
  abortSignal?: AbortSignal;
}

const DEFAULT_OPTIONS: ResilienceOptions = {
  retries: 3,
  timeoutMs: 30000, // 30s default
  backoffBaseMs: 1000,
};

export async function withResilience<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const { retries, timeoutMs, backoffBaseMs, abortSignal } = { ...DEFAULT_OPTIONS, ...options };
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries!; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Sync external abort signal with local controller
    const onAbort = () => {
      controller.abort();
    };
    if (abortSignal) {
      abortSignal.addEventListener('abort', onAbort);
    }

    try {
      const result = await fn(controller.signal);
      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry if aborted or if it's a specific "no-retry" error
      if (error.name === 'AbortError' || (abortSignal && abortSignal.aborted)) {
        throw error;
      }

      if (attempt < retries!) {
        const delay = backoffBaseMs! * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timeoutId);
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  throw lastError;
}
