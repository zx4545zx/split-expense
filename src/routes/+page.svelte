<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Modal, Header, GroupSkeleton, Skeleton, PullToRefresh } from '$lib/components';
  import { getSupabaseClient } from '$lib/supabase';
  import { toastStore, isLoading } from '$lib/stores';
  import { formatDate } from '$lib/utils';
  import type { Group, GroupWithMembers } from '$lib/types';
  import { Users, Plus, ArrowRight, Trash2, Receipt, RefreshCw } from 'lucide-svelte';

  let groups = $state<GroupWithMembers[]>([]);
  let isCreateModalOpen = $state(false);
  let newGroupName = $state('');
  let isSubmitting = $state(false);
  let isInitialLoading = $state(true);
  let isRefreshing = $state(false);

  const supabase = getSupabaseClient();

  async function loadGroups() {
    isLoading.set(true);
    try {
      const { data: groupsData, error } = await supabase!
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load members count for each group
      const groupsWithMembers = await Promise.all(
        (groupsData || []).map(async (group) => {
          const [{ count: membersCount }, { count: billsCount }] = await Promise.all([
            supabase!.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', group.id),
            supabase!.from('bills').select('*', { count: 'exact', head: true }).eq('group_id', group.id),
          ]);

          return {
            ...group,
            members: [],
            membersCount: membersCount || 0,
            billsCount: billsCount || 0,
          };
        })
      );

      groups = groupsWithMembers;
    } catch (error) {
      console.error('Error loading groups:', error);
      toastStore.add({
        message: 'ไม่สามารถโหลดกลุ่มได้ กรุณาลองใหม่',
        type: 'error',
      });
    } finally {
      isLoading.set(false);
      isInitialLoading = false;
    }
  }

  async function refreshGroups() {
    isRefreshing = true;
    try {
      await loadGroups();
      toastStore.add({
        message: 'โหลดข้อมูลใหม่แล้ว',
        type: 'success',
      });
    } catch (error) {
      toastStore.add({
        message: 'ไม่สามารถโหลดข้อมูลได้',
        type: 'error',
      });
    } finally {
      isRefreshing = false;
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      toastStore.add({
        message: 'กรุณาใส่ชื่อกลุ่ม',
        type: 'warning',
      });
      return;
    }

    isSubmitting = true;
    try {
      const { data, error } = await supabase!
        .from('groups')
        .insert({ name: newGroupName.trim() })
        .select()
        .single();

      if (error) throw error;

      toastStore.add({
        message: 'สร้างกลุ่มสำเร็จ',
        type: 'success',
      });

      newGroupName = '';
      isCreateModalOpen = false;
      await loadGroups();
      
      // Navigate to the new group
      window.location.href = `/groups/${data.id}`;
    } catch (error) {
      console.error('Error creating group:', error);
      toastStore.add({
        message: 'ไม่สามารถสร้างกลุ่มได้ กรุณาลองใหม่',
        type: 'error',
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteGroup(groupId: string, event: Event) {
    event.stopPropagation();
    
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มนี้? ข้อมูลทั้งหมดจะถูกลบถาวร')) {
      return;
    }

    try {
      const { error } = await supabase!.from('groups').delete().eq('id', groupId);
      if (error) throw error;

      toastStore.add({
        message: 'ลบกลุ่มสำเร็จ',
        type: 'success',
      });

      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toastStore.add({
        message: 'ไม่สามารถลบกลุ่มได้ กรุณาลองใหม่',
        type: 'error',
      });
    }
  }

  onMount(() => {
    loadGroups();
  });
</script>

<Header title="Split Expense" subtitle="จัดการค่าใช้จ่ายกับเพื่อน" />

<PullToRefresh onRefresh={refreshGroups}>
  <main class="max-w-2xl mx-auto px-4 sm:px-6 py-6">
    <!-- Welcome Section -->
    <div class="mb-8 text-center sm:text-left animate-fade-in">
      <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        ยินดีต้อนรับ! 👋
      </h2>
      <p class="text-gray-600">
        สร้างกลุ่มเพื่อเริ่มต้นหารค่าใช้จ่ายกับเพื่อนๆ
      </p>
    </div>

    <!-- Create Button -->
    <Button 
      onclick={() => isCreateModalOpen = true}
      class="mb-6 shadow-lg shadow-primary-500/25 animate-fade-in"
      style="animation-delay: 100ms"
      fullWidth
    >
      <Plus class="w-5 h-5" />
      สร้างกลุ่มใหม่
    </Button>

    <!-- Refresh hint for desktop -->
    <div class="hidden md:flex justify-end mb-2">
      <button 
        onclick={refreshGroups}
        class="text-xs text-gray-400 flex items-center gap-1 hover:text-primary-600 transition-colors"
        disabled={isRefreshing}
      >
        <RefreshCw class="w-3 h-3 {isRefreshing ? 'animate-spin' : ''}" />
        {isRefreshing ? 'กำลังโหลด...' : 'ดึงลงเพื่อโหลดใหม่'}
      </button>
    </div>

    <!-- Groups List -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2 animate-fade-in" style="animation-delay: 150ms">
        <Users class="w-5 h-5 text-primary-600" />
        กลุ่มของคุณ
        {#if !isInitialLoading}
          <span class="text-sm font-normal text-gray-500">({groups.length})</span>
        {/if}
      </h3>

      {#if isInitialLoading}
        <!-- Loading Skeleton -->
        <GroupSkeleton count={3} />
      {:else if groups.length === 0}
        <Card class="text-center py-12 animate-scale-in">
          <div class="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users class="w-8 h-8 text-primary-600" />
          </div>
          <h4 class="text-lg font-medium text-gray-900 mb-2">ยังไม่มีกลุ่ม</h4>
          <p class="text-gray-500 text-sm mb-4">สร้างกลุ่มแรกของคุณเพื่อเริ่มต้น</p>
          <Button variant="outline" onclick={() => isCreateModalOpen = true}>
            <Plus class="w-4 h-4" />
            สร้างกลุ่ม
          </Button>
        </Card>
      {:else}
        <div class="grid gap-4">
          {#each groups as group, i (group.id)}
            <Card 
              hoverable
              onclick={() => window.location.href = `/groups/${group.id}`}
              class="group relative animate-slide-in"
              style="animation-delay: {i * 50}ms"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h4 class="text-lg font-semibold text-gray-900 mb-1 truncate group-hover:text-primary-600 transition-colors">
                    {group.name}
                  </h4>
                  <div class="flex items-center gap-4 text-sm text-gray-500">
                    <span class="flex items-center gap-1">
                      <Users class="w-4 h-4" />
                      {(group as any).membersCount || 0} สมาชิก
                    </span>
                    <span class="flex items-center gap-1">
                      <Receipt class="w-4 h-4" />
                      {(group as any).billsCount || 0} บิล
                    </span>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">
                    สร้างเมื่อ {formatDate(group.created_at)}
                  </p>
                </div>
                
                <div class="flex items-center gap-2">
                  <button
                    onclick={(e) => deleteGroup(group.id, e)}
                    class="p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete group"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                  <ArrowRight class="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </div>
  </main>
</PullToRefresh>

<!-- Create Group Modal -->
<Modal
  title="สร้างกลุ่มใหม่"
  isOpen={isCreateModalOpen}
  onClose={() => isCreateModalOpen = false}
>
  <div class="space-y-4">
    <Input
      label="ชื่อกลุ่ม"
      placeholder="เช่น ทริปพัทยา, ก๊วนกินข้าว"
      bind:value={newGroupName}
      required
    />
    
    <div class="flex gap-3 pt-2">
      <Button
        variant="secondary"
        onclick={() => isCreateModalOpen = false}
        class="flex-1"
      >
        ยกเลิก
      </Button>
      <Button
        onclick={createGroup}
        loading={isSubmitting}
        class="flex-1"
      >
        สร้างกลุ่ม
      </Button>
    </div>
  </div>
</Modal>
