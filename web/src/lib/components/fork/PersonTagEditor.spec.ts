import { updatePersonMeta } from '$lib/fork/api';
import type { EnrichedPersonResponseDto } from '$lib/fork/types';
import { handleError } from '$lib/utils/handle-error';
import { modalManager } from '@immich/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonTagEditor from './PersonTagEditor.test-wrapper.svelte';

vi.mock('$lib/fork/api', () => ({
  updatePersonMeta: vi.fn(),
}));

vi.mock('$lib/utils/handle-error', () => ({
  handleError: vi.fn(),
}));

vi.mock('@immich/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@immich/ui')>();
  return {
    ...actual,
    modalManager: { show: vi.fn() },
  };
});

const tagA = { id: 'tag-a', name: 'A', value: 'A', color: undefined, parentId: undefined, createdAt: '', updatedAt: '' };
const tagB = { id: 'tag-b', name: 'B', value: 'B', color: undefined, parentId: undefined, createdAt: '', updatedAt: '' };

const buildPerson = (overrides: Partial<EnrichedPersonResponseDto> = {}): EnrichedPersonResponseDto =>
  ({
    id: 'person-1',
    name: 'Alice',
    birthDate: null,
    thumbnailPath: '',
    isHidden: false,
    isFavorite: false,
    color: null,
    updatedAt: '',
    note: null,
    tags: [tagA, tagB],
    ...overrides,
  }) as EnrichedPersonResponseDto;

describe('PersonTagEditor', () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.mocked(updatePersonMeta).mockReset();
    vi.mocked(handleError).mockReset();
    vi.mocked(modalManager.show).mockReset();
    onUpdate.mockReset();
  });

  it('renders one badge per tag', () => {
    render(PersonTagEditor, { props: { person: buildPerson(), onUpdate } });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('removes a tag and calls updatePersonMeta with the remaining ids', async () => {
    const updated = buildPerson({ tags: [tagB] });
    vi.mocked(updatePersonMeta).mockResolvedValue(updated);

    render(PersonTagEditor, { props: { person: buildPerson(), onUpdate } });

    const removeButtons = await screen.findAllByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { tagIds: ['tag-b'] }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(updated));
  });

  it('passes an empty tagIds array when removing the only tag', async () => {
    vi.mocked(updatePersonMeta).mockResolvedValue(buildPerson({ tags: [] }));

    render(PersonTagEditor, { props: { person: buildPerson({ tags: [tagA] }), onUpdate } });

    const removeButton = await screen.findByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButton);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { tagIds: [] }));
  });

  it('opens the modal and forwards the modal result to onUpdate when truthy', async () => {
    const updated = buildPerson({ tags: [tagA, tagB] });
    vi.mocked(modalManager.show).mockResolvedValue(updated as never);

    render(PersonTagEditor, { props: { person: buildPerson(), onUpdate } });

    const addButton = await screen.findByRole('button', { name: /add_tag/i });
    await fireEvent.click(addButton);

    await waitFor(() => expect(modalManager.show).toHaveBeenCalled());
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(updated));
  });

  it('does not call onUpdate when the modal returns nothing', async () => {
    vi.mocked(modalManager.show).mockResolvedValue(undefined as never);

    render(PersonTagEditor, { props: { person: buildPerson(), onUpdate } });

    const addButton = await screen.findByRole('button', { name: /add_tag/i });
    await fireEvent.click(addButton);

    await waitFor(() => expect(modalManager.show).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('routes update failures through handleError', async () => {
    const failure = new Error('boom');
    vi.mocked(updatePersonMeta).mockRejectedValue(failure);

    render(PersonTagEditor, { props: { person: buildPerson(), onUpdate } });

    const removeButtons = await screen.findAllByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(handleError).toHaveBeenCalledWith(failure, expect.any(String)));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
