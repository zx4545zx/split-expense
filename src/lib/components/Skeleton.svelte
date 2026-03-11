<script lang="ts">
  interface Props {
    width?: string;
    height?: string;
    circle?: boolean;
    class?: string;
    count?: number;
  }

  let {
    width = '100%',
    height = '1rem',
    circle = false,
    class: className = '',
    count = 1,
  }: Props = $props();

  const items = Array.from({ length: count }, (_, i) => i);
</script>

{#each items as _}
  <div
    class="skeleton-pulse bg-gray-200 {circle ? 'rounded-full' : 'rounded-lg'} {className}"
    style="width: {width}; height: {height};"
  ></div>
{/each}

<style>
  .skeleton-pulse {
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    background: linear-gradient(
      90deg,
      rgb(229 231 235) 0%,
      rgb(243 244 246) 50%,
      rgb(229 231 235) 100%
    );
    background-size: 200% 100%;
  }

  @keyframes skeleton-pulse {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
