import { PersonTable } from 'src/schema/tables/person.table';
import { TagTable } from 'src/schema/tables/tag.table';
import { ForeignKeyColumn, Index, Table } from 'src/sql-tools';

@Index({ name: 'IDX_person_tag_personId_tagId', columns: ['personId', 'tagId'] })
@Table('person_tag')
export class PersonTagTable {
  @ForeignKeyColumn(() => PersonTable, { onUpdate: 'CASCADE', onDelete: 'CASCADE', primary: true, index: true })
  personId!: string;

  @ForeignKeyColumn(() => TagTable, { onUpdate: 'CASCADE', onDelete: 'CASCADE', primary: true, index: true })
  tagId!: string;
}