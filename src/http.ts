import { ResolvedConfig } from "./config.js";
import { AuthenticationError, buildError, RateLimitError, ServerError } from "./errors.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff with ±20% jitter to avoid thundering herd
  const exp = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
  return exp * (0.8 + Math.random() * 0.4);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof ServerError) return true;
  // Network-level failures (fetch throws a TypeError on connection refused etc.)
  if (err instanceof TypeError) return true;
  return false;
}

export class HttpClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ResolvedConfig) {}

  private async getBearerToken(): Promise<string> {
    if (this.config.overrideBearerToken) {
      return this.config.overrideBearerToken;
    }
    if (this.config.auth.type === "staticBearer") {
      return this.config.auth.bearerToken;
    }
    if (this.config.auth.type !== "clientCredentials") {
      throw new AuthenticationError("No auth configured — set auth in DuprClientOptions or call setBearerToken()", 401);
    }

    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    const { clientKey, clientSecret } = this.config.auth;
    const encoded = Buffer.from(`${clientKey}:${clientSecret}`).toString("base64");
    const url = `${this.config.baseUrl}/auth/${this.config.version}/token`;

    const start = Date.now();
    const res = await this.config.customFetch(url, {
      method: "POST",
      headers: {
        "x-authorization": encoded,
        "User-Agent": this.config.userAgent,
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    this.config.onResponse?.({ status: res.status, url, durationMs: Date.now() - start });

    if (!res.ok) throw await buildError(res);

    const body = await res.json() as { token?: string; accessToken?: string; expiresIn?: number };
    this.token = body.token ?? body.accessToken ?? null;
    if (!this.token) throw new AuthenticationError("Token response contained no token", 401);

    const ttlSec = body.expiresIn ?? 3600;
    this.tokenExpiresAt = Date.now() + (ttlSec - 60) * 1000;
    return this.token;
  }

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>("GET", path, init);
  }

  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const extra: RequestInit = { headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } };
    if (body !== undefined) extra.body = JSON.stringify(body);
    return this.request<T>("POST", path, { ...init, ...extra });
  }

  async delete<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const extra: RequestInit = { headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } };
    if (body !== undefined) extra.body = JSON.stringify(body);
    return this.request<T>("DELETE", path, { ...init, ...extra });
  }

  async request<T>(method: string, path: string, init?: RequestInit): Promise<T> {
    const retryCfg = this.config.retry;
    const maxAttempts = retryCfg === false ? 1 : retryCfg.maxRetries + 1;

    let lastErr: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.rawRequest<T>(method, path, init);
      } catch (err) {
        lastErr = err;

        if (attempt >= maxAttempts - 1) break;
        if (!isRetryable(err)) break;
        if (retryCfg === false) break;

        let delay: number;
        if (err instanceof RateLimitError) {
          // Honor Retry-After header (value in seconds)
          const retryAfterSec =
            err.details !== null &&
            typeof err.details === "object" &&
            "retryAfterSeconds" in (err.details as object)
              ? Number((err.details as { retryAfterSeconds: unknown }).retryAfterSeconds)
              : NaN;
          delay = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : retryDelayMs(attempt, retryCfg.baseDelayMs, retryCfg.maxDelayMs);
        } else {
          delay = retryDelayMs(attempt, retryCfg.baseDelayMs, retryCfg.maxDelayMs);
        }

        await sleep(delay);
      }
    }

    throw lastErr;
  }

  private async rawRequest<T>(method: string, path: string, init?: RequestInit): Promise<T> {
    const token = await this.getBearerToken();
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "User-Agent": this.config.userAgent,
      ...(init?.headers as Record<string, string> | undefined ?? {}),
    };

    this.config.onRequest?.({ method, url, headers });

    const start = Date.now();
    const res = await this.config.customFetch(url, {
      method,
      ...init,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    this.config.onResponse?.({ status: res.status, url, durationMs: Date.now() - start });

    if (!res.ok) {
      const err = await buildError(res);
      // Attach Retry-After from the response header so the retry loop can read it
      if (err instanceof RateLimitError) {
        const retryAfter = res.headers.get("Retry-After");
        if (retryAfter) {
          (err as RateLimitError & { details: unknown }).details =
            typeof err.details === "object" && err.details !== null
              ? { ...err.details as object, retryAfterSeconds: Number(retryAfter) }
              : { retryAfterSeconds: Number(retryAfter) };
        }
      }
      throw err;
    }

    // Some endpoints return 204 No Content
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }
}
