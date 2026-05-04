import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import {
  ApiWrapper,
  ExternalClubMemberRequest,
  ExternalClubMatchSearchRequest,
  MatchResponse,
  UserInfo,
} from "../types.js";

export class ClubsModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** POST /club/{version}/members — get ratings for all members of a club */
  membersRating(req: ExternalClubMemberRequest): Promise<ApiWrapper<UserInfo[]>> {
    return this.http.post(`/club/${this.cfg.version}/members`, req);
  }

  /** POST /club/{version}/match/search — search matches associated with a club */
  searchMatches(req: ExternalClubMatchSearchRequest): Promise<ApiWrapper<MatchResponse[]>> {
    return this.http.post(`/club/${this.cfg.version}/match/search`, req);
  }
}
