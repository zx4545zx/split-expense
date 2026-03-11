<script lang="ts">
  import Skeleton from './Skeleton.svelte';

  interface Props {
    count?: number;
  }

  let { count = 3 }: Props = $props();
</script>

<div class="grid gap-4">
  {#each Array(count) as _, i}
    <div class="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 sm:p-5 animate-pulse-subtle" style="animation-delay: {i * 100}ms">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0 space-y-3">
          <!-- Title -->
          <Skeleton width="70%" height="1.25rem" />
          
          <!-- Stats -->
          <div class="flex items-center gap-4">
            <Skeleton width="5rem" height="0.875rem" />
            <Skeleton width="4rem" height="0.875rem" />
          </div>
          
          <!-- Date -->
          <Skeleton width="8rem" height="0.75rem" />
        </div>
        
        <!-- Arrow -->
        <Skeleton width="1.25rem" height="1.25rem" circle class="flex-shrink-0" />
      </div>
    </div>
  {/each}
</div>

<style>
  .animate-pulse-subtle {
    animation: pulse-subtle 2s ease-in-out infinite;
  }

  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
