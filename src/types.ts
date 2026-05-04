// Hand-rolled types from DUPR Partner APIs OpenAPI 3.1.0 spec.
// Run `npm run types:generate` to regenerate from the live spec.

// ──────────────────────────────────────────────────────────────
// Shared / primitive
// ──────────────────────────────────────────────────────────────

export type MatchFormat = "SINGLES" | "DOUBLES";
export type MatchSource = "PARTNER" | "CLUB";
export type Gender = "MALE" | "FEMALE";
export type RatingType = "SINGLES" | "DOUBLES";
export type WebhookTopic = "RATING";
export type ApiStatus = "SUCCESS" | "FAILURE";

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
  token?: string;
  accessToken?: string;
  expiresIn?: number;
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

export interface ExternalMatchPlayer {
  duprId: string;
}

export interface ExternalMatchTeam {
  /** 1 player for SINGLES, 2 for DOUBLES */
  players: ExternalMatchPlayer[];
  /** Scores per game, aligned with the opposing team's scores array */
  scores: number[];
}

export interface ExternalMatchRequest {
  /** Your universally unique identifier — must not be reused across matches */
  identifier: string;
  /** yyyy-MM-dd */
  matchDate: string;
  matchFormat: MatchFormat;
  teams: [ExternalMatchTeam, ExternalMatchTeam];
  source: MatchSource;
  eventId?: number;
  clubId?: number;
}

export interface ExternalUpdateMatchRequest {
  matchId: string;
  matchDate?: string;
  teams?: [ExternalMatchTeam, ExternalMatchTeam];
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
