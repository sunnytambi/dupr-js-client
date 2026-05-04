# Create a npm library `dupr-js-client` similar to [https://libraries.io/pypi/dupr-api-client](https://libraries.io/pypi/dupr-api-client).

## 1. Project structure

**Actionables:**

- Layout:

```text
packages/dupr-js-client/
  src/
    index.ts
    client.ts
    config.ts
    http.ts
    auth.ts
    errors.ts
    resources/
      users.ts
      players.ts
      playerRating.ts
      matches.ts
      clubs.ts
      events.ts
      webhooks.ts
  test/
  tsconfig.json
  package.json
  .eslintrc.cjs
  vitest.config.ts
```

- Use pnpm or npm workspaces if you later add example apps.

***

## 2. Config and client core

Design a flexible options object, which supports base URL, version, timeout, and token updates.

**Actionables (config types):**
- File name: config.ts

```ts
export type AuthMode =
  | { type: "clientCredentials"; clientKey: string; clientSecret: string }
  | { type: "staticBearer"; bearerToken: string }
  | { type: "none" }; // useful for tests/mocking

export interface DuprClientOptions {
  baseUrl?: string;           // default https://uat.mydupr.com/api [web:17]
  version?: string;           // default "v1.0" as in OpenAPI paths [web:17]
  timeoutMs?: number;         // default 30_000
  auth?: AuthMode;
  userAgent?: string;
}
```

**Actionables (DuprClient skeleton):**
- File name: client.ts

```ts
export class DuprClient {
  readonly config: ResolvedConfig;
  readonly auth: AuthModule;
  readonly users: UsersModule;
  readonly players: PlayersModule;
  readonly playerRating: PlayerRatingModule;
  readonly matches: MatchesModule;
  readonly clubs: ClubsModule;
  readonly events: EventsModule;
  readonly webhooks: WebhooksModule;

  constructor(opts: DuprClientOptions = {}) {
    this.config = resolveConfig(opts);
    const http = new HttpClient(this.config);
    const auth = new AuthModule(http, this.config);
    this.auth = auth;
    this.users = new UsersModule(http, this.config);
    this.players = new PlayersModule(http, this.config);
    this.playerRating = new PlayerRatingModule(http, this.config);
    this.matches = new MatchesModule(http, this.config);
    this.clubs = new ClubsModule(http, this.config);
    this.events = new EventsModule(http, this.config);
    this.webhooks = new WebhooksModule(http, this.config);
  }

  setBearerToken(token: string) {
    this.config.overrideBearerToken = token; // like Python’s set_bearer_token [web:2]
  }
}
```


***

## 3. HTTP layer and auth handling

Auth flow is:

- `POST /auth/{version}/token` with `x-authorization: base64(clientKey:clientSecret)` to get a short‑lived access token.
- Use `Authorization: Bearer <JWT>` on all other endpoints.

**Actionables (HTTP client + token cache):**
- File name: http.ts

```ts
class HttpClient {
  constructor(private config: ResolvedConfig) {}

  private token: string | null = null;
  private tokenExpiresAt = 0;

  private async getBearerToken() {
    if (this.config.auth?.type === "staticBearer") {
      return this.config.auth.bearerToken;
    }
    if (this.config.auth?.type !== "clientCredentials") {
      throw new AuthenticationError("No auth configured");
    }
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const raw = `${this.config.auth.clientKey}:${this.config.auth.clientSecret}`;
    const encoded = Buffer.from(raw).toString("base64"); // [web:1][web:17]

    const url = `${this.config.baseUrl}/auth/${this.config.version}/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-authorization": encoded },
    });
    if (!res.ok) throw await buildError(res);
    const body = await res.json();
    this.token = body.token ?? body.accessToken;
    const ttlSec = body.expiresIn ?? 3600; // 1h default [web:17]
    this.tokenExpiresAt = Date.now() + (ttlSec - 60) * 1000;
    return this.token!;
  }

  async get(path: string, init?: RequestInit) {
    return this.request("GET", path, init);
  }

  async post(path: string, body?: any, init?: RequestInit) {
    return this.request("POST", path, {
      ...init,
      body: body ? JSON.stringify(body) : undefined,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  }

  async request(method: string, path: string, init?: RequestInit) {
    const token = await this.getBearerToken();
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      ...init,
      headers: {
        Authorization: `Bearer ${token}`, // bearerAuth security scheme [web:17]
        "User-Agent": this.config.userAgent,
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!res.ok) throw await buildError(res);
    return res.json();
  }
}
```


***

## 4. Error model

Explicit error types: `AuthenticationError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `ServerError`, and base `DuprApiError`.

**Actionables:**
- File name: errors.ts
- Decode HTTP status + DUPR’s error body (they often return a generic object with message and status).
- Map:
    - 400 → `ValidationError`
    - 401/403 → `AuthenticationError`
    - 404 → `NotFoundError`
    - 429 → `RateLimitError`
    - 5xx → `ServerError`
- Include:
    - `statusCode`, `duprRequestId` (if header or body includes it), `rawBody`.

```ts
export class DuprApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) { super(message); }
}

export class AuthenticationError extends DuprApiError {}
export class ValidationError extends DuprApiError {}
export class NotFoundError extends DuprApiError {}
export class RateLimitError extends DuprApiError {}
export class ServerError extends DuprApiError {}

async function buildError(res: Response): Promise<DuprApiError> {
  let body: any;
  try { body = await res.json(); } catch {}
  const msg = body?.message || `DUPR API error ${res.status}`;
  const base = new DuprApiError(msg, res.status, body);
  if (res.status === 401 || res.status === 403) return new AuthenticationError(msg, res.status, body);
  if (res.status === 404) return new NotFoundError(msg, res.status, body);
  if (res.status === 400) return new ValidationError(msg, res.status, body);
  if (res.status === 429) return new RateLimitError(msg, res.status, body);
  if (res.status >= 500) return new ServerError(msg, res.status, body);
  return base;
}
```


***

## 5. Resource modules (map OpenAPI → methods)

**Users module examples:**
- File name: resources/users.ts

- `GET /user/{version}/{id}` → `users.getUser(duprId)`
- `GET /user/{version}/{id}/details` → `users.getExtendedUser(duprId)`
- `GET /user/{version}/{id}/clubs` → `users.getClubMemberships(duprId)`
- `POST /user/{version}/search` → `users.search(req)`
- Provisional ratings endpoints → `users.getProvisionalRating`, `.createProvisionalRating`, `.updateProvisionalRating`, `.deleteProvisionalRating`.

```ts
export class UsersModule {
  constructor(private http: HttpClient, private cfg: ResolvedConfig) {}

  getUser(id: string) {
    return this.http.get(`/user/${this.cfg.version}/${id}`);
  }

  getExtendedUser(id: string) {
    return this.http.get(`/user/${this.cfg.version}/${id}/details`);
  }

  search(req: ExternalSearchRequest) {
    return this.http.post(`/user/${this.cfg.version}/search`, req);
  }

  // ... provisional rating methods using the corresponding schemas [web:17]
}
```

**Matches module (Match tag):**
- File name: resources/matches.ts

- `POST /match/{version}/create` → `matches.create(match: ExternalMatchRequest)`
- `POST /match/{version}/batch` → `matches.createBulk(matches: ExternalMatchRequest[])`
- `POST /match/{version}/update` → `matches.update(req: ExternalUpdateMatchRequest)`
- `DELETE /match/{version}/delete` → `matches.delete(req: ExternalDeleteMatchRequest)`
- `GET /match/{version}/{id}` → `matches.get(matchId)`
- `POST /match/history/search` → `matches.searchHistory(req: ExternalMatchSearchRequest)`

Map the schemas as TS interfaces straight from the OpenAPI JSON.

**Players / Player Rating modules:**
- File name: resources/players.ts

- `POST /{version}/player/duprid-by-email` → `players.getDuprIdByEmail(email)`
- `POST /{version}/player` (club ratings) etc.
- `/history` and `/subscribe/rating-changes` → rating history + subscription management (subscribe/unsubscribe list of duprIds).

**Clubs \& Events modules:**
- File name: resources/events.ts & resources/clubs.ts

- Events: create/update/delete/get via `events.create`, `.update`, `.delete`, `.get`.
- Clubs: `clubMembersRating`, `clubMatchesSearch`, etc.

**Webhooks module:**
- File name: resources/webhooks.ts

- `/user/{version}/subscribe/webhook-event` and `/user/{version}/unsubscribe/webhook-event`: manage webhook subscriptions for topics like RATING.
- `/{version}/webhook` \& `/{version}/topic`: generic API registration.

***

## 6. Types: generate from OpenAPI or hand‑roll

Since DUPR provides a clean OpenAPI 3.1 spec with all schemas, you can either:

**Actionables:**

- Use `openapi-typescript` to generate `types.generated.ts`:

```bash
npx openapi-typescript https://uat.mydupr.com/api/v3/api-docs/DUPR%20Partner%20APIs \
  -o src/types.generated.ts
```

- Wrap generated types in nicer aliases:

```ts
import { paths, components } from "./types.generated";

export type ExternalMatchRequest =
  components["schemas"]["ExternalMatchRequest"];
export type ExternalMatchTeam =
  components["schemas"]["ExternalMatchTeam"];
// etc...
```

- Use these in your modules so consumers get full typing.

***

## 7. Configurability \& extensibility

Make the library easy to adapt to future API changes and different usage patterns.

**Actionables:**

- Allow overriding:
    - `baseUrl` (uat vs prod).
    - `version` (v1.0, v1.1, etc).
    - `timeoutMs`.
- Allow dependency injection:
    - Optional `customFetch?: typeof fetch` in config so people can plug in `node-fetch`, `undici`, or a mocked fetch in tests.
- Provide minimal hooks:
    - `onRequest?(info)` and `onResponse?(info)` callbacks for logging, metrics, or tracing.
- Support both:
    - client‑credentials auth (recommended) and
    - static bearer token (when used behind your own backend).

***

## 8. Testing, docs, and OSS polish

**Actionables:**

- Testing:
    - Use Vitest or Jest.
    - Add unit tests for:
        - Auth header generation.
        - Error mapping based on status codes and error bodies.
        - Each resource method’s URL/path/HTTP verb.
    - Optional: integration tests against DUPR UAT (behind an opt‑in flag and env vars).
- Lint/format:
    - ESLint + Prettier.
- Docs:
    - `README.md` with quick start, config, and examples (profile, player search, match create, club events).
    - JSDoc comments on all public methods, optionally generate docs with `typedoc`.
- OSS:
    - MIT license.
    - `CONTRIBUTING.md` with branch/test guidelines like the Python client.
    - GitHub Actions workflow for lint + test on PR.

***

## 9. Example usage from your Node backend

Once the library exists, your Express backend becomes nearly trivial:

```ts
// duprClient.ts in your backend
import { DuprClient } from "dupr-js-client";

export const client = new DuprClient({
  baseUrl: process.env.DUPR_BASE_URL ?? "https://uat.mydupr.com/api",
  version: "v1.0",
  timeoutMs: 30_000,
  auth: {
    type: "clientCredentials",
    clientKey: process.env.DUPR_CLIENT_KEY!,
    clientSecret: process.env.DUPR_CLIENT_SECRET!,
  },
  baseUrl: "https://uat.mydupr.com/api",
  version: "v1.0",
  timeoutMs: 30_000,
});

const profile = await client.users.getUser("DXJDF");
const matches = await client.matches.searchHistory({ duprId: "DXJDF", limit: 10, ... });
const matchId = await client.matches.create(matchPayload);
```

```ts
// route example
app.post("/api/dupr/matches", async (req, res, next) => {
  try {
    const matchId = await client.matches.create(req.body);
    res.json(matchId);
  } catch (err) {
    next(err);
  }
});
```

- Modules on `client` instance:
    - `auth`, `users`, `players`, `playerRating`, `matches`, `clubs`, `events`, plus `webhooks` and maybe `admin` later.

***
