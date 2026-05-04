import { DuprClientOptions, ResolvedConfig, resolveConfig } from "./config.js";
import { HttpClient } from "./http.js";
import { AuthModule } from "./auth.js";
import { UsersModule } from "./resources/users.js";
import { PlayersModule } from "./resources/players.js";
import { PlayerRatingModule } from "./resources/playerRating.js";
import { MatchesModule } from "./resources/matches.js";
import { ClubsModule } from "./resources/clubs.js";
import { EventsModule } from "./resources/events.js";
import { WebhooksModule } from "./resources/webhooks.js";

export class DuprClient {
  readonly config: ResolvedConfig;
  readonly auth: AuthModule;
  readonly users: UsersModule;
  readonly players: PlayersModule;
  readonly playerRating: PlayerRatingModule;
  readonly matches: MatchesModule;
  readonly clubs: ClubsModule;
  readonly events: EventsModule;
  readonly webhooks: WebhooksModule;

  constructor(opts: DuprClientOptions = {}) {
    this.config = resolveConfig(opts);
    const http = new HttpClient(this.config);
    this.auth = new AuthModule(http, this.config);
    this.users = new UsersModule(http, this.config);
    this.players = new PlayersModule(http, this.config);
    this.playerRating = new PlayerRatingModule(http, this.config);
    this.matches = new MatchesModule(http, this.config);
    this.clubs = new ClubsModule(http, this.config);
    this.events = new EventsModule(http, this.config);
    this.webhooks = new WebhooksModule(http, this.config);
  }

  /** Override the bearer token at runtime — useful when your backend handles auth separately. */
  setBearerToken(token: string): void {
    this.config.overrideBearerToken = token;
  }

  /** Clear the runtime bearer token override and fall back to configured auth. */
  clearBearerToken(): void {
    delete this.config.overrideBearerToken;
  }
}
