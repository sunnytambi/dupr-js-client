import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import { ApiWrapper } from "../types.js";

export interface GetDuprIdByEmailRequest {
  email: string;
}

export interface DuprIdByEmailResponse {
  duprId?: string;
}

export class PlayersModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** POST /{version}/player/duprid-by-email — resolve a DUPR ID from an email address */
  getDuprIdByEmail(req: GetDuprIdByEmailRequest): Promise<ApiWrapper<DuprIdByEmailResponse>> {
    return this.http.post(`/${this.cfg.version}/player/duprid-by-email`, req);
  }
}
