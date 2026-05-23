import { Selectable } from 'kysely';
import { ForkPersonMetaTable } from 'src/schema/tables/fork-person-meta.table';
import { ForkTagPersonTable } from 'src/schema/tables/fork-tag-person.table';

declare module 'src/schema' {
  interface DB {
    fork_person_meta: ForkPersonMetaTable;
    fork_tag_person: ForkTagPersonTable;
  }
}

export type ForkPersonMeta = Selectable<ForkPersonMetaTable>;
export type ForkTagPerson = Selectable<ForkTagPersonTable>;
