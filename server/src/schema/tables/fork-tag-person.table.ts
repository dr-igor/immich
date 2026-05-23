import { ForeignKeyColumn, Index, Table } from '@immich/sql-tools';
import { PersonTable } from 'src/schema/tables/person.table';
import { TagTable } from 'src/schema/tables/tag.table';

@Index({ columns: ['personId', 'tagId'] })
@Table('fork_tag_person')
export class ForkTagPersonTable {
  @ForeignKeyColumn(() => PersonTable, { onUpdate: 'CASCADE', onDelete: 'CASCADE', primary: true, index: true })
  personId!: string;

  @ForeignKeyColumn(() => TagTable, { onUpdate: 'CASCADE', onDelete: 'CASCADE', primary: true, index: true })
  tagId!: string;
}
