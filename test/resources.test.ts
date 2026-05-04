import { describe, it, expect, vi } from "vitest";
import { DuprClient } from "../src/client.js";

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function makeClient(fetchMock: ReturnType<typeof vi.fn>) {
  return new DuprClient({
    baseUrl: "https://uat.mydupr.com/api",
    version: "v1.0",
    auth: { type: "staticBearer", bearerToken: "test-token" },
    customFetch: fetchMock as typeof fetch,
  });
}

describe("UsersModule", () => {
  it("getUser() calls GET /user/v1.0/{id}", async () => {
    const fetch = makeFetch({ status: "SUCCESS", result: { duprId: "ABC123" } });
    const client = makeClient(fetch);
    await client.users.getUser("ABC123");
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://uat.mydupr.com/api/user/v1.0/ABC123");
    expect((init as RequestInit).method).toBe("GET");
  });

  it("getExtendedUser() calls GET /user/v1.0/{id}/details", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.users.getExtendedUser("ABC123");
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/ABC123/details");
  });

  it("search() calls POST /user/v1.0/search", async () => {
    const fetch = makeFetch({ status: "SUCCESS", result: [] });
    const client = makeClient(fetch);
    await client.users.search({ query: "John", offset: 0, limit: 10 });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/user/v1.0/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ query: "John", offset: 0, limit: 10 });
  });

  it("getBatch() calls POST /user/v1.0/batch", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.users.getBatch({ duprIds: ["ABC", "DEF"] });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/user/v1.0/batch");
  });

  it("invite() calls POST /user/v1.0/invite", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.users.invite({ firstName: "John", lastName: "Doe", email: "j@d.com" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/user/v1.0/invite");
  });
});

describe("MatchesModule", () => {
  it("get() calls GET /match/v1.0/{id}", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.matches.get("match-xyz");
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://uat.mydupr.com/api/match/v1.0/match-xyz");
    expect((init as RequestInit).method).toBe("GET");
  });

  it("create() calls POST /match/v1.0/create with the match payload", async () => {
    const fetch = makeFetch({ status: "SUCCESS", result: { matchCode: "MC001" } });
    const client = makeClient(fetch);
    const match = {
      identifier: "my-match-001",
      matchDate: "2024-06-15",
      matchFormat: "DOUBLES" as const,
      source: "PARTNER" as const,
      teams: [
        { players: [{ duprId: "AAA" }, { duprId: "BBB" }], scores: [11, 8] },
        { players: [{ duprId: "CCC" }, { duprId: "DDD" }], scores: [8, 11] },
      ] as [typeof match["teams"][0], typeof match["teams"][0]],
    };
    await client.matches.create(match);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/match/v1.0/create");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ identifier: "my-match-001" });
  });

  it("createBulk() calls POST /match/v1.0/batch", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.matches.createBulk([]);
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/match/v1.0/batch");
  });

  it("searchHistory() calls POST /match/history/search", async () => {
    const fetch = makeFetch({ status: "SUCCESS", result: [] });
    const client = makeClient(fetch);
    await client.matches.searchHistory({ duprId: "ABC123", limit: 20 });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/match/history/search");
  });

  it("delete() calls DELETE /match/v1.0/delete", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.matches.delete({ matchCode: "MC001", identifier: "my-match-001" });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/match/v1.0/delete");
    expect(init.method).toBe("DELETE");
  });
});

describe("PlayerRatingModule", () => {
  it("getHistory() calls POST /history", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.playerRating.getHistory({ duprId: "ABC123" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/history");
  });

  it("subscribe() calls POST /{version}/subscribe/rating-changes", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.playerRating.subscribe({ duprIds: ["ABC"] });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/subscribe/rating-changes");
  });
});

describe("ClubsModule", () => {
  it("membersRating() calls POST /club/v1.0/members", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.clubs.membersRating({ clubId: "123" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/club/v1.0/members");
  });

  it("searchMatches() calls POST /club/v1.0/match/search", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.clubs.searchMatches({ clubId: "123" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/club/v1.0/match/search");
  });
});

describe("EventsModule", () => {
  it("create() calls POST /events/v1.0/create", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.events.create({ name: "Tournament", startDate: "2024-07-01", endDate: "2024-07-02" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/events/v1.0/create");
  });

  it("delete() calls POST /events/v1.0/delete", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.events.delete({ eventIds: ["evt-1"] });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/events/v1.0/delete");
  });
});

describe("WebhooksModule", () => {
  it("register() calls POST /{version}/webhook", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.webhooks.register({ webhookUrl: "https://example.com/hook", topics: ["RATING"] });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/v1.0/webhook");
  });

  it("getTopics() calls GET /{version}/topic", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.webhooks.getTopics();
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/v1.0/topic");
  });

  it("subscribeUsers() calls POST /user/{version}/subscribe/webhook-event", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    await client.webhooks.subscribeUsers({ duprIds: ["ABC"], topic: "RATING" });
    const [url] = fetch.mock.calls[0] as [string];
    expect(url).toContain("/user/v1.0/subscribe/webhook-event");
  });
});

describe("DuprClient.setBearerToken / clearBearerToken", () => {
  it("overrides the token used in requests", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    client.setBearerToken("runtime-token");
    await client.users.getUser("ABC");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer runtime-token");
  });

  it("falls back to configured auth after clearBearerToken()", async () => {
    const fetch = makeFetch({ status: "SUCCESS" });
    const client = makeClient(fetch);
    client.setBearerToken("runtime-token");
    client.clearBearerToken();
    await client.users.getUser("ABC");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
  });
});
