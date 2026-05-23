import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthDto } from 'src/dtos/auth.dto';
import { mapPerson, PersonResponseDto, PersonSearchDto } from 'src/dtos/person.dto';
import {
  ForkEnrichedPeopleResponseDto,
  ForkEnrichedPersonResponseDto,
  ForkPersonMetaUpdateDto,
  ForkPersonSearchDto,
} from 'src/fork/fork-person.dto';
import { ForkPersonRepository } from 'src/fork/fork-person.repository';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { PersonRepository } from 'src/repositories/person.repository';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository';
import { getConfig } from 'src/utils/config';

@Injectable()
export class ForkPersonService {
  constructor(
    private readonly forkPersonRepository: ForkPersonRepository,
    private readonly personRepository: PersonRepository,
    private readonly logger: LoggingRepository,
    private readonly configRepository: ConfigRepository,
    private readonly metadataRepository: SystemMetadataRepository,
  ) {
    this.logger.setContext(ForkPersonService.name);
  }

  async enrichPerson(person: PersonResponseDto): Promise<ForkEnrichedPersonResponseDto> {
    const enrichment = await this.forkPersonRepository.getPersonEnrichment(person.id);
    return { ...person, note: enrichment.note, tags: enrichment.tags };
  }

  async getAllPeople(
    auth: AuthDto,
    dto: PersonSearchDto & ForkPersonSearchDto,
  ): Promise<ForkEnrichedPeopleResponseDto> {
    const { withHidden = false, page, size, tagIds } = dto;
    const pagination = { take: size, skip: (page - 1) * size };

    const { machineLearning } = await getConfig(
      { configRepo: this.configRepository, metadataRepo: this.metadataRepository, logger: this.logger },
      { withCache: true },
    );

    const { items, hasNextPage } = await this.forkPersonRepository.getTagFilteredPeople(auth.user.id, pagination, {
      withHidden,
      tagIds,
      minimumFaceCount: machineLearning.facialRecognition.minFaces,
    });

    const { total, hidden } = await this.forkPersonRepository.getNumberOfPeople(auth.user.id);
    const personIds = items.map((p) => p.id);
    const enrichmentMap = await this.forkPersonRepository.getPeopleEnrichment(personIds);

    const people = items.map((person) => {
      const enrichment = enrichmentMap.get(person.id) ?? { note: null, tags: [] };
      return { ...mapPerson(person), note: enrichment.note, tags: enrichment.tags };
    });

    return { total, hidden, people, hasNextPage };
  }

  async updatePersonMeta(
    auth: AuthDto,
    personId: string,
    dto: ForkPersonMetaUpdateDto,
  ): Promise<ForkEnrichedPersonResponseDto> {
    const person = await this.personRepository.getById(personId);
    if (!person || person.ownerId !== auth.user.id) {
      throw new NotFoundException('Person not found');
    }

    if (dto.tagIds !== undefined) {
      const tagIds = dto.tagIds ?? [];
      await this.validateTagOwnership(auth.user.id, tagIds);
      await this.forkPersonRepository.setPersonTags(personId, tagIds);
    }

    if (dto.note !== undefined) {
      await this.forkPersonRepository.upsertPersonMeta(personId, dto.note ?? null);
    }

    const enrichment = await this.forkPersonRepository.getPersonEnrichment(personId);
    return { ...mapPerson(person), note: enrichment.note, tags: enrichment.tags };
  }

  private async validateTagOwnership(userId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }
    const owned = await this.forkPersonRepository.findOwnedTagIds(userId, tagIds);
    if (owned.length !== new Set(tagIds).size) {
      throw new NotFoundException('One or more tags not found');
    }
  }
}
