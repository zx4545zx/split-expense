<script lang="ts">
  import { getInitials, getAvatarColor } from '$lib/utils';

  interface Props {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    src?: string;
    class?: string;
  }

  let {
    name,
    size = 'md',
    src,
    class: className = '',
  }: Props = $props();

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  let bgColor = $derived(getAvatarColor(name));
  let initials = $derived(getInitials(name));
</script>

<div class="{sizeClasses[size]} {bgColor} {className} rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
  {#if src}
    <img {src} alt={name} class="w-full h-full object-cover" />
  {:else}
    {initials}
  {/if}
</div>
