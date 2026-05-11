import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import {
  ApiWrapper,
  ClubMembershipResponse,
  CreateProvisionalRatingRequest,
  DeleteProvisionalRatingRequest,
  ExtendedUserInfo,
  ExternalBatchUserDetailRequest,
  ExternalInviteRequest,
  ExternalSearchRequest,
  GetProvisionalRatingRequest,
  GrantExternalSubscriptionRequest,
  UpdateProvisionalRatingRequest,
  UserInfo,
} from "../types.js";

export class UsersModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** GET /user/{version}/{id} — basic player profile */
  getUser(duprId: string): Promise<ApiWrapper<UserInfo>> {
    return this.http.get(`/user/${this.cfg.version}/${encodeURIComponent(duprId)}`);
  }

  /** GET /user/{version}/{id}/details — extended profile (requires USER_EMAIL::VIEW permission) */
  getExtendedUser(duprId: string): Promise<ApiWrapper<ExtendedUserInfo>> {
    return this.http.get(`/user/${this.cfg.version}/${encodeURIComponent(duprId)}/details`);
  }

  /** GET /user/{version}/{id}/clubs — club memberships for a player */
  getClubMemberships(duprId: string): Promise<ClubMembershipResponse> {
    return this.http.get(`/user/${this.cfg.version}/${encodeURIComponent(duprId)}/clubs`);
  }

  /** POST /user/{version}/search — full-text player search with optional filters */
  search(req: ExternalSearchRequest): Promise<ApiWrapper<UserInfo[]>> {
    return this.http.post(`/user/${this.cfg.version}/search`, req);
  }

  /** POST /user/{version}/batch — fetch multiple players by DUPR ID in one request */
  getBatch(req: ExternalBatchUserDetailRequest): Promise<ApiWrapper<UserInfo[]>> {
    return this.http.post(`/user/${this.cfg.version}/batch`, req);
  }

  /** POST /user/{version}/invite — pre-generate a DUPR ID and send an invite email */
  invite(req: ExternalInviteRequest): Promise<ApiWrapper<{ duprId: string }>> {
    return this.http.post(`/user/${this.cfg.version}/invite`, req);
  }

  /** POST /user/{version}/subscription/grants — grant a subscription to a user */
  grantSubscription(req: GrantExternalSubscriptionRequest): Promise<ApiWrapper> {
    return this.http.post(`/user/${this.cfg.version}/subscription/grants`, req);
  }

  // ── Provisional ratings ──────────────────────────────────────

  /** POST /user/{version}/provisional_rating — get provisional ratings for a player */
  getProvisionalRating(req: GetProvisionalRatingRequest): Promise<ApiWrapper> {
    return this.http.post(`/user/${this.cfg.version}/provisional_rating`, req);
  }

  /** POST /user/{version}/provisional_rating/create */
  createProvisionalRating(req: CreateProvisionalRatingRequest): Promise<ApiWrapper> {
    return this.http.post(`/user/${this.cfg.version}/provisional_rating/create`, req);
  }

  /** POST /user/{version}/provisional_rating/update */
  updateProvisionalRating(req: UpdateProvisionalRatingRequest): Promise<ApiWrapper> {
    return this.http.post(`/user/${this.cfg.version}/provisional_rating/update`, req);
  }

  /** DELETE /user/{version}/provisional_rating/delete */
  deleteProvisionalRating(req: DeleteProvisionalRatingRequest): Promise<ApiWrapper> {
    return this.http.delete(`/user/${this.cfg.version}/provisional_rating/delete`, req);
  }
}
