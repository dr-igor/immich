<script lang="ts">
  import { goto } from '$app/navigation';
  import { AppRoute, QueryParameter } from '$lib/constants';
  import type { AssetResponseDto } from '@immich/sdk';
  import { mdiImageSearch } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { IconButton } from '@immich/ui';

  interface Props {
    asset: AssetResponseDto;
  }

  let { asset }: Props = $props();

  const searchByImage = async () => {
    const searchParams = new URLSearchParams();
    const searchQuery = JSON.stringify({ assetId: asset.id });
    searchParams.set(QueryParameter.QUERY, searchQuery);
    
    await goto(`${AppRoute.SEARCH}?${searchParams.toString()}`);
  };
</script>

<IconButton
  color="secondary"
  shape="round"
  variant="ghost"
  icon={mdiImageSearch}
  aria-label={$t('search_similar_images')}
  onclick={searchByImage}
/>