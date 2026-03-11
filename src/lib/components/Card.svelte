<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
    onclick?: () => void;
    hoverable?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }

  let {
    children,
    class: className = '',
    onclick,
    hoverable = false,
    padding = 'md',
  }: Props = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };
</script>

{#if onclick}
  <button
    class="w-full text-left bg-white rounded-2xl shadow-soft border border-gray-100 
      {paddingClasses[padding]}
      {hoverable ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5' : ''}
      {className}"
    onclick={onclick}
    type="button"
  >
    {@render children()}
  </button>
{:else}
  <div
    class="bg-white rounded-2xl shadow-soft border border-gray-100 
      {paddingClasses[padding]}
      {className}"
  >
    {@render children()}
  </div>
{/if}
