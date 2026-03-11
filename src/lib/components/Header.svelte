<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    backUrl?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle,
    showBack = false,
    backUrl,
    children,
  }: Props = $props();

  function goBack() {
    if (backUrl) {
      window.location.href = backUrl;
    } else {
      history.back();
    }
  }
</script>

<header class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 safe-top">
  <div class="max-w-2xl mx-auto px-4 sm:px-6">
    <div class="flex items-center h-14 sm:h-16 gap-3">
      {#if showBack}
        <button
          onclick={goBack}
          class="p-2 -ml-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      {/if}

      <div class="flex-1 min-w-0">
        {#if title}
          <h1 class="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
        {/if}
        {#if subtitle}
          <p class="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>
        {/if}
      </div>

      {@render children?.()}
    </div>
  </div>
</header>
