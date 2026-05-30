/**
 * DUPR dashboard base URLs for UAT and production environments.
 * Use these when constructing links to the DUPR member-facing dashboard.
 */
export const DUPR_DASHBOARD_BASE_URLS = {
  uat: 'https://uat.dupr.gg',
  production: 'https://dashboard.dupr.com',
} as const;

/**
 * Build a deep link to a DUPR club's dashboard page.
 *
 * @param clubId - The DUPR club ID (string or numeric — both accepted).
 * @param baseUrl - DUPR dashboard base URL (use {@link DUPR_DASHBOARD_BASE_URLS}).
 */
export function getDuprClubDashboardUrl(clubId: string | number, baseUrl: string): string {
  return `${baseUrl}/dashboard/browse/clubs/${clubId}`;
}

// ─── Club registration form ───────────────────────────────────────────────────

/** The Monday.com form URL DUPR uses for club / association registration applications. */
export const CLUB_REGISTRATION_FORM_URL =
  'https://forms.monday.com/forms/8a84c380b2eb4f7552401ed59b199f5d';

/**
 * Monday.com form option IDs for US states / territories.
 * The value `1` (used as the fallback) maps to INTERNATIONAL.
 */
export const US_STATE_FORM_IDS: Record<string, number> = {
  Alabama: 2,
  Alaska: 3,
  Arizona: 4,
  Arkansas: 5,
  California: 6,
  Colorado: 7,
  Connecticut: 8,
  Delaware: 9,
  'District of Columbia': 10,
  Florida: 11,
  Georgia: 12,
  Hawaii: 13,
  Idaho: 14,
  Illinois: 15,
  Indiana: 16,
  Iowa: 17,
  Kansas: 18,
  Kentucky: 19,
  Louisiana: 20,
  Maine: 21,
  Maryland: 22,
  Massachusetts: 23,
  Michigan: 24,
  Minnesota: 25,
  Mississippi: 26,
  Missouri: 27,
  Montana: 28,
  Nebraska: 29,
  Nevada: 30,
  'New Hampshire': 31,
  'New Jersey': 32,
  'New Mexico': 33,
  'New York': 34,
  'North Carolina': 35,
  'North Dakota': 36,
  Ohio: 37,
  Oklahoma: 38,
  Oregon: 39,
  Pennsylvania: 40,
  'Rhode Island': 41,
  'South Carolina': 42,
  'South Dakota': 43,
  Tennessee: 44,
  Texas: 45,
  Utah: 46,
  Vermont: 47,
  Virginia: 48,
  Washington: 49,
  'West Virginia': 50,
  Wisconsin: 52,
  Wyoming: 53,
};

/** Parameters for {@link buildClubRegistrationFormUrl}. */
export interface ClubRegistrationFormParams {
  /** Applicant's full display name. */
  userName: string;
  /** Applicant's DUPR ID. */
  duprId: string;
  /** Applicant's email address. */
  email: string;
  /** Name of the group or club being registered. */
  groupName: string;
  /** Current member count. */
  memberCount: number;
  streetAddress?: string | null;
  city?: string | null;
  /**
   * US state name (e.g. `"California"`). Mapped to the Monday.com form option ID via
   * {@link US_STATE_FORM_IDS}. Only used when `country === "United States"`.
   */
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  /**
   * How the applicant heard about DUPR — pre-fills the "How did you hear about us?" field.
   * Defaults to `"DUPR Partner App"`.
   */
  referralSource?: string;
  /**
   * Additional context pre-filled in the form's long-text field.
   * Defaults to a generic "we want to submit matches to DUPR" message.
   */
  additionalInfo?: string;
}

function resolveStateFormId(
  state: string | null | undefined,
  country: string | null | undefined,
): string {
  if (!country || country !== 'United States') return '1'; // INTERNATIONAL
  return String(US_STATE_FORM_IDS[state ?? ''] ?? 1);
}

/**
 * Build a pre-filled DUPR club registration form URL (Monday.com).
 * Opens the DUPR club application form with the provided details already filled in.
 */
export function buildClubRegistrationFormUrl(params: ClubRegistrationFormParams): string {
  const url = new URL(CLUB_REGISTRATION_FORM_URL);
  url.searchParams.set('r', 'use1');
  url.searchParams.set('short_text', params.userName);
  url.searchParams.set('text49', params.duprId);
  url.searchParams.set('short_text8', params.streetAddress ?? '');
  url.searchParams.set('dup__of_location72', params.city ?? '');
  url.searchParams.set('short_text98__1', params.zip ?? '');
  url.searchParams.set('country', params.country ?? '');
  url.searchParams.set('multi_select3', resolveStateFormId(params.state, params.country));
  url.searchParams.set('dup__of_email2', params.email);
  url.searchParams.set('name', params.groupName);
  url.searchParams.set('numbers7', String(params.memberCount));
  url.searchParams.set('dup__of_facility', '0');  // Club Type = Group / Association
  url.searchParams.set('multi_select6', '1');      // Communication = Email
  url.searchParams.set('multi_select', '19');      // Intent = Add matches
  url.searchParams.set(
    'text9',
    params.referralSource ?? 'DUPR Partner App',
  );
  url.searchParams.set(
    'long_text2',
    params.additionalInfo ??
      'We want to submit our matches to DUPR. Let me know if any other information is needed.',
  );
  return url.toString();
}
