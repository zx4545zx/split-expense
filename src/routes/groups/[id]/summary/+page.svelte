<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Button, Card, Header, Avatar } from '$lib/components';
  import { getSupabaseClient } from '$lib/supabase';
  import { toastStore, isLoading } from '$lib/stores';
  import { formatCurrency, formatDate, copyToClipboard } from '$lib/utils';
  import type { Group, GroupMember, Bill, BillSplit } from '$lib/types';
  import { Calculator, ArrowRightLeft, Copy, Check, Users, Receipt } from 'lucide-svelte';

  const groupId = page.params.id as string;
  const supabase = getSupabaseClient();

  let group = $state<Group | null>(null);
  let members = $state<GroupMember[]>([]);
  let bills = $state<(Bill & { bill_splits: (BillSplit & { member: GroupMember })[], payer: GroupMember | null })[]>([]);
  let copied = $state(false);

  async function loadData() {
    isLoading.set(true);
    try {
      // Load group
      const { data: groupData } = await supabase!
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      group = groupData;

      // Load members
      const { data: membersData } = await supabase!
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      members = membersData || [];

      // Load bills with splits
      const { data: billsData } = await supabase!
        .from('bills')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      const billsWithSplits = await Promise.all(
        (billsData || []).map(async (bill) => {
          const { data: splitsData } = await supabase!
            .from('bill_splits')
            .select('*')
            .eq('bill_id', bill.id);

          const splitsWithMembers = (splitsData || []).map((split) => ({
            ...split,
            member: members.find((m) => m.id === split.member_id) || { 
              id: split.member_id, name: 'Unknown', group_id: '', user_id: null, created_at: '' 
            },
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
      console.error('Error loading data:', error);
      toastStore.add({
        message: 'ไม่สามารถโหลดข้อมูลได้',
        type: 'error',
      });
    } finally {
      isLoading.set(false);
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
      if (bill.payer_member_id && summary[bill.payer_member_id]) {
        summary[bill.payer_member_id].paid += Number(bill.total_amount);
      }

      bill.bill_splits.forEach((split) => {
        if (summary[split.member_id]) {
          summary[split.member_id].owes += Number(split.amount_owed);
        }
      });
    });

    Object.values(summary).forEach((s) => {
      s.net = s.paid - s.owes;
    });

    return Object.values(summary).sort((a, b) => b.net - a.net);
  }

  function calculateSettlements() {
    const summary = calculateSummary();
    const settlements: { from: string; to: string; amount: number }[] = [];
    
    const debtors = summary.filter(s => s.net < -0.01).map(s => ({ ...s, remaining: Math.abs(s.net) }));
    const creditors = summary.filter(s => s.net > 0.01).map(s => ({ ...s, remaining: s.net }));

    for (const debtor of debtors) {
      for (const creditor of creditors) {
        if (debtor.remaining < 0.01 || creditor.remaining < 0.01) continue;
        
        const amount = Math.min(debtor.remaining, creditor.remaining);
        if (amount > 0.01) {
          settlements.push({
            from: debtor.member.name,
            to: creditor.member.name,
            amount: Math.round(amount * 100) / 100
          });
          debtor.remaining -= amount;
          creditor.remaining -= amount;
        }
      }
    }

    return settlements;
  }

  async function copySummary() {
    const summary = calculateSummary();
    const settlements = calculateSettlements();
    
    let text = `📊 สรุปยอด ${group?.name}\n`;
    text += `${'='.repeat(30)}\n\n`;
    
    text += `💰 ยอดรวมทั้งหมด: ${formatCurrency(totalAmount)}\n\n`;
    
    text += `👥 ยอดต่อคน:\n`;
    summary.forEach(s => {
      const status = s.net >= 0 ? '✅ ต้องได้รับ' : '💸 ต้องจ่าย';
      text += `  ${s.member.name}: ${formatCurrency(Math.abs(s.net))} ${status}\n`;
    });
    
    if (settlements.length > 0) {
      text += `\n🔄 การเคลียร์ยอด:\n`;
      settlements.forEach(s => {
        text += `  ${s.from} → ${s.to}: ${formatCurrency(s.amount)}\n`;
      });
    }
    
    const success = await copyToClipboard(text);
    if (success) {
      copied = true;
      setTimeout(() => copied = false, 2000);
      toastStore.add({ message: 'คัดลอกสรุปยอดแล้ว', type: 'success' });
    }
  }

  onMount(() => {
    loadData();
  });

  let summary = $derived(calculateSummary());
  let settlements = $derived(calculateSettlements());
  let totalAmount = $derived(bills.reduce((sum, b) => sum + Number(b.total_amount), 0));
</script>

<Header title="สรุปยอด" subtitle={group?.name} showBack />

<main class="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
  {#if group}
    <div class="mt-4 space-y-6">
      <!-- Total Card -->
      <Card class="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-0">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-primary-100 text-sm mb-1">ยอดรวมทั้งหมด</p>
            <p class="text-4xl font-bold">{formatCurrency(totalAmount)}</p>
            <p class="text-primary-100 text-sm mt-1">{bills.length} บิล · {members.length} คน</p>
          </div>
          <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Calculator class="w-8 h-8 text-white" />
          </div>
        </div>
      </Card>

      <!-- Summary by Member -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users class="w-5 h-5 text-primary-600" />
          ยอดต่อคน
        </h3>

        <div class="space-y-3">
          {#each summary as item}
            <Card class={item.net >= 0 ? 'border-l-4 border-l-success-500' : 'border-l-4 border-l-danger-500'}>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Avatar name={item.member.name} />
                  <div>
                    <p class="font-medium text-gray-900">{item.member.name}</p>
                    <div class="flex gap-3 text-xs text-gray-500">
                      <span>จ่ายไป: {formatCurrency(item.paid)}</span>
                      <span>ต้องจ่าย: {formatCurrency(item.owes)}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xl font-bold {item.net >= 0 ? 'text-success-600' : 'text-danger-600'}">
                    {item.net >= 0 ? '+' : ''}{formatCurrency(item.net)}
                  </p>
                  <p class="text-xs text-gray-500">
                    {item.net >= 0 ? 'ต้องได้รับ' : 'ต้องจ่ายเพิ่ม'}
                  </p>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </div>

      <!-- Settlements -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowRightLeft class="w-5 h-5 text-primary-600" />
          วิธีเคลียร์ยอด
        </h3>

        {#if settlements.length === 0}
          <Card class="text-center py-8 bg-success-50 border-success-200">
            <p class="text-success-700 font-medium">🎉 ยอดเท่ากันหมดแล้ว!</p>
          </Card>
        {:else}
          <div class="space-y-3">
            {#each settlements as settlement}
              <Card class="bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center -space-x-2">
                      <Avatar name={settlement.from} size="sm" />
                      <div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 z-10">
                        <ArrowRightLeft class="w-3 h-3" />
                      </div>
                      <Avatar name={settlement.to} size="sm" />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">
                        {settlement.from} <span class="text-gray-400">→</span> {settlement.to}
                      </p>
                    </div>
                  </div>
                  <p class="text-lg font-bold text-primary-600">
                    {formatCurrency(settlement.amount)}
                  </p>
                </div>
              </Card>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Bills List -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt class="w-5 h-5 text-primary-600" />
          รายการบิล ({bills.length})
        </h3>

        <div class="space-y-2">
          {#each bills as bill}
            <Card padding="sm" class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{bill.description}</p>
                <p class="text-xs text-gray-500">
                  {bill.payer?.name} จ่าย · {formatDate(bill.created_at)}
                </p>
              </div>
              <p class="font-semibold text-gray-900">{formatCurrency(Number(bill.total_amount))}</p>
            </Card>
          {/each}
        </div>
      </div>

      <!-- Copy Button -->
      <Button
        variant="secondary"
        onclick={copySummary}
        fullWidth
        class="gap-2"
      >
        {#if copied}
          <Check class="w-4 h-4 text-success-600" />
          คัดลอกแล้ว
        {:else}
          <Copy class="w-4 h-4" />
          คัดลอกสรุปยอด
        {/if}
      </Button>
    </div>
  {/if}
</main>
