import { Column, ForeignKeyColumn, Table } from '@immich/sql-tools';
import { PersonTable } from 'src/schema/tables/person.table';

@Table('fork_person_meta')
export class ForkPersonMetaTable {
  @ForeignKeyColumn(() => PersonTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', primary: true })
  personId!: string;

  @Column({ type: 'text', nullable: true, default: null })
  note!: string | null;
}
