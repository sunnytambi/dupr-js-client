import { createHash, randomBytes } from "crypto";
import { HttpClient } from "./http.js";
import { ResolvedConfig } from "./config.js";
import { AuthenticationError } from "./errors.js";
import { TokenResponse } from "./types.js";

export interface AuthCodeTokenResponse extends TokenResponse {
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

/** Response from `client.auth.refreshSsoToken()`. Both tokens are always present — DUPR rotates refresh tokens on every use. */
export interface SsoTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires, if provided by DUPR. */
  expiresIn?: number;
}

export interface AuthorizationUrlParams {
  /** Your OAuth redirect URI, must match what is registered with DUPR. */
  redirectUri: string;
  /** OAuth scopes to request (e.g. ["user.read"]). Defaults to empty. */
  scopes?: string[];
  /** Opaque value passed through the flow to prevent CSRF. Recommended. */
  state?: string;
  /** PKCE code_challenge (S256). Generate the pair with `client.auth.generatePkce()`. */
  codeChallenge?: string;
}

export class AuthModule {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedConfig,
  ) {}

  /**
   * Explicitly request a new access token using client credentials.
   * Normally you don't need to call this — the HTTP client handles token refresh automatically.
   */
  async getToken(): Promise<TokenResponse> {
    if (this.config.auth.type !== "clientCredentials") {
      throw new AuthenticationError("getToken() requires clientCredentials auth mode", 401);
    }
    const { clientKey, clientSecret } = this.config.auth;
    const encoded = Buffer.from(`${clientKey}:${clientSecret}`).toString("base64");
    const url = `${this.config.baseUrl}/auth/${this.config.version}/token`;

    const res = await this.config.customFetch(url, {
      method: "POST",
      headers: {
        "x-authorization": encoded,
        "User-Agent": this.config.userAgent,
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => undefined) as Record<string, unknown> | undefined;
      throw new AuthenticationError(
        (body?.["message"] as string | undefined) ?? `Auth failed: ${res.status}`,
        res.status,
        body,
      );
    }

    return res.json() as Promise<TokenResponse>;
  }

  // ── Authorization Code Flow ───────────────────────────────────────────────
  //
  // Use this flow to let end-users authorise your app to act on their behalf
  // (e.g. the "Connect DUPR" button). The user is redirected to DUPR's login
  // page, then back to your redirectUri with an authorization code.
  //
  // NOTE: This requires a DUPR OAuth application with an authorization endpoint
  // separate from the Partner API client credentials. Confirm the exact
  // authorization URL with DUPR support.
  //
  // Typical flow:
  //   1. client.auth.getAuthorizationUrl({ redirectUri, state }) → redirect user
  //   2. User approves → DUPR calls back to redirectUri?code=xxx&state=yyy
  //   3. client.auth.exchangeCode({ code, redirectUri }) → tokens
  //   4. Store access_token + refresh_token; call client.setBearerToken(access_token)
  //   5. When access_token expires: client.auth.refreshToken(refresh_token)

  /** Generate a PKCE `code_verifier` + `code_challenge` pair (S256 method).
   *  Pass `codeChallenge` to `getAuthorizationUrl()` and `codeVerifier` to `exchangeCode()`. */
  generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    return { codeVerifier, codeChallenge };
  }

  /**
   * Build the DUPR authorization URL to redirect the user to for login.
   * The `authorizationUrl` config option must be set (see above note).
   * Pass `codeChallenge` (from `generatePkce()`) to enable PKCE.
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): string {
    if (!this.config.authorizationUrl) {
      throw new Error(
        "authorizationUrl is not configured. Pass it in DuprClientOptions to use the Authorization Code flow.",
      );
    }
    const url = new URL(this.config.authorizationUrl);
    const clientId = this.config.auth.type === "clientCredentials" ? this.config.auth.clientKey : "";
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    if (params.scopes?.length) url.searchParams.set("scope", params.scopes.join(" "));
    if (params.state) url.searchParams.set("state", params.state);
    if (params.codeChallenge) {
      url.searchParams.set("code_challenge", params.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  }

  /**
   * Exchange an authorization code (from the OAuth callback) for access + refresh tokens.
   * Uses `POST /auth/{version}/token` with `grant_type=authorization_code`.
   */
  async exchangeCode(params: {
    code: string;
    redirectUri: string;
    /** PKCE code_verifier. Required if `codeChallenge` was passed to `getAuthorizationUrl()`. */
    codeVerifier?: string;
  }): Promise<AuthCodeTokenResponse> {
    if (this.config.auth.type !== "clientCredentials") {
      throw new AuthenticationError("exchangeCode() requires clientCredentials auth configured with clientKey/clientSecret", 401);
    }
    const { clientKey, clientSecret } = this.config.auth;
    const url = `${this.config.baseUrl}/auth/${this.config.version}/token`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: clientKey,
      client_secret: clientSecret,
    });
    if (params.codeVerifier) body.set("code_verifier", params.codeVerifier);

    const res = await this.config.customFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.config.userAgent,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => undefined) as Record<string, unknown> | undefined;
      throw new AuthenticationError(
        (errBody?.["message"] as string | undefined) ?? `Code exchange failed: ${res.status}`,
        res.status,
        errBody,
      );
    }

    return res.json() as Promise<AuthCodeTokenResponse>;
  }

  // ── SSO Iframe Flow ───────────────────────────────────────────────────────
  //
  // DUPR's documented SSO approach for user-facing login uses an embedded iframe
  // rather than a standard OAuth2 redirect. The iframe emits a window.postMessage
  // event upon successful login.
  //
  // Typical flow:
  //   1. client.auth.getSsoIframeUrl() → embed in <iframe allow="payment">
  //   2. User logs in inside the iframe
  //   3. Listen for window.postMessage → { userToken, refreshToken, id, duprId, stats }
  //   4. Store userToken + refreshToken server-side; record tokenExpiresAt
  //      (7 days UAT / 30 days prod — not returned in the event, apply based on env)
  //   5. When userToken nears expiry: client.auth.refreshSsoToken(refreshToken)
  //      DUPR rotates refresh tokens — store both returned tokens.
  //
  // UAT iframe host:  https://uat.dupr.gg
  // Prod iframe host: https://dashboard.dupr.com
  // Always validate window.postMessage origin against the expected host.

  /**
   * Returns the DUPR SSO iframe URL. Embed this in an `<iframe allow="payment">` to
   * display the DUPR login widget. Requires `ssoBaseUrl` in `DuprClientOptions`.
   */
  getSsoIframeUrl(): string {
    if (!this.config.ssoBaseUrl) {
      throw new Error(
        "ssoBaseUrl is not configured. Pass it in DuprClientOptions to use the SSO iframe flow.",
      );
    }
    if (this.config.auth.type !== "clientCredentials") {
      throw new AuthenticationError(
        "getSsoIframeUrl() requires clientCredentials auth mode",
        401,
      );
    }
    const encoded = Buffer.from(this.config.auth.clientKey).toString("base64");
    return `${this.config.ssoBaseUrl}/login-external-app/${encoded}`;
  }

  /**
   * Refresh a DUPR SSO user token obtained from the iframe login `postMessage` event.
   * Uses a separate refresh endpoint on `ssoRefreshBaseUrl` (distinct from the Partner API).
   * Requires `ssoRefreshBaseUrl` in `DuprClientOptions`.
   *
   * DUPR rotates refresh tokens on every use — always store both `accessToken` and
   * `refreshToken` from the response.
   */
  async refreshSsoToken(refreshToken: string): Promise<SsoTokenResponse> {
    if (!this.config.ssoRefreshBaseUrl) {
      throw new Error(
        "ssoRefreshBaseUrl is not configured. Pass it in DuprClientOptions to use SSO token refresh.",
      );
    }
    const res = await this.config.customFetch(
      `${this.config.ssoRefreshBaseUrl}/api/auth/refreshAccessToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.config.userAgent,
        },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => undefined) as Record<string, unknown> | undefined;
      throw new AuthenticationError(
        (errBody?.["message"] as string | undefined) ?? `SSO token refresh failed: ${res.status}`,
        res.status,
        errBody,
      );
    }

    const data = await res.json() as Record<string, unknown>;
    const accessToken = (data["accessToken"] ?? data["userToken"]) as string | undefined;
    const newRefreshToken = data["refreshToken"] as string | undefined;

    if (!accessToken) {
      throw new AuthenticationError("SSO token refresh response missing accessToken", 502);
    }
    if (!newRefreshToken) {
      throw new AuthenticationError(
        "SSO token refresh response missing refreshToken — DUPR token rotation failed",
        502,
      );
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      ...(data["expiresIn"] !== undefined && { expiresIn: data["expiresIn"] as number }),
    };
  }

  /**
   * Obtain a new access token using a refresh token from a previous Authorization Code flow.
   * Uses `POST /auth/{version}/token` with `grant_type=refresh_token`.
   */
  async refreshToken(refreshToken: string): Promise<AuthCodeTokenResponse> {
    if (this.config.auth.type !== "clientCredentials") {
      throw new AuthenticationError("refreshToken() requires clientCredentials auth configured", 401);
    }
    const { clientKey, clientSecret } = this.config.auth;
    const url = `${this.config.baseUrl}/auth/${this.config.version}/token`;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientKey,
      client_secret: clientSecret,
    });

    const res = await this.config.customFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.config.userAgent,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => undefined) as Record<string, unknown> | undefined;
      throw new AuthenticationError(
        (errBody?.["message"] as string | undefined) ?? `Token refresh failed: ${res.status}`,
        res.status,
        errBody,
      );
    }

    return res.json() as Promise<AuthCodeTokenResponse>;
  }
}
