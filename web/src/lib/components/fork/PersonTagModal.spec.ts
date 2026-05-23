import { getAnimateMock } from '$lib/__mocks__/animate.mock';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import { updatePersonMeta } from '$lib/fork/api';
import type { EnrichedPersonResponseDto } from '$lib/fork/types';
import { handleError } from '$lib/utils/handle-error';
import { getAllTags, upsertTags } from '@immich/sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PersonTagModal from './PersonTagModal.svelte';

vi.mock('@immich/sdk', () => ({
  getAllTags: vi.fn(),
  upsertTags: vi.fn(),
}));

vi.mock('$lib/fork/api', () => ({
  updatePersonMeta: vi.fn(),
}));

vi.mock('$lib/utils/handle-error', () => ({
  handleError: vi.fn(),
}));

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
    tags: [tagA],
    ...overrides,
  }) as EnrichedPersonResponseDto;

describe('PersonTagModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    Element.prototype.animate = getAnimateMock();
    vi.mocked(getAllTags).mockResolvedValue([tagA, tagB]);
    vi.mocked(upsertTags).mockReset();
    vi.mocked(updatePersonMeta).mockReset();
    vi.mocked(handleError).mockReset();
    onClose.mockReset();
  });

  afterAll(async () => {
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
  });

  it('fetches all tags on mount and renders a pill for each existing person tag', async () => {
    render(PersonTagModal, { props: { person: buildPerson(), onClose } });

    await waitFor(() => expect(getAllTags).toHaveBeenCalledOnce());
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('removes a tag from the selection when its pill remove button is clicked', async () => {
    render(PersonTagModal, { props: { person: buildPerson(), onClose } });

    const removeButton = await screen.findByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButton);

    await waitFor(() => expect(screen.queryByText('A')).not.toBeInTheDocument());
  });

  it('submits the current tag selection and calls onClose with the response', async () => {
    const updated = { ...buildPerson(), tags: [] };
    vi.mocked(updatePersonMeta).mockResolvedValue(updated);

    render(PersonTagModal, { props: { person: buildPerson(), onClose } });

    const removeButton = await screen.findByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButton);

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { tagIds: [] }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(updated));
  });

  it('adds person tags that are missing from the getAllTags response to the local tag list', async () => {
    vi.mocked(getAllTags).mockResolvedValue([tagB]);
    const orphan = { ...tagA, id: 'orphan-id', value: 'orphan' };

    render(PersonTagModal, { props: { person: buildPerson({ tags: [orphan] }), onClose } });

    expect(await screen.findByText('orphan')).toBeInTheDocument();
  });

  it('omits already-selected tags from the combobox options', async () => {
    render(PersonTagModal, { props: { person: buildPerson({ tags: [tagA] }), onClose } });

    await waitFor(() => expect(getAllTags).toHaveBeenCalled());

    const input = await screen.findByRole('combobox');
    await fireEvent.focus(input);

    const options = await screen.findAllByRole('option');
    const labels = options.map((opt) => opt.textContent?.trim());
    expect(labels).toContain('B');
    expect(labels).not.toContain('A');
  });

  it('creates a new tag via upsertTags when a non-existent option is selected', async () => {
    const created = { ...tagA, id: 'new-id', value: 'new-tag', name: 'new-tag' };
    vi.mocked(upsertTags).mockResolvedValue([created]);
    vi.mocked(updatePersonMeta).mockResolvedValue({ ...buildPerson(), tags: [tagA, created] });

    render(PersonTagModal, { props: { person: buildPerson(), onClose } });

    await waitFor(() => expect(getAllTags).toHaveBeenCalled());

    const input = await screen.findByRole('combobox');
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'new-tag' } });

    const options = await screen.findAllByRole('option');
    const createOption = options.find((o) => o.textContent?.includes('new-tag'))!;
    await fireEvent.click(createOption);

    await waitFor(() => expect(upsertTags).toHaveBeenCalledWith({ tagUpsertDto: { tags: ['new-tag'] } }));

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() =>
      expect(updatePersonMeta).toHaveBeenCalledWith('person-1', {
        tagIds: expect.arrayContaining(['tag-a', 'new-id']),
      }),
    );
  });

  it('supports adding and removing tags in the same session before submit', async () => {
    vi.mocked(updatePersonMeta).mockResolvedValue({ ...buildPerson(), tags: [tagB] });

    render(PersonTagModal, { props: { person: buildPerson({ tags: [tagA] }), onClose } });

    await waitFor(() => expect(getAllTags).toHaveBeenCalled());

    // Add tagB via combobox
    const input = await screen.findByRole('combobox');
    await fireEvent.focus(input);
    const options = await screen.findAllByRole('option');
    const tagBOption = options.find((o) => o.textContent?.includes('B'))!;
    await fireEvent.click(tagBOption);

    // Remove tagA (it was added first and renders first)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /remove_tag/i })).toHaveLength(2));
    const removeButtons = screen.getAllByRole('button', { name: /remove_tag/i });
    await fireEvent.click(removeButtons[0]);

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { tagIds: ['tag-b'] }));
  });

  it('routes update failures through handleError without closing the modal', async () => {
    const failure = new Error('boom');
    vi.mocked(updatePersonMeta).mockRejectedValue(failure);

    render(PersonTagModal, { props: { person: buildPerson(), onClose } });

    await screen.findByText('A');
    const saveButton = await screen.findByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => expect(handleError).toHaveBeenCalledWith(failure, expect.any(String)));
    expect(onClose).not.toHaveBeenCalled();
  });
});
