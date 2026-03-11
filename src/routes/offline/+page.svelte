<script>
  import { Button, Card } from '$lib/components';
  import { WifiOff, RefreshCw } from 'lucide-svelte';
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <Card class="text-center max-w-md w-full py-12">
    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <WifiOff class="w-10 h-10 text-gray-400" />
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h1>
    <p class="text-gray-500 mb-6">
      โปรดตรวจสอบการเชื่อมต่อของคุณ หรือลองโหลดหน้านี้อีกครั้ง
    </p>
    <Button onclick={() => window.location.reload()} fullWidth>
      <RefreshCw class="w-4 h-4" />
      ลองใหม่
    </Button>
  </Card>
</div>
