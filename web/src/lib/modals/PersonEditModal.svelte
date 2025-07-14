<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    notificationController,
    NotificationType,
  } from '$lib/components/shared-components/notification/notification';
  import { handleError } from '$lib/utils/handle-error';
  import { updatePerson, getAllTags, type PersonResponseDto, type TagResponseDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiAccountEdit, mdiTag, mdiClose } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import DateInput from '../components/elements/date-input.svelte';
  import Combobox from '../components/shared-components/combobox.svelte';
  import Icon from '../components/elements/icon.svelte';

  interface Props {
    person: PersonResponseDto;
    onClose: (updatedPerson?: PersonResponseDto) => void;
  }

  let { person, onClose }: Props = $props();

  let name = $state(person.name || '');
  let birthDate = $state(person.birthDate ?? '');
  let description = $state(person.description || '');
  let isHidden = $state(person.isHidden);
  let isFavorite = $state(person.isFavorite || false);
  let color = $state(person.color || '');

  let allTags: TagResponseDto[] = $state([]);
  let selectedTagIds = new Set<string>();

  const todayFormatted = new Date().toISOString().split('T')[0];

  onMount(async () => {
    try {
      allTags = await getAllTags();
      if (person.tags) {
        person.tags.forEach(tag => selectedTagIds.add(tag.id));
      }
    } catch (error) {
      handleError(error, $t('errors.unable_to_load_tags'));
    }
  });

  const handleSubmit = async () => {
    try {
      const updatedPerson = await updatePerson({
        id: person.id,
        personUpdateDto: {
          name,
          birthDate: birthDate || null,
          description,
          isHidden,
          isFavorite,
          color: color || null,
          tagIds: [...selectedTagIds],
        },
      });

      notificationController.show({
        message: $t('person_updated_successfully'),
        type: NotificationType.Info,
      });
      onClose(updatedPerson);
    } catch (error) {
      handleError(error, $t('errors.unable_to_update_person'));
    }
  };

  const handleTagSelect = (option: any) => {
    if (option.id) {
      selectedTagIds.add(option.value);
    }
  };

  const handleTagRemove = (tagId: string) => {
    selectedTagIds.delete(tagId);
  };
</script>

<Modal title={$t('edit_person')} icon={mdiAccountEdit} {onClose} size="medium">
  <ModalBody>
    <form onsubmit={handleSubmit} autocomplete="off" id="edit-person-form">
      <div class="flex flex-col gap-4">
        <!-- Name -->
        <div class="flex flex-col gap-2">
          <label for="name" class="text-sm font-medium">{$t('name')}</label>
          <input
            id="name"
            name="name"
            type="text"
            class="immich-form-input"
            bind:value={name}
            placeholder={$t('enter_person_name')}
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-2">
          <label for="description" class="text-sm font-medium">{$t('description')}</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            class="immich-form-input"
            bind:value={description}
            placeholder={$t('enter_person_description')}
          ></textarea>
        </div>

        <!-- Birth Date -->
        <div class="flex flex-col gap-2">
          <label for="birthDate" class="text-sm font-medium">{$t('date_of_birth')}</label>
          <DateInput
            class="immich-form-input"
            id="birthDate"
            name="birthDate"
            type="date"
            bind:value={birthDate}
            max={todayFormatted}
          />
          {#if birthDate}
            <div class="flex justify-end">
              <Button shape="round" color="secondary" size="small" onclick={() => (birthDate = '')}>
                {$t('clear')}
              </Button>
            </div>
          {/if}
        </div>

        <!-- Tags -->
        <div class="flex flex-col gap-2">
          <label for="tags" class="text-sm font-medium">{$t('tags')}</label>
          <Combobox
            onSelect={handleTagSelect}
            label={$t('tag')}
            allowCreate={true}
            defaultFirstOption
            options={allTags.map((tag) => ({ id: tag.id, label: tag.value, value: tag.id }))}
            placeholder={$t('search_tags')}
          />
          
          <!-- Selected Tags Display -->
          <section class="flex flex-wrap pt-2 gap-1">
            {#each selectedTagIds as tagId (tagId)}
              {@const tag = allTags.find(t => t.id === tagId)}
              {#if tag}
                <div class="flex group transition-all">
                  <span
                    class="inline-block h-min whitespace-nowrap ps-3 pe-1 group-hover:ps-3 py-1 text-center align-baseline leading-none text-gray-100 dark:text-immich-dark-gray bg-primary rounded-s-full hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
                  >
                    <p class="text-sm">{tag.value}</p>
                  </span>
                  <button
                    type="button"
                    class="text-gray-100 dark:text-immich-dark-gray bg-immich-primary/95 dark:bg-immich-dark-primary/95 rounded-e-full place-items-center place-content-center pe-2 ps-1 py-1 hover:bg-immich-primary/80 dark:hover:bg-immich-dark-primary/80 transition-all"
                    title={$t('remove_tag')}
                    onclick={() => handleTagRemove(tagId)}
                  >
                    <Icon path={mdiClose} />
                  </button>
                </div>
              {/if}
            {/each}
          </section>
        </div>

        <!-- Color -->
        <div class="flex flex-col gap-2">
          <label for="color" class="text-sm font-medium">{$t('color')}</label>
          <input
            id="color"
            name="color"
            type="color"
            class="w-20 h-10 border border-gray-300 rounded cursor-pointer"
            bind:value={color}
          />
        </div>

        <!-- Visibility and Favorite -->
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={isHidden}
              class="rounded"
            />
            <span class="text-sm">{$t('hide_person')}</span>
          </label>

          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={isFavorite}
              class="rounded"
            />
            <span class="text-sm">{$t('favorite')}</span>
          </label>
        </div>
      </div>
    </form>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => onClose()}>
        {$t('cancel')}
      </Button>
      <Button type="submit" shape="round" color="primary" fullWidth form="edit-person-form">
        {$t('save')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>