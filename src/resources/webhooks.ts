import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import { ApiWrapper, ClientHookRequest, UserWebhookRequest, WebhookSchema } from "../types.js";

export class WebhooksModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** POST /{version}/webhook — register a webhook endpoint */
  register(req: ClientHookRequest): Promise<ApiWrapper> {
    return this.http.post(`/${this.cfg.version}/webhook`, req);
  }

  /** GET /{version}/topic — list all available webhook topics */
  getTopics(): Promise<ApiWrapper<string[]>> {
    return this.http.get(`/${this.cfg.version}/topic`);
  }

  /** GET /{version}/webhook/schema — list available webhook schemas */
  listSchemas(): Promise<ApiWrapper<WebhookSchema[]>> {
    return this.http.get(`/${this.cfg.version}/webhook/schema`);
  }

  /** GET /{version}/webhook/schema/{topic} — get the JSON schema for a specific topic */
  getSchema(topic: string): Promise<ApiWrapper<WebhookSchema>> {
    return this.http.get(`/${this.cfg.version}/webhook/schema/${topic}`);
  }

  /** POST /user/{version}/subscribe/webhook-event — subscribe specific users to a webhook topic */
  subscribeUsers(req: UserWebhookRequest): Promise<ApiWrapper> {
    return this.http.post(`/user/${this.cfg.version}/subscribe/webhook-event`, req);
  }

  /** DELETE /user/{version}/subscribe/webhook-event — unsubscribe specific users from a webhook topic */
  unsubscribeUsers(req: UserWebhookRequest): Promise<ApiWrapper> {
    return this.http.delete(`/user/${this.cfg.version}/subscribe/webhook-event`, req);
  }
}
