<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Button, Card, Input, Modal, Header, Avatar, Skeleton, GroupSkeleton, PullToRefresh } from '$lib/components';
  import { getSupabaseClient } from '$lib/supabase';
  import { toastStore, isLoading, currentGroup, groupMembers } from '$lib/stores';
  import { formatDate } from '$lib/utils';
  import type { Group, GroupMember, Bill, BillSplit } from '$lib/types';
  import {
    Users, Plus, ArrowRight, Trash2, Receipt, Calculator,
    ChevronRight, UserPlus, X, RefreshCw, Grid
  } from 'lucide-svelte';

  const groupId = page.params.id as string;
  const supabase = getSupabaseClient();

  let group = $state<Group | null>(null);
  let members = $state<GroupMember[]>([]);
  let bills = $state<(Bill & { bill_splits: (BillSplit & { member: GroupMember })[], payer: GroupMember | null })[]>([]);
  let activeTab = $state<'bills' | 'members' | 'summary'>('bills');

  // Modals
  let isAddMemberModalOpen = $state(false);
  let newMemberName = $state('');
  let isSubmitting = $state(false);
  
  // Loading states
  let isInitialLoading = $state(true);
  let isRefreshing = $state(false);

  async function loadGroup() {
    try {
      const { data, error } = await supabase!
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      group = data;
      currentGroup.set(data);
    } catch (error) {
      console.error('Error loading group:', error);
      toastStore.add({
        message: 'ไม่สามารถโหลดข้อมูลกลุ่มได้',
        type: 'error',
      });
    }
  }

  async function loadMembers() {
    try {
      const { data, error } = await supabase!
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      members = data || [];
      groupMembers.set(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }

  async function loadBills() {
    try {
      const { data: billsData, error: billsError } = await supabase!
        .from('bills')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (billsError) throw billsError;

      // Load splits for each bill
      const billsWithSplits = await Promise.all(
        (billsData || []).map(async (bill) => {
          const { data: splitsData } = await supabase!
            .from('bill_splits')
            .select('*')
            .eq('bill_id', bill.id);

          const splitsWithMembers = (splitsData || []).map((split) => ({
            ...split,
            member: members.find((m) => m.id === split.member_id) || { id: split.member_id, name: 'Unknown', group_id: '', user_id: null, created_at: '' },
          }));

          return {
            ...bill,
            bill_splits: splitsWithMembers,
            payer: members.find((m) => m.id === bill.payer_member_id) || null,
          };
        })
      );

      bills = billsWithSplits;
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  }

  async function refreshAllData() {
    isRefreshing = true;
    try {
      await Promise.all([
        loadGroup(),
        loadMembers(),
        loadBills()
      ]);
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

  async function addMember() {
    if (!newMemberName.trim()) {
      toastStore.add({
        message: 'กรุณาใส่ชื่อสมาชิก',
        type: 'warning',
      });
      return;
    }

    isSubmitting = true;
    try {
      const { error } = await supabase!
        .from('group_members')
        .insert({
          group_id: groupId,
          name: newMemberName.trim(),
        });

      if (error) throw error;

      toastStore.add({
        message: 'เพิ่มสมาชิกสำเร็จ',
        type: 'success',
      });

      newMemberName = '';
      isAddMemberModalOpen = false;
      await loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toastStore.add({
        message: 'ไม่สามารถเพิ่มสมาชิกได้',
        type: 'error',
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิกนี้?')) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toastStore.add({
        message: 'ลบสมาชิกสำเร็จ',
        type: 'success',
      });

      await loadMembers();
      await loadBills();
    } catch (error) {
      console.error('Error removing member:', error);
      toastStore.add({
        message: 'ไม่สามารถลบสมาชิกได้',
        type: 'error',
      });
    }
  }

  async function deleteBill(billId: string) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบิลนี้?')) {
      return;
    }

    try {
      const { error } = await supabase!.from('bills').delete().eq('id', billId);
      if (error) throw error;

      toastStore.add({
        message: 'ลบบิลสำเร็จ',
        type: 'success',
      });

      await loadBills();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toastStore.add({
        message: 'ไม่สามารถลบบิลได้',
        type: 'error',
      });
    }
  }

  function calculateSummary() {
    const summary: Record<string, { 
      member: GroupMember; 
      paid: number; 
      owes: number;
      net: number;
    }> = {};

    members.forEach((m) => {
      summary[m.id] = { member: m, paid: 0, owes: 0, net: 0 };
    });

    bills.forEach((bill) => {
      // Amount paid by payer
      if (bill.payer_member_id && summary[bill.payer_member_id]) {
        summary[bill.payer_member_id].paid += Number(bill.total_amount);
      }

      // Amount owed by each member
      bill.bill_splits.forEach((split) => {
        if (summary[split.member_id]) {
          summary[split.member_id].owes += Number(split.amount_owed);
        }
      });
    });

    // Calculate net (positive = should receive, negative = should pay)
    Object.values(summary).forEach((s) => {
      s.net = s.paid - s.owes;
    });

    return Object.values(summary).sort((a, b) => b.net - a.net);
  }

  onMount(async () => {
    isLoading.set(true);
    await loadGroup();
    await loadMembers();
    await loadBills();
    isLoading.set(false);
    isInitialLoading = false;
  });

  let summary = $derived(calculateSummary());
  let totalAmount = $derived(bills.reduce((sum, b) => sum + Number(b.total_amount), 0));
</script>

{#if group}
  <Header 
    title={group.name} 
    subtitle="{members.length} สมาชิก · {bills.length} บิล"
    showBack 
    backUrl="/"
  >
    {#snippet children()}
      <a
        href="/groups/{groupId}/bills/new"
        class="p-2 rounded-xl text-primary-600 hover:bg-primary-50 transition-colors"
      >
        <Plus class="w-5 h-5" />
      </a>
    {/snippet}
  </Header>

  <PullToRefresh onRefresh={refreshAllData}>
    <main class="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
      <!-- Summary Card -->
      <Card class="mt-4 mb-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white border-0 animate-fade-in">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-primary-100 text-sm mb-1">ยอดรวมทั้งหมด</p>
            {#if isInitialLoading}
              <Skeleton width="8rem" height="2.5rem" class="bg-white/30" />
            {:else}
              <p class="text-3xl font-bold">{totalAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</p>
            {/if}
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Receipt class="w-6 h-6 text-white" />
          </div>
        </div>
      </Card>

      <!-- Refresh hint for desktop -->
      <div class="hidden md:flex justify-end mb-2">
        <button 
          onclick={refreshAllData}
          class="text-xs text-gray-400 flex items-center gap-1 hover:text-primary-600 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw class="w-3 h-3 {isRefreshing ? 'animate-spin' : ''}" />
          {isRefreshing ? 'กำลังโหลด...' : 'ดึงลงเพื่อโหลดใหม่'}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-2 animate-fade-in" style="animation-delay: 100ms">
        <button
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
            {activeTab === 'bills' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}"
          onclick={() => activeTab = 'bills'}
        >
          <Receipt class="w-4 h-4 inline mr-1" />
          บิล ({bills.length})
        </button>
        <button
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
            {activeTab === 'members' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}"
          onclick={() => activeTab = 'members'}
        >
          <Users class="w-4 h-4 inline mr-1" />
          สมาชิก ({members.length})
        </button>
        <button
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
            {activeTab === 'summary' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}"
          onclick={() => activeTab = 'summary'}
        >
          <Calculator class="w-4 h-4 inline mr-1" />
          สรุปยอด
        </button>
      </div>

      <!-- Bills Tab -->
      {#if activeTab === 'bills'}
        <div class="space-y-3 animate-fade-in" style="animation-delay: 150ms">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">รายการบิล</h3>
            <a
              href="/groups/{groupId}/bills/new"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus class="w-4 h-4" />
              เพิ่มบิล
            </a>
          </div>

          {#if isInitialLoading}
            <!-- Loading Skeleton -->
            {#each Array(3) as _, i}
              <Card class="animate-pulse" style="animation-delay: {i * 100}ms">
                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <Skeleton width="60%" height="1.25rem" />
                    <Skeleton width="4rem" height="1.25rem" />
                  </div>
                  <Skeleton width="8rem" height="2rem" />
                  <div class="flex gap-3">
                    <Skeleton width="5rem" height="0.875rem" />
                    <Skeleton width="4rem" height="0.875rem" />
                  </div>
                </div>
              </Card>
            {/each}
          {:else if bills.length === 0}
            <Card class="text-center py-12 animate-scale-in">
              <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt class="w-8 h-8 text-gray-400" />
              </div>
              <h4 class="text-lg font-medium text-gray-900 mb-2">ยังไม่มีบิล</h4>
              <p class="text-gray-500 text-sm mb-4">เพิ่มบิลแรกของกลุ่มนี้</p>
              <a href="/groups/{groupId}/bills/new">
                <Button>
                  <Plus class="w-4 h-4" />
                  เพิ่มบิล
                </Button>
              </a>
            </Card>
          {:else}
            <div class="space-y-3">
              {#each bills as bill, i (bill.id)}
                <a href="/groups/{groupId}/bills/{bill.id}" class="block">
                <Card class="group animate-slide-in cursor-pointer hover:bg-gray-50 p-4" style="animation-delay: {i * 50}ms">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-semibold text-gray-900">{bill.description}</h4>
                        <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {bill.split_type === 'equal' ? 'หารเท่า' : bill.split_type === 'percentage' ? 'หาร %' : 'กำหนดเอง'}
                        </span>
                      </div>
                      <p class="text-2xl font-bold text-primary-600 mb-2">
                        {Number(bill.total_amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                      </p>
                      <div class="flex items-center gap-3 text-sm text-gray-500">
                        {#if bill.payer}
                          <span class="flex items-center gap-1">
                            <Avatar name={bill.payer.name} size="xs" />
                            {bill.payer.name} จ่าย
                          </span>
                        {/if}
                        <span>{formatDate(bill.created_at)}</span>
                      </div>

                      <!-- Splits Preview -->
                      {#if bill.bill_splits.length > 0}
                        <div class="mt-3 pt-3 border-t border-gray-100">
                          <p class="text-xs text-gray-500 mb-2">รายละเอียดการหาร:</p>
                          <div class="flex flex-wrap gap-2">
                            {#each bill.bill_splits as split}
                              <span class="text-xs px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-1">
                                <Avatar name={split.member.name} size="xs" />
                                {split.member.name}: {Number(split.amount_owed).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                              </span>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                    <button
                      onclick={() => deleteBill(bill.id)}
                      class="p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </Card>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Members Tab -->
      {#if activeTab === 'members'}
        <div class="space-y-3 animate-fade-in" style="animation-delay: 150ms">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">สมาชิกในกลุ่ม</h3>
            <button
              onclick={() => isAddMemberModalOpen = true}
              class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <UserPlus class="w-4 h-4" />
              เพิ่มสมาชิก
            </button>
          </div>

          {#if isInitialLoading}
            <!-- Loading Skeleton -->
            {#each Array(4) as _, i}
              <Card padding="sm" class="flex items-center justify-between animate-pulse" style="animation-delay: {i * 80}ms">
                <div class="flex items-center gap-3">
                  <Skeleton width="2.5rem" height="2.5rem" circle />
                  <div class="space-y-2">
                    <Skeleton width="6rem" height="0.875rem" />
                    <Skeleton width="4rem" height="0.75rem" />
                  </div>
                </div>
                <Skeleton width="2rem" height="2rem" circle />
              </Card>
            {/each}
          {:else if members.length === 0}
            <Card class="text-center py-12 animate-scale-in">
              <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users class="w-8 h-8 text-gray-400" />
              </div>
              <h4 class="text-lg font-medium text-gray-900 mb-2">ยังไม่มีสมาชิก</h4>
              <p class="text-gray-500 text-sm mb-4">เพิ่มสมาชิกเข้ากลุ่ม</p>
              <Button onclick={() => isAddMemberModalOpen = true}>
                <UserPlus class="w-4 h-4" />
                เพิ่มสมาชิก
              </Button>
            </Card>
          {:else}
            <div class="grid gap-2">
              {#each members as member, i (member.id)}
                <Card padding="sm" class="flex items-center justify-between animate-slide-in" style="animation-delay: {i * 40}ms">
                  <div class="flex items-center gap-3">
                    <Avatar name={member.name} />
                    <div>
                      <p class="font-medium text-gray-900">{member.name}</p>
                      <p class="text-xs text-gray-500">เข้าร่วม {formatDate(member.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onclick={() => removeMember(member.id)}
                    class="p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Summary Tab -->
      {#if activeTab === 'summary'}
        <div class="space-y-4 animate-fade-in" style="animation-delay: 150ms">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">สรุปยอดการเงิน</h3>
            <Button variant="primary" onclick={() => goto(`/groups/${groupId}/summary`)} class="gap-1 text-sm">
              <Grid class="w-4 h-4" />
              ดูตาราง
            </Button>
          </div>
          
          {#if isInitialLoading}
            <!-- Loading Skeleton -->
            {#each Array(4) as _, i}
              <Card class={i % 2 === 0 ? 'border-l-4 border-l-success-500' : 'border-l-4 border-l-danger-500'}>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <Skeleton width="2.5rem" height="2.5rem" circle />
                    <div class="space-y-2">
                      <Skeleton width="5rem" height="0.875rem" />
                      <Skeleton width="8rem" height="0.75rem" />
                    </div>
                  </div>
                  <div class="text-right space-y-1">
                    <Skeleton width="5rem" height="1.25rem" />
                    <Skeleton width="4rem" height="0.75rem" />
                  </div>
                </div>
              </Card>
            {/each}
          {:else if summary.length === 0}
            <Card class="text-center py-12 animate-scale-in">
              <p class="text-gray-500">ไม่มีข้อมูล</p>
            </Card>
          {:else}
            <div class="space-y-3">
              {#each summary as item, i}
                <Card class={item.net >= 0 ? 'border-l-4 border-l-success-500' : 'border-l-4 border-l-danger-500'}>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <Avatar name={item.member.name} />
                      <div>
                        <p class="font-medium text-gray-900">{item.member.name}</p>
                        <div class="flex gap-3 text-xs text-gray-500">
                          <span>จ่ายไป: {item.paid.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                          <span>ต้องจ่าย: {item.owes.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold {item.net >= 0 ? 'text-success-600' : 'text-danger-600'}">
                        {item.net >= 0 ? '+' : ''}{item.net.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                      </p>
                      <p class="text-xs text-gray-500">
                        {item.net >= 0 ? 'ต้องได้รับ' : 'ต้องจ่ายเพิ่ม'}
                      </p>
                    </div>
                  </div>
                </Card>
              {/each}
            </div>

            <!-- Settlement Suggestions -->
            {#if summary.length > 0}
              <Card class="mt-6">
                <h4 class="font-semibold text-gray-900 mb-4">คำแนะนำการเคลียร์ยอด</h4>
                {@const debtors = summary.filter(s => s.net < 0).sort((a, b) => a.net - b.net)}
                {@const creditors = summary.filter(s => s.net > 0).sort((a, b) => b.net - a.net)}
                
                {#if debtors.length === 0 && creditors.length === 0}
                  <p class="text-gray-500 text-center py-4">ยอดเท่ากันหมดแล้ว! 🎉</p>
                {:else}
                  <div class="space-y-2">
                    {#each debtors as debtor}
                      {@const remainingDebt = Math.abs(debtor.net)}
                      {#if remainingDebt > 0.01}
                        <div class="text-sm">
                          <span class="font-medium text-gray-900">{debtor.member.name}</span>
                          <span class="text-gray-600"> ต้องจ่าย </span>
                          <span class="font-medium text-danger-600">{remainingDebt.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}
              </Card>
            {/if}
          {/if}
        </div>
      {/if}
    </main>
  </PullToRefresh>

  <!-- Add Member Modal -->
  <Modal
    title="เพิ่มสมาชิก"
    isOpen={isAddMemberModalOpen}
    onClose={() => isAddMemberModalOpen = false}
  >
    <div class="space-y-4">
      <Input
        label="ชื่อสมาชิก"
        placeholder="เช่น นาย A, พี่ B"
        bind:value={newMemberName}
        required
      />
      
      <div class="flex gap-3 pt-2">
        <Button
          variant="secondary"
          onclick={() => isAddMemberModalOpen = false}
          class="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          onclick={addMember}
          loading={isSubmitting}
          class="flex-1"
        >
          เพิ่มสมาชิก
        </Button>
      </div>
    </div>
  </Modal>
{/if}
