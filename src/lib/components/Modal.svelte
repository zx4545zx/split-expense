<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  interface Props {
    children: Snippet;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
  }

  let {
    children,
    title,
    isOpen,
    onClose,
    size = 'md',
    showCloseButton = true,
  }: Props = $props();

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    transition:fade={{ duration: 200 }}
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
      onclick={onClose}
    ></div>

    <!-- Modal Content -->
    <div
      class="relative w-full {sizeClasses[size]} bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
      transition:scale={{ start: 0.95, duration: 200 }}
    >
      {#if title || showCloseButton}
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {#if title}
            <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
          {:else}
            <div></div>
          {/if}
          
          {#if showCloseButton}
            <button
              onclick={onClose}
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <div class="p-5">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
