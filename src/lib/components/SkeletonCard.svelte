<script lang="ts">
  import Skeleton from './Skeleton.svelte';

  interface Props {
    class?: string;
    rows?: number;
  }

  let {
    class: className = '',
    rows = 3,
  }: Props = $props();
</script>

<div class="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 sm:p-5 {className}">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-4">
    <Skeleton width="3rem" height="3rem" circle />
    <div class="flex-1 space-y-2">
      <Skeleton width="60%" height="1rem" />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  </div>
  
  <!-- Content -->
  <div class="space-y-3">
    {#each Array(rows) as _}
      <Skeleton width="100%" height="0.875rem" />
    {/each}
  </div>
  
  <!-- Footer -->
  <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
    <Skeleton width="30%" height="0.875rem" />
    <Skeleton width="20%" height="2rem" />
  </div>
</div>
