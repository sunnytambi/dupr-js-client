import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient } from "../src/http.js";
import { resolveConfig } from "../src/config.js";
import { RateLimitError, ServerError } from "../src/errors.js";

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errResponse(status: number, body?: object, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body ?? {}), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
  });
}

function makeHttp(fetchMock: ReturnType<typeof vi.fn>, retryOptions?: { maxRetries?: number; baseDelayMs?: number } | false) {
  const cfg = resolveConfig({
    auth: { type: "staticBearer", bearerToken: "tok" },
    customFetch: fetchMock as typeof fetch,
    retry: retryOptions === false ? false : { maxRetries: retryOptions?.maxRetries ?? 2, baseDelayMs: retryOptions?.baseDelayMs ?? 1 },
  });
  return new HttpClient(cfg);
}

// Suppress actual sleep in tests by stubbing setTimeout
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("retry on 5xx", () => {
  it("retries up to maxRetries times then throws ServerError", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(errResponse(500, { message: "server error" }))
      .mockResolvedValueOnce(errResponse(500, { message: "server error" }))
      .mockResolvedValueOnce(errResponse(500, { message: "server error" }));

    const http = makeHttp(fetch, { maxRetries: 2, baseDelayMs: 1 });
    const promise = http.get("/test");
    // Attach rejection handler BEFORE advancing timers to prevent unhandled rejection warnings
    const assertion = expect(promise).rejects.toBeInstanceOf(ServerError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("succeeds on retry after initial 5xx", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(okResponse({ status: "SUCCESS" }));

    const http = makeHttp(fetch, { maxRetries: 2, baseDelayMs: 1 });
    const promise = http.get("/test");
    const assertion = expect(promise).resolves.toMatchObject({ status: "SUCCESS" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("retry on 429 with Retry-After", () => {
  it("retries after Retry-After delay on 429", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(errResponse(429, { message: "Too Many Requests" }, { "Retry-After": "2" }))
      .mockResolvedValueOnce(okResponse({ status: "SUCCESS" }));

    const http = makeHttp(fetch, { maxRetries: 2, baseDelayMs: 1 });
    const promise = http.get("/test");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toMatchObject({ status: "SUCCESS" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws RateLimitError if still 429 after all retries", async () => {
    const fetch = vi.fn().mockResolvedValue(
      errResponse(429, { message: "Rate limit" }, { "Retry-After": "1" }),
    );
    const http = makeHttp(fetch, { maxRetries: 2, baseDelayMs: 1 });
    const promise = http.get("/test");
    const assertion = expect(promise).rejects.toBeInstanceOf(RateLimitError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("no retry on 4xx client errors", () => {
  it("does not retry on 400", async () => {
    const fetch = vi.fn().mockResolvedValue(errResponse(400, { message: "bad request" }));
    const http = makeHttp(fetch, { maxRetries: 3, baseDelayMs: 1 });
    await expect(http.get("/test")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 404", async () => {
    const fetch = vi.fn().mockResolvedValue(errResponse(404, { message: "not found" }));
    const http = makeHttp(fetch, { maxRetries: 3, baseDelayMs: 1 });
    await expect(http.get("/test")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("retry disabled", () => {
  it("does not retry when retry: false", async () => {
    const fetch = vi.fn().mockResolvedValue(errResponse(500));
    const http = makeHttp(fetch, false);
    await expect(http.get("/test")).rejects.toBeInstanceOf(ServerError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("retry on network error", () => {
  it("retries on TypeError (network failure)", async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(okResponse({ status: "SUCCESS" }));

    const http = makeHttp(fetch, { maxRetries: 2, baseDelayMs: 1 });
    const promise = http.get("/test");
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ status: "SUCCESS" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
