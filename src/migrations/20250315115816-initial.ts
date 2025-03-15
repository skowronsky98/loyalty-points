import { Migration } from '@mikro-orm/migrations';

export class Migration20250315115816 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "events_history" ("id" uuid not null default gen_random_uuid(), "event_hash" varchar(255) not null, constraint "events_history_pkey" primary key ("id"));`);
    this.addSql(`alter table "events_history" add constraint "events_history_event_hash_unique" unique ("event_hash");`);

    this.addSql(`create table "loyalty_points_dept" ("customer_id" uuid not null, "points" int not null, constraint "loyalty_points_dept_pkey" primary key ("customer_id"));`);

    this.addSql(`create table "loyalty_points" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz(3) not null default now(), "expires_at" timestamptz(3) not null, "customer_id" uuid not null, "order_id" uuid not null, "points_from_order" int not null, "available_points" int not null, "is_cancelled" boolean not null default false, constraint "loyalty_points_pkey" primary key ("id"));`);
    this.addSql(`create index "loyalty_points_customer_id_index" on "loyalty_points" ("customer_id");`);
  }

}
