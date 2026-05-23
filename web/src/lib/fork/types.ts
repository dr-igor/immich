import type { PersonResponseDto, TagResponseDto } from '@immich/sdk';

export interface ForkPersonMeta {
  note: string | null;
  tags: TagResponseDto[];
}

export type EnrichedPersonResponseDto = PersonResponseDto & ForkPersonMeta;

export interface ForkPersonMetaUpdateDto {
  note?: string | null;
  tagIds?: string[] | null;
}

export interface ForkPeopleResponseDto {
  total: number;
  hidden: number;
  hasNextPage?: boolean;
  people: EnrichedPersonResponseDto[];
}
