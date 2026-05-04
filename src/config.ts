export type AuthMode =
  | { type: "clientCredentials"; clientKey: string; clientSecret: string }
  | { type: "staticBearer"; bearerToken: string }
  | { type: "none" };

export interface RequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
}

export interface ResponseInfo {
  status: number;
  url: string;
  durationMs: number;
}

export interface RetryOptions {
  /** Max number of retry attempts after the initial failure. @default 3 */
  maxRetries?: number;
  /** Base delay in ms before the first retry. Doubles on each attempt. @default 1_000 */
  baseDelayMs?: number;
  /** Max delay cap in ms (prevents infinite backoff). @default 30_000 */
  maxDelayMs?: number;
}

export interface DuprClientOptions {
  /** @default "https://uat.mydupr.com/api" */
  baseUrl?: string;
  /** API version prefix used in all paths. @default "v1.0" */
  version?: string;
  /** Request timeout in milliseconds. @default 30_000 */
  timeoutMs?: number;
  auth?: AuthMode;
  /** Custom User-Agent header. */
  userAgent?: string;
  /** Inject a custom fetch implementation (useful for testing or polyfilling). */
  customFetch?: typeof fetch;
  /** Called before every request. Useful for logging or tracing. */
  onRequest?: (info: RequestInfo) => void;
  /** Called after every response (including errors). */
  onResponse?: (info: ResponseInfo) => void;
  /** Retry behaviour for transient errors (5xx, network failures, 429). Pass `false` to disable. */
  retry?: RetryOptions | false;
}

export interface ResolvedRetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface ResolvedConfig {
  baseUrl: string;
  version: string;
  timeoutMs: number;
  auth: AuthMode;
  userAgent: string;
  customFetch: typeof fetch;
  retry: ResolvedRetryOptions | false;
  onRequest?: (info: RequestInfo) => void;
  onResponse?: (info: ResponseInfo) => void;
  /** Runtime override for the bearer token — set via `client.setBearerToken()`. */
  overrideBearerToken?: string;
}

export function resolveConfig(opts: DuprClientOptions): ResolvedConfig {
  const cfg: ResolvedConfig = {
    baseUrl: opts.baseUrl ?? "https://uat.mydupr.com/api",
    version: opts.version ?? "v1.0",
    timeoutMs: opts.timeoutMs ?? 30_000,
    auth: opts.auth ?? { type: "none" },
    userAgent: opts.userAgent ?? "dupr-js-client/0.1.0",
    customFetch: opts.customFetch ?? globalThis.fetch.bind(globalThis),
    retry:
      opts.retry === false
        ? false
        : {
            maxRetries: opts.retry?.maxRetries ?? 3,
            baseDelayMs: opts.retry?.baseDelayMs ?? 1_000,
            maxDelayMs: opts.retry?.maxDelayMs ?? 30_000,
          },
  };
  if (opts.onRequest) cfg.onRequest = opts.onRequest;
  if (opts.onResponse) cfg.onResponse = opts.onResponse;
  return cfg;
}
