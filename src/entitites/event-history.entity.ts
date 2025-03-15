import { Entity, PrimaryKey, Property } from "@mikro-orm/postgresql";
import { type PartiallyRequired } from "../common/types.js";
import { randomUUID } from "node:crypto";
import { setDefault } from "../common/utils.js";

@Entity({ tableName: 'events_history' })
export class EventsHistoryEntity {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id: string;

  @Property({ type: 'varchar', unique: true })
  eventHash: string;

  constructor(data: PartiallyRequired<EventsHistoryEntity, 'eventHash'>) {
    this.id = setDefault(data.id, randomUUID());
    this.eventHash = data.eventHash;
  }
}
