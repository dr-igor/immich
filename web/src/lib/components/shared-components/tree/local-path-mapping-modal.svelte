<script lang="ts">
  import { localPathMappings } from '$lib/utils/local-path-mappings';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiLinkVariant } from '@mdi/js';
  import { createEventDispatcher } from 'svelte';

  const { remotePath } = $props<{ remotePath: string }>();
  const dispatch = createEventDispatcher();

  let localPath = $state('');

  const existing = $derived(localPathMappings.current.find((m) => m.remotePath === remotePath));
  $effect(() => {
    if (existing) {
      localPath = existing.localPath;
    }
  });

  function save() {
    const mappings = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
    if (localPath.trim()) {
      mappings.push({ remotePath, localPath: localPath.trim() });
    }
    localPathMappings.current = mappings;
    dispatch('close');
  }

  function remove() {
    localPathMappings.current = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
    dispatch('close');
  }
</script>

<Modal icon={mdiLinkVariant} title="Configure Local Path Mapping" size="small" onClose={() => dispatch('close')}>
  <ModalBody>
    <form autocomplete="off" on:submit|preventDefault={save} id="local-path-mapping-form">
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label">Remote Path</label>
        <div class="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">{remotePath}</div>
      </div>
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="localPath">Local Path</label>
        <input id="localPath" class="immich-form-input" bind:value={localPath} placeholder="/Users/yourname/Pictures" />
      </div>
    </form>
  </ModalBody>
  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={() => dispatch('close')}>Cancel</Button>
      {#if existing}
        <Button shape="round" color="danger" fullWidth onclick={remove}>Remove</Button>
      {/if}
      <Button shape="round" type="submit" fullWidth form="local-path-mapping-form">Save</Button>
    </HStack>
  </ModalFooter>
</Modal>
