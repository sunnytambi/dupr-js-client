export { DuprClient } from "./client.js";
export { AuthModule } from "./auth.js";
export type { AuthCodeTokenResponse, AuthorizationUrlParams, SsoTokenResponse } from "./auth.js";
export { UsersModule } from "./resources/users.js";
export { PlayersModule } from "./resources/players.js";
export { PlayerRatingModule } from "./resources/playerRating.js";
export { MatchesModule } from "./resources/matches.js";
export { ClubsModule } from "./resources/clubs.js";
export { EventsModule } from "./resources/events.js";
export { WebhooksModule } from "./resources/webhooks.js";

export {
  DuprApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";

export type {
  DuprClientOptions,
  AuthMode,
  RetryOptions,
  ResolvedConfig,
  ResolvedRetryOptions,
  RequestInfo,
  ResponseInfo,
} from "./config.js";

export type {
  // Shared
  MatchFormat,
  MatchSource,
  MatchType,
  MatchCompletionType,
  MatchPlayType,
  Gender,
  RatingType,
  WebhookTopic,
  ApiStatus,
  ApiWrapper,
  TokenResponse,
  // Users
  UserInfo,
  ExtendedUserInfo,
  ClubMembership,
  ClubMembershipResponse,
  UserClubMembership,
  UserClubMembershipResponse,
  ExternalSearchRequest,
  ExternalSearchFilter,
  ExternalFilterLocation,
  ExternalRatingFilter,
  ExternalAgeRangeFilter,
  ExternalBatchUserDetailRequest,
  ExternalInviteRequest,
  // Provisional ratings
  RatingCoach,
  GetProvisionalRatingRequest,
  CreateProvisionalRatingRequest,
  UpdateProvisionalRatingRequest,
  DeleteProvisionalRatingRequest,
  // Matches
  ExternalMatchTeam,
  ExternalMatchRequest,
  ExternalUpdateMatchRequest,
  ExternalDeleteMatchRequest,
  ExternalMatchSearchRequest,
  MatchResponse,
  // Subscriptions
  PlayerRatingSubscribeRequest,
  GrantExternalSubscriptionRequest,
  TargetUserRequest,
  SubscriptionItemRequest,
  AttributionRequest,
  // Clubs
  ExternalClubMemberRequest,
  ExternalClubMatchSearchRequest,
  // Events
  CreateEventRequestV1,
  UpdateEventRequestV1,
  GetEventRequestV1,
  DeleteEventRequestV1,
  CreateEventResponseV1,
  UpdateEventResponseV1,
  GetEventResponseV1,
  DeleteEventResponseV1,
  // Webhooks
  ClientHookRequest,
  UserWebhookRequest,
  WebhookSchema,
} from "./types.js";
