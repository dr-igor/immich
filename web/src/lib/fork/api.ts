import type { EnrichedPersonResponseDto, ForkPeopleResponseDto, ForkPersonMetaUpdateDto } from '$lib/fork/types';
import { defaults, getBaseUrl } from '@immich/sdk';

interface GetPeopleOptions {
  page?: number;
  size?: number;
  withHidden?: boolean;
  tagIds?: string[];
}

async function forkFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}/${path}`;
  const response = await (defaults.fetch ?? fetch)(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...defaults.headers, ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(`Fork API error ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export async function getForkPeople(options: GetPeopleOptions = {}): Promise<ForkPeopleResponseDto> {
  const params = new URLSearchParams();
  if (options.page) {
    params.set('page', String(options.page));
  }
  if (options.size !== undefined && options.size > 0) {
    params.set('size', String(options.size));
  }
  if (options.withHidden) {
    params.set('withHidden', 'true');
  }
  for (const tagId of options.tagIds ?? []) {
    params.append('tagIds', tagId);
  }

  return forkFetch<ForkPeopleResponseDto>(`fork/people?${params}`);
}

export async function updatePersonMeta(
  personId: string,
  dto: ForkPersonMetaUpdateDto,
): Promise<EnrichedPersonResponseDto> {
  return forkFetch<EnrichedPersonResponseDto>(`fork/people/${personId}/meta`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}
