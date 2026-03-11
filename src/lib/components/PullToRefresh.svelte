<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ArrowDown, RefreshCw, Check } from 'lucide-svelte';

  interface Props {
    children: Snippet;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
  }

  let { children, onRefresh, disabled = false }: Props = $props();

  let isRefreshing = $state(false);
  let isPulling = $state(false);
  let pullDistance = $state(0);
  let startY = $state(0);
  let refreshIndicator: HTMLDivElement;

  const PULL_THRESHOLD = 80; // Distance to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  function handleTouchStart(e: TouchEvent) {
    if (disabled || isRefreshing) return;
    
    // Only trigger if at top of page
    if (window.scrollY > 0) return;
    
    startY = e.touches[0].clientY;
    isPulling = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPulling || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    // Only allow pulling down
    if (diff > 0 && window.scrollY === 0) {
      // Prevent default scrolling when pulling
      if (diff < MAX_PULL) {
        e.preventDefault();
      }
      
      // Apply resistance to make it feel natural
      pullDistance = Math.min(diff * 0.6, MAX_PULL);
    }
  }

  async function handleTouchEnd() {
    if (!isPulling || disabled) return;
    
    isPulling = false;
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      isRefreshing = true;
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Reset after a short delay to show success state
        setTimeout(() => {
          isRefreshing = false;
          pullDistance = 0;
        }, 500);
      }
    } else {
      // Spring back if not pulled enough
      pullDistance = 0;
    }
  }

  // Desktop support - use keyboard shortcut (Ctrl+R or F5)
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      triggerRefresh();
    }
  }

  async function triggerRefresh() {
    if (isRefreshing || disabled) return;
    
    isRefreshing = true;
    pullDistance = PULL_THRESHOLD;
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        isRefreshing = false;
        pullDistance = 0;
      }, 500);
    }
  }

  // Calculate progress (0-1)
  let progress = $derived(Math.min(pullDistance / PULL_THRESHOLD, 1));
  
  // Indicator rotation based on progress
  let rotation = $derived(progress * 180);
</script>

<svelte:window onkeydown={handleKeyDown} />

<div 
  class="relative overflow-hidden"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ontouchcancel={() => { isPulling = false; pullDistance = 0; }}
>
  <!-- Pull Indicator -->
  <div 
    bind:this={refreshIndicator}
    class="absolute left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200"
    style="top: {pullDistance - 60}px; opacity: {Math.min(pullDistance / 40, 1)};"
  >
    <div class="bg-white rounded-full shadow-lg p-3 flex items-center gap-2 transition-all duration-200
      {pullDistance >= PULL_THRESHOLD || isRefreshing ? 'scale-110' : 'scale-100'}">
      {#if isRefreshing}
        <RefreshCw class="w-5 h-5 text-primary-600 animate-spin" />
        <span class="text-sm font-medium text-primary-600">กำลังโหลด...</span>
      {:else if pullDistance >= PULL_THRESHOLD}
        <Check class="w-5 h-5 text-success-600" />
        <span class="text-sm font-medium text-success-600">ปล่อยเพื่อโหลด</span>
      {:else}
        <ArrowDown 
          class="w-5 h-5 text-gray-400 transition-transform duration-200"
          style="transform: rotate({rotation}deg)"
        />
        <span class="text-sm text-gray-500">ดึงลงเพื่อโหลดใหม่</span>
      {/if}
    </div>
  </div>

  <!-- Content with pull transform -->
  <div 
    class="transition-transform duration-200 ease-out"
    style="transform: translateY({pullDistance}px);"
    class:pointer-events-none={isPulling && pullDistance > 0}
  >
    {@render children()}
  </div>
</div>

<style>
  /* Smooth pull animation */
  .transition-transform {
    will-change: transform;
  }

  /* Prevent text selection during pull */
  div {
    user-select: none;
    -webkit-user-select: none;
  }
</style>
