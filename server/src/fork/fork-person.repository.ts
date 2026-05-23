import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { columns, Tag } from 'src/database';
import { mapTag, TagResponseDto } from 'src/dtos/tag.dto';
import { AssetVisibility } from 'src/enum';
import 'src/fork/database';
import { DB } from 'src/schema';
import { anyUuid } from 'src/utils/database';
import { paginationHelper, PaginationOptions } from 'src/utils/pagination';

export interface ForkPersonEnrichment {
  note: string | null;
  tags: TagResponseDto[];
}

export interface ForkPeopleOptions {
  withHidden?: boolean;
  tagIds?: string[] | null;
  minimumFaceCount?: number;
}

@Injectable()
export class ForkPersonRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  async getPersonEnrichment(personId: string): Promise<ForkPersonEnrichment> {
    const [metaRow, tagRows] = await Promise.all([
      this.db.selectFrom('fork_person_meta').select('note').where('personId', '=', personId).executeTakeFirst(),
      this.db
        .selectFrom('tag')
        .innerJoin('fork_tag_person', 'tag.id', 'fork_tag_person.tagId')
        .select(columns.tag)
        .where('fork_tag_person.personId', '=', personId)
        .execute(),
    ]);

    return {
      note: metaRow?.note ?? null,
      tags: tagRows.map((row) => mapTag(row as Tag)),
    };
  }

  async getPeopleEnrichment(personIds: string[]): Promise<Map<string, ForkPersonEnrichment>> {
    if (personIds.length === 0) {
      return new Map();
    }

    const [metaRows, tagRows] = await Promise.all([
      this.db
        .selectFrom('fork_person_meta')
        .select(['personId', 'note'])
        .where('personId', '=', anyUuid(personIds))
        .execute(),
      this.db
        .selectFrom('tag')
        .innerJoin('fork_tag_person', 'tag.id', 'fork_tag_person.tagId')
        .select([...columns.tag, 'fork_tag_person.personId as enrichPersonId'])
        .where('fork_tag_person.personId', '=', anyUuid(personIds))
        .execute(),
    ]);

    const result = new Map<string, ForkPersonEnrichment>(personIds.map((id) => [id, { note: null, tags: [] }]));

    for (const row of metaRows) {
      const entry = result.get(row.personId);
      if (entry) {
        entry.note = row.note ?? null;
      }
    }

    for (const row of tagRows) {
      const entry = result.get(row.enrichPersonId);
      if (entry) {
        const { enrichPersonId: _, ...tagData } = row;
        entry.tags.push(mapTag(tagData as Tag));
      }
    }

    return result;
  }

  async upsertPersonMeta(personId: string, note: string | null): Promise<void> {
    await this.db
      .insertInto('fork_person_meta')
      .values({ personId, note })
      .onConflict((oc) => oc.column('personId').doUpdateSet({ note }))
      .execute();
  }

  async setPersonTags(personId: string, tagIds: string[]): Promise<void> {
    await this.db.deleteFrom('fork_tag_person').where('personId', '=', personId).execute();

    if (tagIds.length > 0) {
      await this.db
        .insertInto('fork_tag_person')
        .values(tagIds.map((tagId) => ({ personId, tagId })))
        .execute();
    }
  }

  async getTagFilteredPeople(userId: string, pagination: PaginationOptions, options: ForkPeopleOptions) {
    const hasTagFilter = !!options.tagIds && options.tagIds.length > 0;
    const untaggedOnly = options.tagIds === null;

    const items = await this.db
      .selectFrom('person')
      .selectAll('person')
      .innerJoin('asset_face', 'asset_face.personId', 'person.id')
      .innerJoin('asset', (join) =>
        join
          .onRef('asset_face.assetId', '=', 'asset.id')
          .on('asset.visibility', '=', sql.lit(AssetVisibility.Timeline))
          .on('asset.deletedAt', 'is', null),
      )
      .$if(hasTagFilter, (qb) =>
        qb.innerJoin(
          (eb) =>
            eb
              .selectFrom('fork_tag_person')
              .select('fork_tag_person.personId')
              .innerJoin('tag_closure', 'fork_tag_person.tagId', 'tag_closure.id_descendant')
              .where('tag_closure.id_ancestor', '=', anyUuid(options.tagIds!))
              .groupBy('fork_tag_person.personId')
              .having((eb) => eb.fn.count('tag_closure.id_ancestor').distinct(), '>=', options.tagIds!.length)
              .as('has_tags'),
          (join) => join.onRef('has_tags.personId', '=', 'person.id'),
        ),
      )
      .$if(untaggedOnly, (qb) =>
        qb.where((eb) =>
          eb.not(eb.exists(eb.selectFrom('fork_tag_person').whereRef('fork_tag_person.personId', '=', 'person.id'))),
        ),
      )
      .where('person.ownerId', '=', userId)
      .where('asset_face.deletedAt', 'is', null)
      .where('asset_face.isVisible', 'is', true)
      .having((eb) =>
        eb.or([
          eb('person.name', '!=', ''),
          eb((innerEb) => innerEb.fn.count('asset_face.assetId'), '>=', options.minimumFaceCount ?? 1),
        ]),
      )
      .groupBy('person.id')
      .$if(!options.withHidden, (qb) => qb.where('person.isHidden', '=', false))
      .orderBy('person.isHidden', 'asc')
      .orderBy('person.isFavorite', 'desc')
      .orderBy(sql`NULLIF(person.name, '') is null`, 'asc')
      .orderBy((eb) => eb.fn.count('asset_face.assetId'), 'desc')
      .orderBy(sql`NULLIF(person.name, '')`, (om) => om.asc().nullsLast())
      .orderBy('person.createdAt')
      .offset(pagination.skip ?? 0)
      .limit(pagination.take + 1)
      .execute();

    return paginationHelper(items, pagination.take);
  }

  async findOwnedTagIds(userId: string, tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .selectFrom('tag')
      .select('id')
      .where('userId', '=', userId)
      .where('id', '=', anyUuid(tagIds))
      .execute();
    return rows.map((row) => row.id);
  }

  async getNumberOfPeople(userId: string): Promise<{ total: number; hidden: number }> {
    const row = await this.db
      .selectFrom('person')
      .select((eb) => [
        eb.fn.countAll<number>().as('total'),
        eb.fn.count<number>('id').filterWhere('isHidden', '=', true).as('hidden'),
      ])
      .where('ownerId', '=', userId)
      .executeTakeFirst();

    return { total: Number(row?.total ?? 0), hidden: Number(row?.hidden ?? 0) };
  }
}
