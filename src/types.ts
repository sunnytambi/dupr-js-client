// Hand-rolled types from DUPR Partner APIs OpenAPI 3.1.0 spec.
// Run `npm run types:generate` to regenerate from the live spec.

// ──────────────────────────────────────────────────────────────
// Shared / primitive
// ──────────────────────────────────────────────────────────────

export type MatchFormat = "SINGLES" | "DOUBLES";
export type MatchSource = "DUPR" | "LEAGUE" | "PARTNER" | "CLUB";
export type MatchType = "RALLY" | "SIDEOUT";
export type MatchCompletionType = "FORFEIT" | "WITHDRAWAL" | "RETIREMENT" | "COMPLETED" | "UNKNOWN";
export type MatchPlayType = "RECREATIONAL" | "TOURNAMENT" | "LEAGUE" | "INFORMATIONAL" | "UNKNOWN";
export type Gender = "MALE" | "FEMALE";
export type RatingType = "SINGLES" | "DOUBLES";
export type WebhookTopic = "RATING";
export type ApiStatus = "SUCCESS" | "FAILURE" | "REDIRECT" | "PARTIAL";

// ──────────────────────────────────────────────────────────────
// Common wrappers
// ──────────────────────────────────────────────────────────────

export interface ApiWrapper<T = unknown> {
  status: ApiStatus;
  message?: string;
  result?: T;
}

// ──────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────

export interface TokenResponse {
  /** Flat format (some DUPR environments return the token directly at the top level). */
  token?: string;
  accessToken?: string;
  expiresIn?: number;
  /** Wrapped format — the Partner API auth endpoint returns { status, result: { token, expiry } }. */
  result?: {
    token?: string;
    expiry?: string; // ISO datetime
  };
}

// ──────────────────────────────────────────────────────────────
// User
// ──────────────────────────────────────────────────────────────

export interface UserInfo {
  duprId: string;
  fullName: string;
  singlesRating?: number;
  doublesRating?: number;
  singlesProvisional?: boolean;
  doublesProvisional?: boolean;
}

export interface ExtendedUserInfo extends UserInfo {
  email?: string;
}

export interface ClubMembership {
  clubId: string;
  clubName: string;
  role: string;
}

export interface ClubMembershipResult {
  clubs: ClubMembership[];
}

export type ClubMembershipResponse = ApiWrapper<ClubMembershipResult>;

export interface ExternalSearchFilter {
  gender?: Gender;
  location?: ExternalFilterLocation;
  rating?: ExternalRatingFilter;
  age?: ExternalAgeRangeFilter;
}

export interface ExternalFilterLocation {
  lat: number;
  lng: number;
  address?: string;
  radiusInMeters?: number;
}

export interface ExternalRatingFilter {
  min?: number;
  max?: number;
  type?: RatingType;
  reliable?: boolean;
}

export interface ExternalAgeRangeFilter {
  min?: number;
  max?: number;
}

export interface ExternalSearchRequest {
  query: string;
  offset: number;
  limit: number;
  filters?: ExternalSearchFilter;
}

export interface ExternalBatchUserDetailRequest {
  duprIds: string[];
}

export interface ExternalInviteRequest {
  firstName: string;
  lastName: string;
  email: string;
}

// ──────────────────────────────────────────────────────────────
// Provisional ratings
// ──────────────────────────────────────────────────────────────

export interface RatingCoach {
  id: string;
  metadata: Record<string, string>;
}

export interface GetProvisionalRatingRequest {
  duprId: string;
}

export interface CreateProvisionalRatingRequest {
  duprId: string;
  provisionalSinglesRating?: number;
  provisionalDoublesRating?: number;
  coach?: RatingCoach;
}

export interface UpdateProvisionalRatingRequest {
  duprId: string;
  provisionalSinglesRating?: number;
  provisionalDoublesRating?: number;
}

export interface DeleteProvisionalRatingRequest {
  duprId: string;
}

// ──────────────────────────────────────────────────────────────
// Matches
// ──────────────────────────────────────────────────────────────

export interface ExternalMatchTeam {
  /** DUPR ID of player 1. Required for both SINGLES and DOUBLES. */
  player1: string;
  /** DUPR ID of player 2. Required for DOUBLES; omit for SINGLES. */
  player2?: string;
  game1: number;
  game2?: number;
  game3?: number;
  game4?: number;
  game5?: number;
}

export interface ExternalMatchRequest {
  /** Universally unique identifier for this match — must never be reused. */
  identifier: string;
  /** yyyy-MM-dd (ISO 8601 date). */
  matchDate: string;
  /** Match format: SINGLES or DOUBLES. Required. */
  format: MatchFormat;
  teamA: ExternalMatchTeam;
  teamB: ExternalMatchTeam;
  /** Event name in which this match was played. Required. */
  event: string;
  /** RALLY or SIDEOUT scoring format. */
  matchType?: MatchType;
  /** Source of the match. */
  matchSource?: MatchSource;
  /** Display-only location string. */
  location?: string;
  /** Display-only bracket name. */
  bracket?: string;
  /** DUPR Club unique identifier. Required when matchSource is CLUB. */
  clubId?: number;
  /** Optional key-value metadata. */
  extras?: Record<string, string>;
  matchCompletionType?: MatchCompletionType;
  matchPlayType?: MatchPlayType;
}

export interface ExternalUpdateMatchRequest {
  /** DUPR internal match ID returned in the create response. Required. */
  matchId: number;
  /** Universally unique identifier for this match. */
  identifier?: string;
  /** yyyy-MM-dd (ISO 8601 date). */
  matchDate?: string;
  /** Match format: SINGLES or DOUBLES. */
  format?: MatchFormat;
  teamA?: ExternalMatchTeam;
  teamB?: ExternalMatchTeam;
  /** Event name in which this match was played. */
  event?: string;
  /** RALLY or SIDEOUT scoring format. */
  matchType?: MatchType;
  /** Source of the match. */
  matchSource?: MatchSource;
  /** Display-only location string. */
  location?: string;
  /** Display-only bracket name. */
  bracket?: string;
  /** DUPR Club unique identifier. */
  clubId?: number;
  /** Optional key-value metadata. */
  extras?: Record<string, string>;
  matchCompletionType?: MatchCompletionType;
  matchPlayType?: MatchPlayType;
}

export interface ExternalDeleteMatchRequest {
  matchCode: string;
  identifier: string;
}

export interface ExternalMatchSearchRequest {
  duprId: string;
  offset?: number;
  limit?: number;
}

export interface MatchResponse {
  matchCode?: string;
  hashedMatchCode?: string;
  identifier?: string;
  matchDate?: string;
  matchFormat?: MatchFormat;
  teams?: ExternalMatchTeam[];
}

// ──────────────────────────────────────────────────────────────
// Player ratings / subscriptions
// ──────────────────────────────────────────────────────────────

export interface SubscriptionItemRequest {
  productId: string;
  promotionId: string;
}

export interface TargetUserRequest {
  duprId?: string;
  email?: string;
}

export interface AttributionRequest {
  clientKeyId: number;
}

export interface GrantExternalSubscriptionRequest {
  user: TargetUserRequest;
  item: SubscriptionItemRequest;
  attribution: AttributionRequest;
  metadata?: Record<string, string>;
}

export interface PlayerRatingSubscribeRequest {
  duprIds: string[];
}

// ──────────────────────────────────────────────────────────────
// Clubs
// ──────────────────────────────────────────────────────────────

export interface ExternalClubMemberRequest {
  clubId: string;
}

export interface ExternalClubMatchSearchRequest {
  clubId: string;
  offset?: number;
  limit?: number;
}

// ──────────────────────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────────────────────

export interface CreateEventRequestV1 {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  clubId?: number;
}

export interface UpdateEventRequestV1 {
  eventId: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetEventRequestV1 {
  eventIds: string[];
}

export interface DeleteEventRequestV1 {
  eventIds: string[];
}

export interface CreateEventResponseV1 {
  eventId?: string;
  name?: string;
}

export interface UpdateEventResponseV1 {
  eventId?: string;
}

export interface GetEventResponseV1 {
  events?: Array<{
    eventId: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
  }>;
}

export interface DeleteEventResponseV1 {
  deleted?: string[];
}

// ──────────────────────────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────────────────────────

export interface ClientHookRequest {
  webhookUrl: string;
  topics: WebhookTopic[];
}

export interface UserWebhookRequest {
  duprIds: string[];
  topic: WebhookTopic;
}

export interface WebhookSchema {
  topic: string;
  schema: Record<string, unknown>;
}
