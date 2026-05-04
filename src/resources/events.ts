import { HttpClient } from "../http.js";
import { ResolvedConfig } from "../config.js";
import {
  ApiWrapper,
  CreateEventRequestV1,
  CreateEventResponseV1,
  DeleteEventRequestV1,
  DeleteEventResponseV1,
  GetEventRequestV1,
  GetEventResponseV1,
  UpdateEventRequestV1,
  UpdateEventResponseV1,
} from "../types.js";

export class EventsModule {
  constructor(
    private readonly http: HttpClient,
    private readonly cfg: ResolvedConfig,
  ) {}

  /** POST /events/{version}/create */
  create(req: CreateEventRequestV1): Promise<ApiWrapper<CreateEventResponseV1>> {
    return this.http.post(`/events/${this.cfg.version}/create`, req);
  }

  /** GET /events/{version}/get */
  get(req: GetEventRequestV1): Promise<ApiWrapper<GetEventResponseV1>> {
    return this.http.post(`/events/${this.cfg.version}/get`, req);
  }

  /** POST /events/{version}/update */
  update(req: UpdateEventRequestV1): Promise<ApiWrapper<UpdateEventResponseV1>> {
    return this.http.post(`/events/${this.cfg.version}/update`, req);
  }

  /** POST /events/{version}/delete */
  delete(req: DeleteEventRequestV1): Promise<ApiWrapper<DeleteEventResponseV1>> {
    return this.http.post(`/events/${this.cfg.version}/delete`, req);
  }
}
