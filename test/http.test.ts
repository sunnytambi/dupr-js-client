import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient } from "../src/http.js";
import { resolveConfig } from "../src/config.js";
import { AuthenticationError, NotFoundError } from "../src/errors.js";

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  );
}

describe("HttpClient", () => {
  describe("auth header generation", () => {
    it("sends x-authorization header with base64 key:secret on token request", async () => {
      let capturedHeaders: Record<string, string> = {};
      const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
        capturedHeaders = init.headers as Record<string, string>;
        return Promise.resolve(
          new Response(JSON.stringify({ token: "jwt-abc", expiresIn: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });

      const cfg = resolveConfig({
        auth: { type: "clientCredentials", clientKey: "myKey", clientSecret: "mySecret" },
        customFetch: fetchMock as typeof fetch,
      });
      const http = new HttpClient(cfg);
      // Force a token fetch by making a request
      // Stub the second (actual API) call
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "jwt-abc", expiresIn: 3600 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: "SUCCESS" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );

      await http.get("/test");

      const tokenCall = fetchMock.mock.calls[0];
      expect(tokenCall).toBeDefined();
      const [tokenUrl, tokenInit] = tokenCall as [string, RequestInit];
      expect(tokenUrl).toContain("/auth/");
      expect(tokenUrl).toContain("/token");

      const headers = tokenInit.headers as Record<string, string>;
      const expected = Buffer.from("myKey:mySecret").toString("base64");
      expect(headers["x-authorization"]).toBe(expected);
    });

    it("uses static bearer token directly without fetching a token", async () => {
      const apiCall = mockFetch(200, { status: "SUCCESS" });
      const cfg = resolveConfig({
        auth: { type: "staticBearer", bearerToken: "static-jwt" },
        customFetch: apiCall as typeof fetch,
      });
      const http = new HttpClient(cfg);
      await http.get("/user/v1.0/ABC123");

      expect(apiCall).toHaveBeenCalledTimes(1);
      const [, init] = apiCall.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer static-jwt");
    });

    it("uses override bearer token when set", async () => {
      const apiCall = mockFetch(200, { status: "SUCCESS" });
      const cfg = resolveConfig({
        auth: { type: "none" },
        customFetch: apiCall as typeof fetch,
      });
      cfg.overrideBearerToken = "override-token";
      const http = new HttpClient(cfg);
      await http.get("/test");

      const [, init] = apiCall.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer override-token");
    });

    it("throws AuthenticationError when auth is none and no override", async () => {
      const cfg = resolveConfig({ auth: { type: "none" } });
      const http = new HttpClient(cfg);
      await expect(http.get("/test")).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe("error mapping", () => {
    it("throws NotFoundError on 404", async () => {
      const fetch = mockFetch(404, { message: "Player not found" });
      const cfg = resolveConfig({
        auth: { type: "staticBearer", bearerToken: "tok" },
        customFetch: fetch as typeof fetch,
      });
      const http = new HttpClient(cfg);
      await expect(http.get("/user/v1.0/NOPE")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws AuthenticationError on 401", async () => {
      const fetch = mockFetch(401, { message: "Expired token" });
      const cfg = resolveConfig({
        auth: { type: "staticBearer", bearerToken: "old" },
        customFetch: fetch as typeof fetch,
      });
      const http = new HttpClient(cfg);
      await expect(http.get("/user/v1.0/ABC")).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe("request construction", () => {
    it("builds correct URL from baseUrl + path", async () => {
      const fetch = mockFetch(200, { status: "SUCCESS" });
      const cfg = resolveConfig({
        baseUrl: "https://uat.mydupr.com/api",
        auth: { type: "staticBearer", bearerToken: "tok" },
        customFetch: fetch as typeof fetch,
      });
      const http = new HttpClient(cfg);
      await http.get("/user/v1.0/XYZ");

      const [calledUrl] = fetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe("https://uat.mydupr.com/api/user/v1.0/XYZ");
    });

    it("POST sends JSON body with Content-Type header", async () => {
      const fetch = mockFetch(200, { status: "SUCCESS" });
      const cfg = resolveConfig({
        auth: { type: "staticBearer", bearerToken: "tok" },
        customFetch: fetch as typeof fetch,
      });
      const http = new HttpClient(cfg);
      await http.post("/match/v1.0/create", { identifier: "match-1" });

      const [, init] = fetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify({ identifier: "match-1" }));
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });

    it("calls onRequest and onResponse hooks", async () => {
      const onRequest = vi.fn();
      const onResponse = vi.fn();
      const fetch = mockFetch(200, { status: "SUCCESS" });
      const cfg = resolveConfig({
        auth: { type: "staticBearer", bearerToken: "tok" },
        customFetch: fetch as typeof fetch,
        onRequest,
        onResponse,
      });
      const http = new HttpClient(cfg);
      await http.get("/test");

      expect(onRequest).toHaveBeenCalledOnce();
      expect(onResponse).toHaveBeenCalledOnce();
      expect(onResponse.mock.calls[0]?.[0]).toMatchObject({ status: 200 });
    });
  });
});
