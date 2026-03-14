<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Button, Card, Input, Header, Avatar } from '$lib/components';
  import { getSupabaseClient } from '$lib/supabase';
  import { toastStore, isLoading } from '$lib/stores';
  import { formatCurrency, calculateSplitAmounts, calculateBillTotals } from '$lib/utils';
  import type { Group, GroupMember, Bill, BillSplit, SplitType } from '$lib/types';
  import { Receipt, Calculator, Trash2, Grid, List, Image } from 'lucide-svelte';
  import html2canvas from 'html2canvas';

  const groupId = page.params.id as string;
  const billId = page.params.billId as string;
  const supabase = getSupabaseClient();

  let group = $state<Group | null>(null);
  let members = $state<GroupMember[]>([]);
  let bill = $state<Bill | null>(null);

  // Bill form data
  let description = $state('');
  let totalAmount = $state<number>(0);
  let discountAmount = $state<number>(0);
  let serviceChargePercent = $state<number>(0);
  let payerMemberId = $state('');
  let splitType = $state<SplitType>('equal');

  // For manual/percentage splits
  let manualAmounts = $state<Record<string, number>>({});
  let percentages = $state<Record<string, number>>({});

  let isSubmitting = $state(false);
  let isLoadingData = $state(true);
  let viewMode = $state<'card' | 'table'>('card');
  let tableRef = $state<HTMLElement | null>(null);
  let savingImage = $state(false);

  async function loadData() {
    isLoadingData = true;
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

      // Load bill
      const { data: billData } = await supabase!
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();
      bill = billData;

      if (bill) {
        description = bill.description;
        totalAmount = Number(bill.total_amount);
        discountAmount = Number(bill.discount_amount);
        serviceChargePercent = Number(bill.service_charge_percent);
        payerMemberId = bill.payer_member_id || '';
        splitType = bill.split_type as SplitType;

        // Load existing splits
        const { data: splitsData } = await supabase!
          .from('bill_splits')
          .select('*')
          .eq('bill_id', billId);

        // Initialize manual amounts and percentages from existing splits
        const existingSplits: Record<string, number> = {};
        splitsData?.forEach((split: BillSplit) => {
          existingSplits[split.member_id] = Number(split.amount_owed);
        });

        members.forEach((m) => {
          if (splitType === 'manual') {
            manualAmounts[m.id] = existingSplits[m.id] || 0;
          } else if (splitType === 'percentage') {
            const amount = existingSplits[m.id] || 0;
            const netAmount = calculateBillTotals(totalAmount, discountAmount, serviceChargePercent).netAmount;
            percentages[m.id] = netAmount > 0 ? (amount / netAmount) * 100 : 0;
          }
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toastStore.add({
        message: 'ไม่สามารถโหลดข้อมูลได้',
        type: 'error',
      });
    } finally {
      isLoadingData = false;
    }
  }

  function calculateSplits() {
    return calculateSplitAmounts(
      totalAmount,
      discountAmount,
      serviceChargePercent,
      members,
      splitType,
      manualAmounts,
      percentages
    );
  }

  async function updateBill() {
    if (!description.trim()) {
      toastStore.add({ message: 'กรุณาใส่รายละเอียดบิล', type: 'warning' });
      return;
    }
    if (totalAmount <= 0) {
      toastStore.add({ message: 'กรุณาใส่ยอดเงิน', type: 'warning' });
      return;
    }
    if (!payerMemberId) {
      toastStore.add({ message: 'กรุณาเลือกผู้จ่าย', type: 'warning' });
      return;
    }

    isSubmitting = true;
    try {
      // Calculate splits
      const splits = calculateSplits();
      const validSplits = splits.filter(s => s.amount_owed > 0);

      // Update bill
      const { error: billError } = await supabase!
        .from('bills')
        .update({
          description: description.trim(),
          total_amount: totalAmount,
          discount_amount: discountAmount,
          service_charge_percent: serviceChargePercent,
          payer_member_id: payerMemberId,
          split_type: splitType,
        })
        .eq('id', billId);

      if (billError) throw billError;

      // Delete old splits
      await supabase!.from('bill_splits').delete().eq('bill_id', billId);

      // Create new splits
      if (validSplits.length > 0) {
        const { error: splitsError } = await supabase!
          .from('bill_splits')
          .insert(
            validSplits.map(s => ({
              bill_id: billId,
              member_id: s.member_id,
              amount_owed: s.amount_owed,
            }))
          );

        if (splitsError) throw splitsError;
      }

      toastStore.add({
        message: 'อัพเดทบิลสำเร็จ',
        type: 'success',
      });

      window.location.href = `/groups/${groupId}`;
    } catch (error) {
      console.error('Error updating bill:', error);
      toastStore.add({
        message: 'ไม่สามารถอัพเดทบิลได้',
        type: 'error',
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteBill() {
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

      window.location.href = `/groups/${groupId}`;
    } catch (error) {
      console.error('Error deleting bill:', error);
      toastStore.add({
        message: 'ไม่สามารถลบบิลได้',
        type: 'error',
      });
    }
  }

  async function saveAsImage() {
    if (savingImage) return;
    if (!tableRef) {
      toastStore.add({ message: 'กรุณาเปลี่ยนเป็นโหมดตารางก่อน', type: 'error' });
      return;
    }
    savingImage = true;
    try {
      const canvas = await html2canvas(tableRef, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `บิล_${description || 'bill'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toastStore.add({ message: 'บันทึกรูปสำเร็จ', type: 'success' });
    } catch (error) {
      console.error('Error saving image:', error);
      toastStore.add({ message: 'ไม่สามารถบันทึกรูปได้', type: 'error' });
    } finally {
      savingImage = false;
    }
  }

  onMount(() => {
    loadData();
  });

  // Derived values
  let totals = $derived(calculateBillTotals(totalAmount, discountAmount, serviceChargePercent));
  let splits = $derived(calculateSplits());
  let splitTotal = $derived(splits.reduce((sum, s) => sum + s.amount_owed, 0));
</script>

<Header title="แก้ไขบิล" showBack />

<main class="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
  {#if !isLoadingData && group}
    <div class="mt-4 space-y-6">
      <!-- Basic Info -->
      <Card>
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt class="w-5 h-5 text-primary-600" />
          ข้อมูลบิล
        </h3>
        
        <div class="space-y-4">
          <Input
            label="รายละเอียด"
            placeholder="เช่น ส้มตำปูปลาร้า, ค่าที่พัก"
            bind:value={description}
            required
          />

          <Input
            label="จำนวนเงินรวม"
            type="number"
            bind:value={totalAmount}
            required
          />

          <Input
            label="ส่วนลด (ถ้ามี)"
            type="number"
            bind:value={discountAmount}
          />

          <Input
            label="Service Charge % (ถ้ามี)"
            type="number"
            bind:value={serviceChargePercent}
          />

          <div>
            <label for="payer-select" class="block text-sm font-medium text-gray-700 mb-1.5">
              ใครเป็นคนจ่าย
            </label>
            <select
              id="payer-select"
              bind:value={payerMemberId}
              class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {#each members as member}
                <option value={member.id}>{member.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </Card>

      <!-- Summary -->
      <Card class="bg-gray-50">
        <h4 class="font-medium text-gray-700 mb-3">สรุปยอด</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">ยอดรวม</span>
            <span class="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          {#if totals.discount > 0}
            <div class="flex justify-between text-danger-600">
              <span>ส่วนลด</span>
              <span class="font-medium">-{formatCurrency(totals.discount)}</span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span class="text-gray-600">หลังหักส่วนลด</span>
            <span class="font-medium">{formatCurrency(totals.amountAfterDiscount)}</span>
          </div>
          {#if totals.serviceCharge > 0}
            <div class="flex justify-between">
              <span class="text-gray-600">Service Charge ({serviceChargePercent}%)</span>
              <span class="font-medium">{formatCurrency(totals.serviceCharge)}</span>
            </div>
          {/if}
          <div class="border-t border-gray-200 pt-2 flex justify-between text-base">
            <span class="font-medium text-gray-900">ยอดสุทธิ</span>
            <span class="font-bold text-primary-600">{formatCurrency(totals.netAmount)}</span>
          </div>
        </div>
      </Card>

      <!-- Split Type -->
      <Card>
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calculator class="w-5 h-5 text-primary-600" />
          วิธีหาร
        </h3>

        <div class="grid grid-cols-3 gap-2 mb-6">
          <button
            class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
              {splitType === 'equal' 
                ? 'border-primary-600 bg-primary-50 text-primary-700' 
                : 'border-gray-200 text-gray-600 hover:border-gray-300'}"
            onclick={() => splitType = 'equal'}
          >
            หารเท่า
          </button>
          <button
            class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
              {splitType === 'percentage' 
                ? 'border-primary-600 bg-primary-50 text-primary-700' 
                : 'border-gray-200 text-gray-600 hover:border-gray-300'}"
            onclick={() => splitType = 'percentage'}
          >
            หาร %
          </button>
          <button
            class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
              {splitType === 'manual' 
                ? 'border-primary-600 bg-primary-50 text-primary-700' 
                : 'border-gray-200 text-gray-600 hover:border-gray-300'}"
            onclick={() => splitType = 'manual'}
          >
            กำหนดเอง
          </button>
        </div>

        <!-- View Toggle -->
        <div class="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'card' ? 'primary' : 'secondary'}
            onclick={() => viewMode = 'card'}
            class="flex-1 gap-2"
          >
            <List class="w-4 h-4" />
            รายละเอียด
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            onclick={() => viewMode = 'table'}
            class="flex-1 gap-2"
          >
            <Grid class="w-4 h-4" />
            ตาราง
          </Button>
        </div>

        {#if viewMode === 'table'}
          <!-- Table View for OCR -->
          <div bind:this={tableRef} class="p-4 bg-white border-2 border-gray-800">
            <h3 class="text-lg font-bold text-gray-900 mb-2 text-center">
              {description}
            </h3>
            <p class="text-sm text-gray-600 mb-3 text-center">
              ยอดรวม: {Number(totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <table class="w-full border-collapse text-base">
              <thead>
                <tr class="border-b-4 border-gray-900 bg-gray-100">
                  <th class="text-left py-2 px-3 font-bold text-gray-900">ชื่อ</th>
                  <th class="text-right py-2 px-3 font-bold text-gray-900">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {#each members as member}
                  {@const splitAmount = splitType === 'equal'
                    ? (members.length > 0 ? totals.netAmount / members.length : 0)
                    : splitType === 'percentage'
                      ? totals.netAmount * ((percentages[member.id] || 0) / 100)
                      : (manualAmounts[member.id] || 0)}
                  <tr class="border-b-2 border-gray-300">
                    <td class="py-2 px-3 text-gray-900">{member.name}</td>
                    <td class="text-right py-2 px-3 text-gray-900 font-medium">
                      {splitAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Save Image Button -->
          <div class="mt-6 mb-4">
          <Button
            variant="primary"
            onclick={saveAsImage}
            fullWidth
            class="gap-2"
            disabled={savingImage}
          >
            <Image class="w-4 h-4" />
            {savingImage ? 'กำลังบันทึก...' : 'บันทึกรูป'}
          </Button>
          </div>
        {:else}
          <!-- Split Details (Card View) -->
          <div class="space-y-3">
            {#each members as member}
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar name={member.name} size="sm" />
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{member.name}</p>
                </div>

                {#if splitType === 'equal'}
                  {@const equalAmount = members.length > 0 ? totals.netAmount / members.length : 0}
                  <p class="font-semibold text-primary-600">{formatCurrency(equalAmount)}</p>
              {:else if splitType === 'percentage'}
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    bind:value={percentages[member.id]}
                    class="w-20 px-2 py-1.5 text-right border border-gray-300 rounded-lg text-sm"
                  />
                  <span class="text-gray-500">%</span>
                </div>
                <p class="w-24 text-right font-medium text-gray-700">
                  {formatCurrency(totals.netAmount * ((percentages[member.id] || 0) / 100))}
                </p>
              {:else if splitType === 'manual'}
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    bind:value={manualAmounts[member.id]}
                    placeholder="0"
                    class="w-28 px-2 py-1.5 text-right border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              {/if}
            </div>
          {/each}
        </div>

        {#if splitType !== 'equal'}
          <div class="mt-4 p-3 bg-gray-100 rounded-xl">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">ยอดที่หารได้:</span>
              <span class="font-medium {Math.abs(splitTotal - totals.netAmount) < 0.01 ? 'text-success-600' : 'text-warning-600'}">
                {formatCurrency(splitTotal)} / {formatCurrency(totals.netAmount)}
              </span>
            </div>
          </div>
        {/if}
        {/if}
      </Card>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <Button
          variant="secondary"
          onclick={() => window.location.href = `/groups/${groupId}`}
          class="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          variant="danger"
          onclick={deleteBill}
          class="flex-1"
        >
          <Trash2 class="w-4 h-4" />
          ลบ
        </Button>
        <Button
          onclick={updateBill}
          loading={isSubmitting}
          class="flex-1"
        >
          บันทึก
        </Button>
      </div>
    </div>
  {/if}
</main>
