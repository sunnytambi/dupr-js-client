export class DuprApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
    public readonly duprRequestId?: string,
  ) {
    super(message);
    this.name = "DuprApiError";
    // Maintain proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends DuprApiError {
  constructor(message: string, statusCode: number, details?: unknown, duprRequestId?: string) {
    super(message, statusCode, details, duprRequestId);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DuprApiError {
  constructor(message: string, statusCode: number, details?: unknown, duprRequestId?: string) {
    super(message, statusCode, details, duprRequestId);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DuprApiError {
  constructor(message: string, statusCode: number, details?: unknown, duprRequestId?: string) {
    super(message, statusCode, details, duprRequestId);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends DuprApiError {
  constructor(message: string, statusCode: number, details?: unknown, duprRequestId?: string) {
    super(message, statusCode, details, duprRequestId);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServerError extends DuprApiError {
  constructor(message: string, statusCode: number, details?: unknown, duprRequestId?: string) {
    super(message, statusCode, details, duprRequestId);
    this.name = "ServerError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function buildError(res: Response): Promise<DuprApiError> {
  let body: unknown;
  const requestId = res.headers.get("x-request-id") ?? res.headers.get("x-dupr-request-id") ?? undefined;

  try {
    body = await res.json();
  } catch {
    // non-JSON body — leave body undefined
  }

  const msg =
    (typeof body === "object" && body !== null && "message" in body && typeof (body as Record<string, unknown>)["message"] === "string"
      ? (body as Record<string, unknown>)["message"] as string
      : null) ??
    `DUPR API error ${res.status}`;

  switch (true) {
    case res.status === 401 || res.status === 403:
      return new AuthenticationError(msg, res.status, body, requestId);
    case res.status === 404:
      return new NotFoundError(msg, res.status, body, requestId);
    case res.status === 400:
      return new ValidationError(msg, res.status, body, requestId);
    case res.status === 429:
      return new RateLimitError(msg, res.status, body, requestId);
    case res.status >= 500:
      return new ServerError(msg, res.status, body, requestId);
    default:
      return new DuprApiError(msg, res.status, body, requestId);
  }
}
