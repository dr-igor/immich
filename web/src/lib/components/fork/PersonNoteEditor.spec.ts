import { updatePersonMeta } from '$lib/fork/api';
import type { EnrichedPersonResponseDto } from '$lib/fork/types';
import { handleError } from '$lib/utils/handle-error';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonNoteEditor from './PersonNoteEditor.svelte';

vi.mock('$lib/fork/api', () => ({
  updatePersonMeta: vi.fn(),
}));

vi.mock('$lib/utils/handle-error', () => ({
  handleError: vi.fn(),
}));

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
    tags: [],
    ...overrides,
  }) as EnrichedPersonResponseDto;

describe('PersonNoteEditor', () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.mocked(updatePersonMeta).mockReset();
    vi.mocked(handleError).mockReset();
    onUpdate.mockReset();
  });

  it('initializes the textarea from person.note when set', () => {
    const { container } = render(PersonNoteEditor, { props: { person: buildPerson({ note: 'hello' }), onUpdate } });
    const textarea = container.querySelector('textarea')!;
    expect(textarea.value).toBe('hello');
  });

  it('initializes the textarea to empty string when person.note is null', () => {
    const { container } = render(PersonNoteEditor, { props: { person: buildPerson(), onUpdate } });
    const textarea = container.querySelector('textarea')!;
    expect(textarea.value).toBe('');
  });

  it('saves the draft note on blur and calls onUpdate with the response', async () => {
    const updated = buildPerson({ note: 'a new note' });
    vi.mocked(updatePersonMeta).mockResolvedValue(updated);

    const { container } = render(PersonNoteEditor, { props: { person: buildPerson(), onUpdate } });
    const textarea = container.querySelector('textarea')!;
    await fireEvent.input(textarea, { target: { value: 'a new note' } });
    await fireEvent.blur(textarea);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { note: 'a new note' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(updated));
  });

  it('persists empty drafts as null', async () => {
    vi.mocked(updatePersonMeta).mockResolvedValue(buildPerson({ note: null }));

    const { container } = render(PersonNoteEditor, { props: { person: buildPerson({ note: 'old' }), onUpdate } });
    const textarea = container.querySelector('textarea')!;
    await fireEvent.input(textarea, { target: { value: '' } });
    await fireEvent.blur(textarea);

    await waitFor(() => expect(updatePersonMeta).toHaveBeenCalledWith('person-1', { note: null }));
  });

  it('routes save failures through handleError and does not call onUpdate', async () => {
    const failure = new Error('boom');
    vi.mocked(updatePersonMeta).mockRejectedValue(failure);

    const { container } = render(PersonNoteEditor, { props: { person: buildPerson(), onUpdate } });
    const textarea = container.querySelector('textarea')!;
    await fireEvent.input(textarea, { target: { value: 'x' } });
    await fireEvent.blur(textarea);

    await waitFor(() => expect(handleError).toHaveBeenCalledWith(failure, expect.any(String)));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
