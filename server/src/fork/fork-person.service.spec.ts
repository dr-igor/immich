import { NotFoundException } from '@nestjs/common';
import { ForkPersonRepository } from 'src/fork/fork-person.repository';
import { ForkPersonService } from 'src/fork/fork-person.service';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { PersonRepository } from 'src/repositories/person.repository';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository';
import * as configUtils from 'src/utils/config';
import { authStub } from 'test/fixtures/auth.stub';
import { tagResponseStub } from 'test/fixtures/tag.stub';
import { automock, AutoMocked } from 'test/utils';
import { beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';

type PersonRow = NonNullable<Awaited<ReturnType<PersonRepository['getById']>>>;

const buildPersonRow = (overrides: Partial<PersonRow> = {}): PersonRow =>
  ({
    id: 'person-1',
    name: 'Alice',
    birthDate: null,
    thumbnailPath: '/thumbs/alice.jpg',
    isHidden: false,
    isFavorite: false,
    color: null,
    ownerId: authStub.admin.user.id,
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    faceAssetId: null,
    ...overrides,
  }) as unknown as PersonRow;

const buildResponseFromRow = (row: ReturnType<typeof buildPersonRow>) => ({
  id: row.id,
  name: row.name,
  birthDate: null,
  thumbnailPath: row.thumbnailPath,
  isHidden: row.isHidden,
  isFavorite: row.isFavorite,
  color: undefined,
  updatedAt: row.updatedAt.toISOString(),
});

describe(ForkPersonService.name, () => {
  let sut: ForkPersonService;
  let forkPersonRepo: AutoMocked<ForkPersonRepository>;
  let personRepo: AutoMocked<PersonRepository>;
  let logger: AutoMocked<LoggingRepository>;
  let configRepo: AutoMocked<ConfigRepository>;
  let metadataRepo: AutoMocked<SystemMetadataRepository>;
  let getConfigSpy: MockedFunction<typeof configUtils.getConfig>;

  beforeEach(() => {
    forkPersonRepo = automock(ForkPersonRepository, { strict: false });
    personRepo = automock(PersonRepository, { strict: false });
    // eslint-disable-next-line no-sparse-arrays
    logger = automock(LoggingRepository, { args: [, { getEnv: () => ({}) }], strict: false });
    configRepo = automock(ConfigRepository, { strict: false });
    metadataRepo = automock(SystemMetadataRepository, { strict: false });

    getConfigSpy = vi.spyOn(configUtils, 'getConfig') as never;
    getConfigSpy.mockResolvedValue({
      machineLearning: { facialRecognition: { minFaces: 3 } },
    } as never);

    sut = new ForkPersonService(forkPersonRepo, personRepo, logger, configRepo, metadataRepo);
  });

  describe('enrichPerson', () => {
    it('merges note and tags from the repository onto the person', async () => {
      forkPersonRepo.getPersonEnrichment.mockResolvedValue({
        note: 'hello',
        tags: [tagResponseStub.tag1],
      });

      await expect(
        sut.enrichPerson({ id: 'person-1', name: 'A', birthDate: null, thumbnailPath: '', isHidden: false } as never),
      ).resolves.toEqual({
        id: 'person-1',
        name: 'A',
        birthDate: null,
        thumbnailPath: '',
        isHidden: false,
        note: 'hello',
        tags: [tagResponseStub.tag1],
      });
      expect(forkPersonRepo.getPersonEnrichment).toHaveBeenCalledWith('person-1');
    });

    it('passes through null note and empty tags', async () => {
      forkPersonRepo.getPersonEnrichment.mockResolvedValue({ note: null, tags: [] });
      const result = await sut.enrichPerson({ id: 'p2' } as never);
      expect(result.note).toBeNull();
      expect(result.tags).toEqual([]);
    });
  });

  describe('getAllPeople', () => {
    const personRow = buildPersonRow();
    const expectedResponse = buildResponseFromRow(personRow);

    it('translates page/size into skip/take, forwards filter options, and merges enrichment', async () => {
      forkPersonRepo.getTagFilteredPeople.mockResolvedValue({ items: [personRow], hasNextPage: true } as never);
      forkPersonRepo.getNumberOfPeople.mockResolvedValue({ total: 5, hidden: 1 });
      forkPersonRepo.getPeopleEnrichment.mockResolvedValue(
        new Map([[personRow.id, { note: 'n', tags: [tagResponseStub.tag1] }]]),
      );

      const result = await sut.getAllPeople(authStub.admin, {
        page: 2,
        size: 10,
        withHidden: true,
        tagIds: ['t1'],
      } as never);

      expect(forkPersonRepo.getTagFilteredPeople).toHaveBeenCalledWith(
        authStub.admin.user.id,
        { skip: 10, take: 10 },
        { withHidden: true, tagIds: ['t1'], minimumFaceCount: 3 },
      );
      expect(forkPersonRepo.getNumberOfPeople).toHaveBeenCalledWith(authStub.admin.user.id);
      expect(forkPersonRepo.getPeopleEnrichment).toHaveBeenCalledWith([personRow.id]);
      expect(result).toEqual({
        total: 5,
        hidden: 1,
        hasNextPage: true,
        people: [{ ...expectedResponse, note: 'n', tags: [tagResponseStub.tag1] }],
      });
    });

    it('forwards tagIds=null (untagged-only) into the repository and enriches results', async () => {
      forkPersonRepo.getTagFilteredPeople.mockResolvedValue({ items: [personRow], hasNextPage: false } as never);
      forkPersonRepo.getNumberOfPeople.mockResolvedValue({ total: 1, hidden: 0 });
      forkPersonRepo.getPeopleEnrichment.mockResolvedValue(new Map([[personRow.id, { note: null, tags: [] }]]));

      const result = await sut.getAllPeople(authStub.admin, { page: 1, size: 10, tagIds: null } as never);

      expect(forkPersonRepo.getTagFilteredPeople).toHaveBeenCalledWith(
        authStub.admin.user.id,
        { skip: 0, take: 10 },
        { withHidden: false, tagIds: null, minimumFaceCount: 3 },
      );
      expect(result.people).toHaveLength(1);
      expect(result.hasNextPage).toBe(false);
    });

    it('defaults withHidden to false and fills in {note:null, tags:[]} for missing enrichment entries', async () => {
      forkPersonRepo.getTagFilteredPeople.mockResolvedValue({ items: [personRow], hasNextPage: false } as never);
      forkPersonRepo.getNumberOfPeople.mockResolvedValue({ total: 1, hidden: 0 });
      forkPersonRepo.getPeopleEnrichment.mockResolvedValue(new Map());

      const result = await sut.getAllPeople(authStub.admin, { page: 1, size: 50 } as never);

      expect(forkPersonRepo.getTagFilteredPeople).toHaveBeenCalledWith(
        authStub.admin.user.id,
        { skip: 0, take: 50 },
        { withHidden: false, tagIds: undefined, minimumFaceCount: 3 },
      );
      expect(result.people[0].note).toBeNull();
      expect(result.people[0].tags).toEqual([]);
    });
  });

  describe('updatePersonMeta', () => {
    it('throws NotFoundException when the person does not exist', async () => {
      personRepo.getById.mockResolvedValue(undefined as never);
      await expect(sut.updatePersonMeta(authStub.admin, 'missing', { note: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the person belongs to a different user', async () => {
      personRepo.getById.mockResolvedValue(buildPersonRow({ ownerId: 'someone-else' }));
      await expect(sut.updatePersonMeta(authStub.admin, 'person-1', { note: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(forkPersonRepo.upsertPersonMeta).not.toHaveBeenCalled();
    });

    it('only updates tags when tagIds is provided, and only updates note when note is provided', async () => {
      personRepo.getById.mockResolvedValue(buildPersonRow());
      forkPersonRepo.findOwnedTagIds.mockResolvedValue([]);
      forkPersonRepo.getPersonEnrichment.mockResolvedValue({ note: null, tags: [] });

      // neither provided
      await sut.updatePersonMeta(authStub.admin, 'person-1', {});
      expect(forkPersonRepo.setPersonTags).not.toHaveBeenCalled();
      expect(forkPersonRepo.upsertPersonMeta).not.toHaveBeenCalled();

      // only note
      await sut.updatePersonMeta(authStub.admin, 'person-1', { note: 'hi' });
      expect(forkPersonRepo.upsertPersonMeta).toHaveBeenCalledWith('person-1', 'hi');
      expect(forkPersonRepo.setPersonTags).not.toHaveBeenCalled();

      // only tags (empty)
      forkPersonRepo.upsertPersonMeta.mockClear();
      await sut.updatePersonMeta(authStub.admin, 'person-1', { tagIds: [] });
      expect(forkPersonRepo.setPersonTags).toHaveBeenCalledWith('person-1', []);
      expect(forkPersonRepo.upsertPersonMeta).not.toHaveBeenCalled();

      // null note -> persisted as null
      forkPersonRepo.upsertPersonMeta.mockClear();
      await sut.updatePersonMeta(authStub.admin, 'person-1', { note: null });
      expect(forkPersonRepo.upsertPersonMeta).toHaveBeenCalledWith('person-1', null);
    });

    it('rejects when any tagId is not owned, including via duplicate-id collapse via Set semantics', async () => {
      personRepo.getById.mockResolvedValue(buildPersonRow());
      // Two distinct ids requested; repo says only one is owned -> reject.
      forkPersonRepo.findOwnedTagIds.mockResolvedValue(['t1']);
      await expect(sut.updatePersonMeta(authStub.admin, 'person-1', { tagIds: ['t1', 't2'] })).rejects.toBeInstanceOf(
        NotFoundException,
      );

      // Duplicates collapse: ['t1','t1'] is effectively size 1, so owning just 't1' is enough.
      forkPersonRepo.findOwnedTagIds.mockResolvedValue(['t1']);
      forkPersonRepo.getPersonEnrichment.mockResolvedValue({ note: null, tags: [] });
      await expect(sut.updatePersonMeta(authStub.admin, 'person-1', { tagIds: ['t1', 't1'] })).resolves.toBeDefined();
    });

    it('returns the enriched response after a successful update', async () => {
      personRepo.getById.mockResolvedValue(buildPersonRow());
      forkPersonRepo.findOwnedTagIds.mockResolvedValue(['t1']);
      forkPersonRepo.getPersonEnrichment.mockResolvedValue({
        note: 'hi',
        tags: [tagResponseStub.tag1],
      });

      const result = await sut.updatePersonMeta(authStub.admin, 'person-1', { note: 'hi', tagIds: ['t1'] });
      expect(result).toEqual({
        ...buildResponseFromRow(buildPersonRow()),
        note: 'hi',
        tags: [tagResponseStub.tag1],
      });
    });
  });
});
