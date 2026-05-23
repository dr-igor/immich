<script lang="ts">
  import { updatePersonMeta } from '$lib/fork/api';
  import type { EnrichedPersonResponseDto } from '$lib/fork/types';
  import { handleError } from '$lib/utils/handle-error';
  import { t } from 'svelte-i18n';

  interface Props {
    person: EnrichedPersonResponseDto;
    onUpdate: (updated: EnrichedPersonResponseDto) => void;
  }

  let { person, onUpdate }: Props = $props();

  let draft = $state(person.note ?? '');
  let isSaving = $state(false);

  const save = async () => {
    isSaving = true;
    try {
      const updated = await updatePersonMeta(person.id, { note: draft || null });
      onUpdate(updated);
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_changes'));
    } finally {
      isSaving = false;
    }
  };
</script>

<section class="mt-4">
  <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{$t('description')}</p>
  <textarea
    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-immich-primary resize-none"
    rows="3"
    placeholder={$t('add_a_note')}
    bind:value={draft}
    onblur={save}
    disabled={isSaving}
  ></textarea>
</section>
