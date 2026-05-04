import { describe, it, expect, vi } from "vitest";
import { DuprClient } from "../src/client.js";
import { AuthenticationError } from "../src/errors.js";

function makeClient(fetchMock: ReturnType<typeof vi.fn>) {
  return new DuprClient({
    baseUrl: "https://uat.mydupr.com/api",
    version: "v1.0",
    auth: { type: "clientCredentials", clientKey: "key123", clientSecret: "secret456" },
    customFetch: fetchMock as typeof fetch,
    retry: false,
  });
}

describe("AuthModule.getToken()", () => {
  it("POSTs to /auth/{version}/token with base64 x-authorization header", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-abc", expiresIn: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = makeClient(fetch);
    const result = await client.auth.getToken();

    expect(result.token).toBe("jwt-abc");
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/v1.0/token");
    const expectedEncoded = Buffer.from("key123:secret456").toString("base64");
    expect((init.headers as Record<string, string>)["x-authorization"]).toBe(expectedEncoded);
  });

  it("throws AuthenticationError when not using clientCredentials auth", async () => {
    const client = new DuprClient({
      auth: { type: "staticBearer", bearerToken: "tok" },
      customFetch: vi.fn() as unknown as typeof fetch,
      retry: false,
    });
    await expect(client.auth.getToken()).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthModule.exchangeCode()", () => {
  it("POSTs grant_type=authorization_code with form body", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "user-jwt", refresh_token: "refresh-xyz" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = makeClient(fetch);
    const result = await client.auth.exchangeCode({ code: "auth-code-123", redirectUri: "https://app.com/callback" });

    expect(result.token).toBe("user-jwt");
    expect(result.refresh_token).toBe("refresh-xyz");

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/v1.0/token");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code-123");
    expect(body.get("redirect_uri")).toBe("https://app.com/callback");
    expect(body.get("client_id")).toBe("key123");
  });

  it("throws AuthenticationError on non-clientCredentials auth", async () => {
    const client = new DuprClient({
      auth: { type: "staticBearer", bearerToken: "tok" },
      customFetch: vi.fn() as unknown as typeof fetch,
      retry: false,
    });
    await expect(client.auth.exchangeCode({ code: "x", redirectUri: "https://cb" })).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthModule.refreshToken()", () => {
  it("POSTs grant_type=refresh_token with the refresh token", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "new-jwt", refresh_token: "new-refresh" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = makeClient(fetch);
    const result = await client.auth.refreshToken("old-refresh-token");

    expect(result.token).toBe("new-jwt");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old-refresh-token");
  });
});

describe("AuthModule.getAuthorizationUrl()", () => {
  it("throws when authorizationUrl is not configured", () => {
    const client = makeClient(vi.fn() as unknown as typeof fetch);
    expect(() =>
      client.auth.getAuthorizationUrl({ redirectUri: "https://app.com/cb" }),
    ).toThrow(/authorizationUrl is not configured/);
  });

  it("builds correct URL when authorizationUrl is injected", () => {
    const client = new DuprClient({
      auth: { type: "clientCredentials", clientKey: "key123", clientSecret: "secret" },
      customFetch: vi.fn() as unknown as typeof fetch,
      retry: false,
    });
    // Simulate setting authorizationUrl (advanced config injection)
    (client.config as Record<string, unknown>)["authorizationUrl"] = "https://auth.mydupr.com/oauth/authorize";

    const url = client.auth.getAuthorizationUrl({
      redirectUri: "https://app.com/callback",
      scopes: ["user.read"],
      state: "random-state",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("key123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://app.com/callback");
    expect(parsed.searchParams.get("scope")).toBe("user.read");
    expect(parsed.searchParams.get("state")).toBe("random-state");
  });
});
