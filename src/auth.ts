import { HttpClient } from "./http.js";
import { ResolvedConfig } from "./config.js";
import { AuthenticationError } from "./errors.js";
import { TokenResponse } from "./types.js";

export interface AuthCodeTokenResponse extends TokenResponse {
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

export interface AuthorizationUrlParams {
  /** Your OAuth redirect URI, must match what is registered with DUPR. */
  redirectUri: string;
  /** OAuth scopes to request (e.g. ["user.read"]). Defaults to empty. */
  scopes?: string[];
  /** Opaque value passed through the flow to prevent CSRF. Recommended. */
  state?: string;
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

  /**
   * Build the DUPR authorization URL to redirect the user to for login.
   * The `authorizationUrl` config option must be set (see above note).
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): string {
    const authUrl = (this.config as ResolvedConfig & { authorizationUrl?: string }).authorizationUrl;
    if (!authUrl) {
      throw new Error(
        "authorizationUrl is not configured. Pass it in DuprClientOptions to use the Authorization Code flow.",
      );
    }
    const url = new URL(authUrl);
    const clientId = this.config.auth.type === "clientCredentials" ? this.config.auth.clientKey : "";
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    if (params.scopes?.length) url.searchParams.set("scope", params.scopes.join(" "));
    if (params.state) url.searchParams.set("state", params.state);
    return url.toString();
  }

  /**
   * Exchange an authorization code (from the OAuth callback) for access + refresh tokens.
   * Uses `POST /auth/{version}/token` with `grant_type=authorization_code`.
   */
  async exchangeCode(params: {
    code: string;
    redirectUri: string;
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
