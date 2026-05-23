import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE "fork_person_meta" (
      "personId" uuid NOT NULL,
      "note" text DEFAULT NULL,
      CONSTRAINT "PK_fork_person_meta" PRIMARY KEY ("personId"),
      CONSTRAINT "FK_fork_person_meta_person" FOREIGN KEY ("personId")
        REFERENCES "person" ("id") ON UPDATE CASCADE ON DELETE CASCADE
    )
  `.execute(db);

  await sql`
    CREATE TABLE "fork_tag_person" (
      "personId" uuid NOT NULL,
      "tagId"    uuid NOT NULL,
      CONSTRAINT "PK_fork_tag_person" PRIMARY KEY ("personId", "tagId"),
      CONSTRAINT "FK_fork_tag_person_person" FOREIGN KEY ("personId")
        REFERENCES "person" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT "FK_fork_tag_person_tag" FOREIGN KEY ("tagId")
        REFERENCES "tag" ("id") ON UPDATE CASCADE ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX "IDX_fork_tag_person_person_id" ON "fork_tag_person" ("personId")`.execute(db);
  await sql`CREATE INDEX "IDX_fork_tag_person_tag_id"    ON "fork_tag_person" ("tagId")`.execute(db);
  await sql`CREATE INDEX "IDX_fork_tag_person_composite"  ON "fork_tag_person" ("personId", "tagId")`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS "fork_tag_person"`.execute(db);
  await sql`DROP TABLE IF EXISTS "fork_person_meta"`.execute(db);
}
