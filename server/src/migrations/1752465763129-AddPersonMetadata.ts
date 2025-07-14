import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add description field to person table
  await db.schema
    .alterTable('person')
    .addColumn('description', 'text', (col) => col.notNull().defaultTo(''))
    .execute();

  // Create person_tag table for many-to-many relationship between persons and tags
  await db.schema
    .createTable('person_tag')
    .addColumn('personId', 'uuid', (col) => col.notNull())
    .addColumn('tagId', 'uuid', (col) => col.notNull())
    .addPrimaryKeyConstraint('PK_person_tag', ['personId', 'tagId'])
    .addForeignKeyConstraint('FK_person_tag_person', ['personId'], 'person', ['id'], (cb) =>
      cb.onDelete('cascade').onUpdate('cascade')
    )
    .addForeignKeyConstraint('FK_person_tag_tag', ['tagId'], 'tags', ['id'], (cb) =>
      cb.onDelete('cascade').onUpdate('cascade')
    )
    .execute();

  // Add indexes for performance
  await db.schema
    .createIndex('IDX_person_tag_personId')
    .on('person_tag')
    .column('personId')
    .execute();

  await db.schema
    .createIndex('IDX_person_tag_tagId')
    .on('person_tag')
    .column('tagId')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes
  await db.schema.dropIndex('IDX_person_tag_tagId').execute();
  await db.schema.dropIndex('IDX_person_tag_personId').execute();

  // Drop person_tag table
  await db.schema.dropTable('person_tag').execute();

  // Remove description column from person table
  await db.schema.alterTable('person').dropColumn('description').execute();
}
