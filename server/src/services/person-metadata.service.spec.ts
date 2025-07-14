import { BadRequestException } from '@nestjs/common';
import { PersonService } from 'src/services/person.service';
import { authStub } from 'test/fixtures/auth.stub';
import { personStub } from 'test/fixtures/person.stub';
import { makeStream, newTestService, ServiceMocks } from 'test/utils';

describe('PersonService - Metadata Features', () => {
  let sut: PersonService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(PersonService));
    // Setup default mocks for person tag methods
    mocks.person.getPersonTags.mockResolvedValue([]);
    mocks.person.setPersonTags.mockResolvedValue();
    mocks.person.getPersonsWithTags.mockResolvedValue([]);
  });

  describe('update with description and tags', () => {
    it('should update person with description', async () => {
      const description = 'This is a test description for the person';
      mocks.person.update.mockResolvedValue({ ...personStub.withName, description });
      mocks.access.person.checkOwnerAccess.mockResolvedValue(new Set(['person-1']));

      const result = await sut.update(authStub.admin, 'person-1', { 
        name: 'Person 1', 
        description 
      });

      expect(mocks.person.update).toHaveBeenCalledWith({
        id: 'person-1',
        faceAssetId: undefined,
        name: 'Person 1',
        birthDate: undefined,
        isHidden: undefined,
        isFavorite: undefined,
        color: undefined,
        description,
      });
      expect(mocks.person.getPersonTags).toHaveBeenCalledWith('person-1');
    });

    it('should update person with tags', async () => {
      const tagIds = ['tag-1', 'tag-2'];
      const mockTags = [
        { id: 'tag-1', value: 'family', userId: 'user-1', createdAt: new Date(), updatedAt: new Date(), color: null, parentId: null, updateId: 'update-1' },
        { id: 'tag-2', value: 'friend', userId: 'user-1', createdAt: new Date(), updatedAt: new Date(), color: null, parentId: null, updateId: 'update-2' }
      ];
      
      mocks.person.update.mockResolvedValue(personStub.withName);
      mocks.person.getPersonTags.mockResolvedValue(mockTags);
      mocks.access.person.checkOwnerAccess.mockResolvedValue(new Set(['person-1']));

      const result = await sut.update(authStub.admin, 'person-1', { 
        name: 'Person 1', 
        tagIds 
      });

      expect(mocks.person.setPersonTags).toHaveBeenCalledWith('person-1', tagIds);
      expect(mocks.person.getPersonTags).toHaveBeenCalledWith('person-1');
    });
  });

  describe('merge with metadata', () => {
    it('should merge tags using set union', async () => {
      const primaryTags = [
        { id: 'tag-1', value: 'family', userId: 'user-1', createdAt: new Date(), updatedAt: new Date(), color: null, parentId: null, updateId: 'update-1' }
      ];
      const mergeTags = [
        { id: 'tag-2', value: 'friend', userId: 'user-1', createdAt: new Date(), updatedAt: new Date(), color: null, parentId: null, updateId: 'update-2' }
      ];

      mocks.person.getById.mockResolvedValueOnce(personStub.primaryPerson);
      mocks.person.getById.mockResolvedValueOnce(personStub.mergePerson);
      mocks.person.getPersonTags.mockResolvedValueOnce(primaryTags);
      mocks.person.getPersonTags.mockResolvedValueOnce(mergeTags);
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-1']));
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-2']));

      await sut.mergePerson(authStub.admin, 'person-1', { ids: ['person-2'] });

      expect(mocks.person.setPersonTags).toHaveBeenCalledWith('person-1', ['tag-1', 'tag-2']);
    });

    it('should concatenate descriptions', async () => {
      const primaryPersonWithDesc = { ...personStub.primaryPerson, description: 'Primary description' };
      const mergePersonWithDesc = { ...personStub.mergePerson, description: 'Merge description' };

      mocks.person.getById.mockResolvedValueOnce(primaryPersonWithDesc);
      mocks.person.getById.mockResolvedValueOnce(mergePersonWithDesc);
      mocks.person.getPersonTags.mockResolvedValue([]);
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-1']));
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-2']));

      await sut.mergePerson(authStub.admin, 'person-1', { ids: ['person-2'] });

      expect(mocks.person.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'person-1',
          description: 'Primary description\n\nMerge description'
        })
      );
    });

    it('should use description override when provided', async () => {
      const overrideDescription = 'Custom merged description';
      
      mocks.person.getById.mockResolvedValueOnce(personStub.primaryPerson);
      mocks.person.getById.mockResolvedValueOnce(personStub.mergePerson);
      mocks.person.getPersonTags.mockResolvedValue([]);
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-1']));
      mocks.access.person.checkOwnerAccess.mockResolvedValueOnce(new Set(['person-2']));

      await sut.mergePerson(authStub.admin, 'person-1', { 
        ids: ['person-2'], 
        description: overrideDescription 
      });

      expect(mocks.person.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'person-1',
          description: overrideDescription
        })
      );
    });
  });

  describe('getById with tags', () => {
    it('should return person with tags', async () => {
      const mockTags = [
        { id: 'tag-1', value: 'family', userId: 'user-1', createdAt: new Date(), updatedAt: new Date(), color: null, parentId: null, updateId: 'update-1' }
      ];
      
      mocks.person.getById.mockResolvedValue(personStub.withName);
      mocks.person.getPersonTags.mockResolvedValue(mockTags);
      mocks.access.person.checkOwnerAccess.mockResolvedValue(new Set(['person-1']));

      const result = await sut.getById(authStub.admin, 'person-1');

      expect(result.tags).toBeDefined();
      expect(result.tags?.length).toBe(1);
      expect(result.tags?.[0].value).toBe('family');
    });
  });
});