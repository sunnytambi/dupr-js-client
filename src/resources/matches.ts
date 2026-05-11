import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import {
  ApiWrapper,
  ExternalDeleteMatchRequest,
  ExternalMatchRequest,
  ExternalMatchSearchRequest,
  ExternalUpdateMatchRequest,
  MatchResponse,
} from "../types.js";

export interface AnnotateMatchRequest {
  matchId: string;
  annotation: Record<string, unknown>;
}

export class MatchesModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** GET /match/{version}/{id} — view a single match */
  get(matchId: string): Promise<ApiWrapper<MatchResponse>> {
    return this.http.get(`/match/${this.cfg.version}/${encodeURIComponent(matchId)}`);
  }

  /** POST /match/{version}/create — submit a new match result */
  create(match: ExternalMatchRequest): Promise<ApiWrapper<MatchResponse>> {
    return this.http.post(`/match/${this.cfg.version}/create`, match);
  }

  /** POST /match/{version}/batch — submit multiple match results in one call */
  createBulk(matches: ExternalMatchRequest[]): Promise<ApiWrapper<MatchResponse[]>> {
    return this.http.post(`/match/${this.cfg.version}/batch`, matches);
  }

  /** POST /match/{version}/update — update an existing match */
  update(req: ExternalUpdateMatchRequest): Promise<ApiWrapper<MatchResponse>> {
    return this.http.post(`/match/${this.cfg.version}/update`, req);
  }

  /** DELETE /match/{version}/delete — delete a match */
  delete(req: ExternalDeleteMatchRequest): Promise<ApiWrapper> {
    return this.http.delete(`/match/${this.cfg.version}/delete`, req);
  }

  /** POST /match/{version}/annotate — attach vendor-specific metadata to a match */
  annotate(req: AnnotateMatchRequest): Promise<ApiWrapper> {
    return this.http.post(`/match/${this.cfg.version}/annotate`, req);
  }

  /** DELETE /match/{version}/annotate/{matchId} — remove a match annotation */
  deleteAnnotation(matchId: string): Promise<ApiWrapper> {
    return this.http.delete(`/match/${this.cfg.version}/annotate/${encodeURIComponent(matchId)}`);
  }

  /** POST /match/history/search — search a player's match history */
  searchHistory(req: ExternalMatchSearchRequest): Promise<ApiWrapper<MatchResponse[]>> {
    return this.http.post(`/match/history/search`, req);
  }
}
