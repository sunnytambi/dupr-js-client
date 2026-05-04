import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import { ApiWrapper, PlayerRatingSubscribeRequest } from "../types.js";

export interface PlayerRatingHistoryRequest {
  duprId: string;
  offset?: number;
  limit?: number;
}

export interface PlayerRatingHistoryEntry {
  date?: string;
  singlesRating?: number;
  doublesRating?: number;
}

export class PlayerRatingModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** POST /history — get rating history for a player */
  getHistory(req: PlayerRatingHistoryRequest): Promise<ApiWrapper<PlayerRatingHistoryEntry[]>> {
    return this.http.post(`/history`, req);
  }

  /** GET /{version}/subscribe/rating-changes — list currently subscribed DUPR IDs */
  getSubscriptions(): Promise<ApiWrapper<{ duprIds: string[] }>> {
    return this.http.get(`/${this.cfg.version}/subscribe/rating-changes`);
  }

  /** POST /{version}/subscribe/rating-changes — subscribe to rating-change events for a list of players */
  subscribe(req: PlayerRatingSubscribeRequest): Promise<ApiWrapper> {
    return this.http.post(`/${this.cfg.version}/subscribe/rating-changes`, req);
  }

  /** DELETE /{version}/subscribe/rating-changes — unsubscribe from rating-change events */
  unsubscribe(req: PlayerRatingSubscribeRequest): Promise<ApiWrapper> {
    return this.http.delete(`/${this.cfg.version}/subscribe/rating-changes`, req);
  }
}
