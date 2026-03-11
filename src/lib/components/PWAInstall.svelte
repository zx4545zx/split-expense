<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import Button from './Button.svelte';
  import { Download, X, Smartphone } from 'lucide-svelte';

  // PWA Install Prompt
  let deferredPrompt: any = null;
  let showInstallPrompt = $state(false);
  let isInstalled = $state(false);

  onMount(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled = true;
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      deferredPrompt = e;
      // Show our custom install prompt
      showInstallPrompt = true;
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      showInstallPrompt = false;
      isInstalled = true;
      console.log('PWA was installed');
    });

    // Check if user dismissed the prompt previously
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24);
      // Show again after 7 days
      if (daysDiff < 7) {
        showInstallPrompt = false;
      }
    }
  });

  async function installPWA() {
    if (!deferredPrompt) {
      // If no deferred prompt, try to open in App Store or show instructions
      showManualInstallInstructions();
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      isInstalled = true;
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    deferredPrompt = null;
    showInstallPrompt = false;
  }

  function dismissPrompt() {
    showInstallPrompt = false;
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  }

  function showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      alert('วิธีติดตั้งบน iPhone/iPad:\n\n1. แตะปุ่ม "แชร์" (Share) ที่ด้านล่าง\n2. เลื่อนลงและแตะ "เพิ่มลงในหน้าจอโฮม" (Add to Home Screen)\n3. แตะ "เพิ่ม" (Add)');
    } else if (isAndroid) {
      alert('วิธีติดตั้งบน Android:\n\n1. แตะปุ่มเมนู (⋮) ที่มุมขวาบน\n2. เลือก "ติดตั้งแอพ" หรือ "เพิ่มลงในหน้าจอโฮม"\n3. แตะ "ติดตั้ง"');
    } else {
      alert('วิธีติดตั้ง:\n\nChrome: แต่ที่เมนู (⋮) → ติดตั้งแอพ Split Expense\nSafari: แต่ที่แชร์ → เพิ่มลงในหน้าจอโฮม');
    }
  }

  // Manual install button for testing
  function showInstallButton() {
    showInstallPrompt = true;
  }
</script>

{#if showInstallPrompt && !isInstalled}
  <div 
    class="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
    transition:fly={{ y: 100, duration: 300 }}
  >
    <div class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone class="w-6 h-6 text-primary-600" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-gray-900">ติดตั้งแอพ</h4>
          <p class="text-sm text-gray-500 mt-1">
            ติดตั้ง Split Expense บนมือถือเพื่อใช้งานได้เร็วขึ้น แม้ไม่มีอินเทอร์เน็ต!
          </p>
          <div class="flex gap-2 mt-3">
            <Button onclick={installPWA} class="flex-1 text-sm py-2">
              <Download class="w-4 h-4" />
              ติดตั้งเลย
            </Button>
            <Button variant="ghost" onclick={dismissPrompt} class="px-3">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Install button for settings/menu (always visible when not installed) -->
{#if !isInstalled}
  <button 
    onclick={showInstallButton}
    class="hidden"
    id="pwa-install-trigger"
  >
    ติดตั้งแอพ
  </button>
{/if}
