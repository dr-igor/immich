<script lang="ts">
  import PersonTagEditor from '$lib/components/fork/PersonTagEditor.svelte';
  import type { EnrichedPersonResponseDto } from '$lib/fork/types';
  import { TooltipProvider } from '@immich/ui';

  interface Props {
    person: EnrichedPersonResponseDto;
    onUpdate: (updated: EnrichedPersonResponseDto) => void;
  }

  let props: Props = $props();
</script>

<TooltipProvider>
  <PersonTagEditor {...props} />
</TooltipProvider>
