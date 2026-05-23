<script lang="ts">
  import Combobox, { type ComboBoxOption } from '$lib/components/shared-components/combobox.svelte';
  import TagPill from '$lib/components/shared-components/tag-pill.svelte';
  import { updatePersonMeta } from '$lib/fork/api';
  import type { EnrichedPersonResponseDto } from '$lib/fork/types';
  import { handleError } from '$lib/utils/handle-error';
  import { getAllTags, upsertTags, type TagResponseDto } from '@immich/sdk';
  import { FormModal } from '@immich/ui';
  import { mdiTag } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    person: EnrichedPersonResponseDto;
    onClose: (updated?: EnrichedPersonResponseDto) => void;
  }

  let { person, onClose }: Props = $props();

  let allTags: TagResponseDto[] = $state([]);
  let tagMap = $derived(Object.fromEntries(allTags.map((tag) => [tag.id, tag])));
  let selectedIds = new SvelteSet<string>(person.tags.map((t) => t.id));

  onMount(async () => {
    allTags = await getAllTags();
    for (const tag of person.tags) {
      if (!allTags.some((t) => t.id === tag.id)) {
        allTags.push(tag);
      }
    }
  });

  const handleSelect = async (option?: ComboBoxOption) => {
    if (!option) {
      return;
    }

    if (option.id) {
      selectedIds.add(option.value);
    } else {
      const [newTag] = await upsertTags({ tagUpsertDto: { tags: [option.label] } });
      allTags.push(newTag);
      selectedIds.add(newTag.id);
    }
  };

  const handleRemove = (tagId: string) => {
    selectedIds.delete(tagId);
  };

  const onSubmit = async () => {
    try {
      const updated = await updatePersonMeta(person.id, { tagIds: [...selectedIds] });
      onClose(updated);
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_changes'));
    }
  };
</script>

<FormModal
  size="small"
  title={$t('tags')}
  icon={mdiTag}
  {onClose}
  {onSubmit}
  submitText={$t('save')}
  onOpenAutoFocus={(event) => event.preventDefault()}
>
  <div class="my-4 flex flex-col gap-2">
    <Combobox
      onSelect={handleSelect}
      label={$t('add_tag')}
      allowCreate
      defaultFirstOption
      options={allTags
        .filter((tag) => !selectedIds.has(tag.id))
        .map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
      placeholder={$t('search_tags')}
    />
  </div>

  <section class="flex flex-wrap pt-2 gap-1">
    {#each selectedIds as tagId (tagId)}
      {@const tag = tagMap[tagId]}
      {#if tag}
        <TagPill label={tag.value} onRemove={() => handleRemove(tagId)} />
      {/if}
    {/each}
  </section>
</FormModal>
