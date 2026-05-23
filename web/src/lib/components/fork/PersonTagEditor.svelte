<script lang="ts">
  import PersonTagModal from '$lib/components/fork/PersonTagModal.svelte';
  import { Route } from '$lib/route';
  import { updatePersonMeta } from '$lib/fork/api';
  import type { EnrichedPersonResponseDto } from '$lib/fork/types';
  import { handleError } from '$lib/utils/handle-error';
  import { Badge, Button, IconButton, Link, modalManager } from '@immich/ui';
  import { mdiClose, mdiPlus } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    person: EnrichedPersonResponseDto;
    onUpdate: (updated: EnrichedPersonResponseDto) => void;
  }

  let { person, onUpdate }: Props = $props();

  const handleRemove = async (tagId: string) => {
    try {
      const remaining = person.tags.filter((tag) => tag.id !== tagId).map((tag) => tag.id);
      const updated = await updatePersonMeta(person.id, { tagIds: remaining });
      onUpdate(updated);
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_changes'));
    }
  };

  const openModal = async () => {
    const updated = await modalManager.show(PersonTagModal, { person });
    if (updated) {
      onUpdate(updated);
    }
  };
</script>

<section class="mt-4">
  <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{$t('tags')}</p>
  <section class="flex flex-wrap gap-1 items-center">
    {#each person.tags as tag (tag.id)}
      <Badge size="small" class="items-center px-0" shape="round">
        <Link
          href={Route.tags({ path: tag.value })}
          class="text-light no-underline rounded-full hover:bg-primary-400 px-2"
        >
          {tag.value}
        </Link>
        <IconButton
          aria-label={$t('remove_tag')}
          icon={mdiClose}
          onclick={() => handleRemove(tag.id)}
          size="tiny"
          class="hover:bg-primary-400"
          shape="round"
        />
      </Badge>
    {/each}
    <Button leadingIcon={mdiPlus} onclick={openModal} size="small" variant="ghost" color="secondary" shape="round">
      {$t('add_tag')}
    </Button>
  </section>
</section>
