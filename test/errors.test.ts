import { describe, it, expect } from "vitest";
import {
  DuprApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  buildError,
} from "../src/errors.js";

function makeResponse(status: number, body?: object, headers?: Record<string, string>): Response {
  return new Response(body !== undefined ? JSON.stringify(body) : null, {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("error classes", () => {
  it("preserves instanceof checks across subclasses", () => {
    const err = new AuthenticationError("denied", 401);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).toBeInstanceOf(DuprApiError);
    expect(err).toBeInstanceOf(Error);
  });

  it("stores statusCode and details", () => {
    const err = new ValidationError("bad input", 400, { field: "matchDate" });
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: "matchDate" });
  });

  it("stores duprRequestId when provided", () => {
    const err = new ServerError("oops", 500, undefined, "req-abc");
    expect(err.duprRequestId).toBe("req-abc");
  });
});

describe("buildError()", () => {
  it("maps 401 → AuthenticationError", async () => {
    const err = await buildError(makeResponse(401, { message: "Unauthorized" }));
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toBe("Unauthorized");
    expect(err.statusCode).toBe(401);
  });

  it("maps 403 → AuthenticationError", async () => {
    const err = await buildError(makeResponse(403, { message: "Forbidden" }));
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("maps 404 → NotFoundError", async () => {
    const err = await buildError(makeResponse(404, { message: "Not found" }));
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it("maps 400 → ValidationError", async () => {
    const err = await buildError(makeResponse(400, { message: "Invalid matchDate" }));
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toBe("Invalid matchDate");
  });

  it("maps 429 → RateLimitError", async () => {
    const err = await buildError(makeResponse(429, { message: "Too many requests" }));
    expect(err).toBeInstanceOf(RateLimitError);
  });

  it("maps 500 → ServerError", async () => {
    const err = await buildError(makeResponse(500, { message: "Internal error" }));
    expect(err).toBeInstanceOf(ServerError);
  });

  it("falls back to generic message when body has none", async () => {
    const err = await buildError(makeResponse(502, {}));
    expect(err.message).toBe("DUPR API error 502");
    expect(err).toBeInstanceOf(ServerError);
  });

  it("handles non-JSON body gracefully", async () => {
    const res = new Response("Bad Gateway", { status: 502 });
    const err = await buildError(res);
    expect(err).toBeInstanceOf(ServerError);
    expect(err.message).toBe("DUPR API error 502");
  });

  it("captures x-request-id header", async () => {
    const err = await buildError(makeResponse(500, {}, { "x-request-id": "trace-123" }));
    expect(err.duprRequestId).toBe("trace-123");
  });
});
