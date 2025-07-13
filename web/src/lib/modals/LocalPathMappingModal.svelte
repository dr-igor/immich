<script lang="ts">
  import { localPathMappings } from '$lib/utils/local-path-mappings';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiLinkVariant } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    remotePath: string;
    onClose: () => void;
  }

  const { remotePath, onClose }: Props = $props();

  let localPath = $state('');
  const existing = $derived(localPathMappings.current.find((m) => m.remotePath === remotePath));

  $effect(() => {
    if (existing) {
      localPath = existing.localPath;
    }
  });

  function onsubmit(event: Event) {
    event.preventDefault();
    const mappings = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
    if (localPath.trim()) {
      mappings.push({ remotePath, localPath: localPath.trim() });
    }
    localPathMappings.current = mappings;
    onClose();
  }

  function handleRemove() {
    localPathMappings.current = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
    onClose();
  }

  function handleCancel() {
    onClose();
  }
</script>

<Modal icon={mdiLinkVariant} title={$t('configure_local_path_mapping')} size="small" onClose={handleCancel}>
  <ModalBody>
    <form {onsubmit} autocomplete="off" id="local-path-mapping-form">
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="remotePath">{$t('remote_path')}</label>
        <input id="remotePath" class="immich-form-input" value={remotePath} disabled />
      </div>
      <div class="my-4 flex flex-col gap-2">
        <label class="immich-form-label" for="localPath">{$t('local_path')}</label>
        <input id="localPath" class="immich-form-input" bind:value={localPath} placeholder="/Users/yourname/Pictures" />
      </div>
    </form>
  </ModalBody>
  <ModalFooter>
    <HStack fullWidth>
      <Button shape="round" color="secondary" fullWidth onclick={handleCancel}>{$t('cancel')}</Button>
      {#if existing}
        <Button shape="round" color="danger" fullWidth onclick={handleRemove}>{$t('remove')}</Button>
      {/if}
      <Button shape="round" type="submit" fullWidth form="local-path-mapping-form">{$t('save')}</Button>
    </HStack>
  </ModalFooter>
</Modal>
