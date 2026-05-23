import { Kysely } from 'kysely';
import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';
import { ForkPersonRepository } from 'src/fork/fork-person.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { TagRepository } from 'src/repositories/tag.repository';
import { DB } from 'src/schema';
import { BaseService } from 'src/services/base.service';
import { MediumTestContext, newMediumService } from 'test/medium.factory';
import { getKyselyDB } from 'test/utils';

let defaultDatabase: Kysely<DB>;

const setup = () => {
  const { ctx } = newMediumService(BaseService, {
    database: defaultDatabase,
    real: [],
    mock: [LoggingRepository],
  });
  return { ctx, sut: new ForkPersonRepository(ctx.database) };
};

const newTag = async (ctx: MediumTestContext, userId: string, value: string, parentId?: string) => {
  return ctx.get(TagRepository).upsertValue({ userId, value, parentId });
};

const ensureFaceLinked = async (ctx: MediumTestContext, ownerId: string, personId: string) => {
  const { asset } = await ctx.newAsset({ ownerId });
  await ctx.newAssetFace({ assetId: asset.id, personId });
};

beforeAll(async () => {
  defaultDatabase = await getKyselyDB();
  await new ForkDatabaseRepository(defaultDatabase, LoggingRepository.create()).runMigrations();
});

describe(ForkPersonRepository.name, () => {
  describe('upsertPersonMeta', () => {
    it('inserts a new row then overwrites the note on conflict', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });

      await sut.upsertPersonMeta(person.id, 'first');
      await sut.upsertPersonMeta(person.id, 'second');

      const rows = await ctx.database
        .selectFrom('fork_person_meta')
        .selectAll()
        .where('personId', '=', person.id)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0].note).toBe('second');
    });

    it('persists a null note', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });

      await sut.upsertPersonMeta(person.id, null);
      const row = await ctx.database
        .selectFrom('fork_person_meta')
        .selectAll()
        .where('personId', '=', person.id)
        .executeTakeFirst();
      expect(row?.note).toBeNull();
    });
  });

  describe('getPersonEnrichment', () => {
    it('returns {note:null, tags:[]} when nothing has been recorded', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });

      await expect(sut.getPersonEnrichment(person.id)).resolves.toEqual({ note: null, tags: [] });
    });

    it('returns the note and assigned tags', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });
      const tag = await newTag(ctx, user.id, 'pal');

      await sut.upsertPersonMeta(person.id, 'a note');
      await sut.setPersonTags(person.id, [tag.id]);

      const result = await sut.getPersonEnrichment(person.id);
      expect(result.note).toBe('a note');
      expect(result.tags.map((t) => t.id)).toEqual([tag.id]);
    });
  });

  describe('getPeopleEnrichment', () => {
    it('short-circuits to an empty Map for an empty id list', async () => {
      const { sut } = setup();
      await expect(sut.getPeopleEnrichment([])).resolves.toEqual(new Map());
    });

    it('fills in defaults for ids absent from rows and groups tags by person', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: personA } = await ctx.newPerson({ ownerId: user.id });
      const { person: personB } = await ctx.newPerson({ ownerId: user.id });
      const { person: personC } = await ctx.newPerson({ ownerId: user.id });
      const tag1 = await newTag(ctx, user.id, 'one');
      const tag2 = await newTag(ctx, user.id, 'two');

      await sut.upsertPersonMeta(personA.id, 'A note');
      await sut.setPersonTags(personA.id, [tag1.id, tag2.id]);
      await sut.setPersonTags(personB.id, [tag1.id]);

      const result = await sut.getPeopleEnrichment([personA.id, personB.id, personC.id]);

      expect(result.get(personA.id)?.note).toBe('A note');
      expect(
        result
          .get(personA.id)
          ?.tags.map((t) => t.id)
          .toSorted(),
      ).toEqual([tag1.id, tag2.id].toSorted());
      expect(result.get(personB.id)).toEqual({
        note: null,
        tags: expect.arrayContaining([expect.objectContaining({ id: tag1.id })]),
      });
      expect(result.get(personC.id)).toEqual({ note: null, tags: [] });
    });
  });

  describe('setPersonTags', () => {
    it('replaces existing tag assignments atomically', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });
      const t1 = await newTag(ctx, user.id, 'one');
      const t2 = await newTag(ctx, user.id, 'two');
      const t3 = await newTag(ctx, user.id, 'three');

      await sut.setPersonTags(person.id, [t1.id, t2.id]);
      await sut.setPersonTags(person.id, [t3.id]);

      const rows = await ctx.database
        .selectFrom('fork_tag_person')
        .select('tagId')
        .where('personId', '=', person.id)
        .execute();
      expect(rows.map((r) => r.tagId)).toEqual([t3.id]);
    });

    it('clears all tags when passed an empty array', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id });
      const tag = await newTag(ctx, user.id, 'one');

      await sut.setPersonTags(person.id, [tag.id]);
      await sut.setPersonTags(person.id, []);

      const rows = await ctx.database
        .selectFrom('fork_tag_person')
        .selectAll()
        .where('personId', '=', person.id)
        .execute();
      expect(rows).toEqual([]);
    });
  });

  describe('findOwnedTagIds', () => {
    it('returns only the tag ids owned by the user', async () => {
      const { ctx, sut } = setup();
      const { user: userA } = await ctx.newUser();
      const { user: userB } = await ctx.newUser();
      const tagA = await newTag(ctx, userA.id, 'mine');
      const tagB = await newTag(ctx, userB.id, 'theirs');

      const owned = await sut.findOwnedTagIds(userA.id, [tagA.id, tagB.id]);
      expect(owned).toEqual([tagA.id]);
    });

    it('returns an empty list for an empty input', async () => {
      const { sut } = setup();
      await expect(sut.findOwnedTagIds('any-user', [])).resolves.toEqual([]);
    });
  });

  describe('getNumberOfPeople', () => {
    it('counts total and hidden separately', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      await ctx.newPerson({ ownerId: user.id, isHidden: false });
      await ctx.newPerson({ ownerId: user.id, isHidden: false });
      await ctx.newPerson({ ownerId: user.id, isHidden: true });

      await expect(sut.getNumberOfPeople(user.id)).resolves.toEqual({ total: 3, hidden: 1 });
    });
  });

  describe('getTagFilteredPeople', () => {
    it('returns all visible people when no filter is provided and hides hidden when withHidden is false', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: visible } = await ctx.newPerson({ ownerId: user.id, name: 'Alice' });
      const { person: hidden } = await ctx.newPerson({ ownerId: user.id, name: 'Bob', isHidden: true });
      await ensureFaceLinked(ctx, user.id, visible.id);
      await ensureFaceLinked(ctx, user.id, hidden.id);

      const result = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { withHidden: false });
      const ids = result.items.map((p) => p.id);
      expect(ids).toContain(visible.id);
      expect(ids).not.toContain(hidden.id);

      const withHiddenResult = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { withHidden: true });
      const allIds = withHiddenResult.items.map((p) => p.id);
      expect(allIds).toEqual(expect.arrayContaining([visible.id, hidden.id]));
    });

    it('AND-of-tags filter only returns people that have every requested tag', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: bothTags } = await ctx.newPerson({ ownerId: user.id, name: 'Both' });
      const { person: oneTag } = await ctx.newPerson({ ownerId: user.id, name: 'OnlyA' });
      await ensureFaceLinked(ctx, user.id, bothTags.id);
      await ensureFaceLinked(ctx, user.id, oneTag.id);

      const tagA = await newTag(ctx, user.id, 'tagA');
      const tagB = await newTag(ctx, user.id, 'tagB');
      await sut.setPersonTags(bothTags.id, [tagA.id, tagB.id]);
      await sut.setPersonTags(oneTag.id, [tagA.id]);

      const result = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { tagIds: [tagA.id, tagB.id] });
      const ids = result.items.map((p) => p.id);
      expect(ids).toContain(bothTags.id);
      expect(ids).not.toContain(oneTag.id);
    });

    it('returns only untagged people when tagIds is null', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: tagged } = await ctx.newPerson({ ownerId: user.id, name: 'Tagged' });
      const { person: untagged } = await ctx.newPerson({ ownerId: user.id, name: 'Untagged' });
      await ensureFaceLinked(ctx, user.id, tagged.id);
      await ensureFaceLinked(ctx, user.id, untagged.id);

      const tag = await newTag(ctx, user.id, 'sometag');
      await sut.setPersonTags(tagged.id, [tag.id]);

      const result = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { tagIds: null });
      const ids = result.items.map((p) => p.id);
      expect(ids).toContain(untagged.id);
      expect(ids).not.toContain(tagged.id);
    });

    it('excludes unnamed people below minimumFaceCount and includes those at/above it', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: below } = await ctx.newPerson({ ownerId: user.id, name: '' });
      const { person: above } = await ctx.newPerson({ ownerId: user.id, name: '' });
      await ensureFaceLinked(ctx, user.id, below.id);
      await ensureFaceLinked(ctx, user.id, above.id);
      await ensureFaceLinked(ctx, user.id, above.id);

      const result = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { minimumFaceCount: 2 });
      const ids = result.items.map((p) => p.id);
      expect(ids).toContain(above.id);
      expect(ids).not.toContain(below.id);
    });

    it('matches descendant-tagged people when filtering by an ancestor tag', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person } = await ctx.newPerson({ ownerId: user.id, name: 'Has child tag' });
      await ensureFaceLinked(ctx, user.id, person.id);

      const parent = await newTag(ctx, user.id, 'parent');
      const child = await newTag(ctx, user.id, 'child', parent.id);
      await sut.setPersonTags(person.id, [child.id]);

      const result = await sut.getTagFilteredPeople(user.id, { take: 50, skip: 0 }, { tagIds: [parent.id] });
      const ids = result.items.map((p) => p.id);
      expect(ids).toContain(person.id);
    });

    it('signals hasNextPage based on take boundary', async () => {
      const { ctx, sut } = setup();
      const { user } = await ctx.newUser();
      const { person: p1 } = await ctx.newPerson({ ownerId: user.id, name: 'P1' });
      const { person: p2 } = await ctx.newPerson({ ownerId: user.id, name: 'P2' });
      await ensureFaceLinked(ctx, user.id, p1.id);
      await ensureFaceLinked(ctx, user.id, p2.id);

      const exact = await sut.getTagFilteredPeople(user.id, { take: 2, skip: 0 }, {});
      expect(exact.items).toHaveLength(2);
      expect(exact.hasNextPage).toBe(false);

      const partial = await sut.getTagFilteredPeople(user.id, { take: 1, skip: 0 }, {});
      expect(partial.items).toHaveLength(1);
      expect(partial.hasNextPage).toBe(true);
    });
  });
});
