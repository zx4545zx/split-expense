<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { Button, Card, Input, Header, Avatar } from '$lib/components';
  import { getSupabaseClient } from '$lib/supabase';
  import { toastStore, isLoading } from '$lib/stores';
  import { formatCurrency } from '$lib/utils';
  import type { Group, GroupMember, SplitType } from '$lib/types';
  import { Receipt, Calculator, Wallet, Percent, UserCheck, Users, ArrowRightLeft } from 'lucide-svelte';

  const groupId = page.params.id as string;
  const supabase = getSupabaseClient();

  let group = $state<Group | null>(null);
  let members = $state<GroupMember[]>([]);

  // Bill mode: 'classic' (old) or 'quick' (new - split discount only)
  let billMode = $state<'classic' | 'quick'>('classic');

  // ===== CLASSIC MODE =====
  let description = $state('');
  let totalAmount = $state<number>(0);
  let discountAmount = $state<number>(0);
  let serviceChargePercent = $state<number>(0);
  let payerMemberId = $state('');
  let splitType = $state<SplitType>('equal');
  let manualAmounts = $state<Record<string, number>>({});
  let percentages = $state<Record<string, number>>({});

  // ===== QUICK MODE (Split Discount Only) =====
  let quickDescription = $state('');
  let quickPayerId = $state('');
  let quickServiceCharge = $state<number>(0);
  // Each member's original amount (what they consumed)
  let memberAmounts = $state<Record<string, number>>({});
  // How to split discount: 'equal' or 'ratio'
  let discountSplitMethod = $state<'equal' | 'ratio'>('ratio');

  let isSubmitting = $state(false);

  async function loadGroup() {
    try {
      const { data, error } = await supabase!
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      group = data;
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
      
      // Set default payer
      if (members.length > 0) {
        if (!payerMemberId) payerMemberId = members[0].id;
        if (!quickPayerId) quickPayerId = members[0].id;
      }

      // Initialize amounts
      members.forEach((m) => {
        if (memberAmounts[m.id] === undefined) memberAmounts[m.id] = 0;
        if (manualAmounts[m.id] === undefined) manualAmounts[m.id] = 0;
        if (percentages[m.id] === undefined) percentages[m.id] = 0;
      });
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }

  // ===== QUICK MODE CALCULATION (Split Discount Only) =====
  function calculateQuickSplit() {
    const activeMembers = members.filter(m => (memberAmounts[m.id] || 0) > 0);
    
    if (activeMembers.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        discountPerPerson: [],
        amountAfterDiscount: 0,
        serviceCharge: 0,
        totalAmount: 0,
        splits: [],
      };
    }

    // Calculate subtotal (sum of all member amounts)
    const subtotal = activeMembers.reduce((sum, m) => sum + (memberAmounts[m.id] || 0), 0);
    
    // Auto-calculate total discount based on ratio
    // Discount is the difference between what they should pay and what they actually pay
    // But in this mode, we calculate discount to be split
    const totalMemberAmounts = subtotal;
    
    // Calculate how much discount each person gets
    let discountPerPerson: { member_id: string; name: string; originalAmount: number; discountShare: number; afterDiscount: number }[] = [];
    
    if (discountSplitMethod === 'equal') {
      // Split discount equally among all active members
      const equalDiscountShare = totalMemberAmounts > 0 ? totalMemberAmounts / activeMembers.length : 0;
      // Actually, we need to calculate what discount each person gets from their amount
      // Equal discount means: each person gets (total / count) as their fair share
      // So discount = original - fair share
      const fairShare = totalMemberAmounts / activeMembers.length;
      
      discountPerPerson = activeMembers.map(m => {
        const original = memberAmounts[m.id] || 0;
        const discount = Math.max(0, original - fairShare); // They pay fair share
        return {
          member_id: m.id,
          name: m.name,
          originalAmount: original,
          discountShare: discount,
          afterDiscount: original - discount,
        };
      });
    } else {
      // ratio - each person pays exactly what they consumed (no discount split)
      // Wait, that doesn't make sense. Let me reconsider...
      
      // Actually, "split discount" means:
      // Everyone's original amount is what they consumed
      // But there's a discount that reduces the total
      // The discount is distributed according to the method
      
      // For ratio: discount is distributed proportional to what they consumed
      // But actually, if everyone pays what they consumed, there's no discount...
      
      // I think the user means:
      // Original amounts are what each person ordered
      // Total bill has a discount applied
      // Each person's final amount = their order - their share of discount
      
      // Let's calculate total discount as a percentage or fixed amount
      // For now, let's assume discount is calculated to make it fair
      
      // Actually, re-reading the requirement:
      // "กรอกจำนวนเงินแต่ละคน และกรอกส่วนลดรวมสุดท้าย"
      // This means: enter each person's amount, and enter total discount
      
      // So the discount is a separate input! Let me add that...
      
      // For now, ratio mode means no additional discount (each pays what they entered)
      discountPerPerson = activeMembers.map(m => {
        const original = memberAmounts[m.id] || 0;
        return {
          member_id: m.id,
          name: m.name,
          originalAmount: original,
          discountShare: 0,
          afterDiscount: original,
        };
      });
    }

    const totalDiscount = discountPerPerson.reduce((sum, d) => sum + d.discountShare, 0);
    const amountAfterDiscount = subtotal - totalDiscount;
    const serviceCharge = amountAfterDiscount * (quickServiceCharge / 100);
    const totalAmount = amountAfterDiscount + serviceCharge;

    // Calculate final splits with service charge
    const splits = discountPerPerson.map(d => ({
      ...d,
      serviceChargeShare: d.afterDiscount * (quickServiceCharge / 100),
      finalAmount: d.afterDiscount * (1 + quickServiceCharge / 100),
    }));

    return {
      subtotal,
      totalDiscount,
      discountPerPerson,
      amountAfterDiscount,
      serviceCharge,
      totalAmount,
      splits,
    };
  }

  // I need to add a discount input for quick mode. Let me reconsider the design...
  // Actually, let me simplify:
  // Quick mode: each person enters their amount, then we calculate discount to make it fair
  // OR: enter each person's amount AND total discount

  // Let me add a total discount input
  let quickTotalDiscount = $state<number>(0);

  // Recalculate with explicit discount
  function calculateQuickSplitV2() {
    const activeMembers = members.filter(m => (memberAmounts[m.id] || 0) > 0);
    
    if (activeMembers.length === 0) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        discountPerPerson: [],
        amountAfterDiscount: 0,
        serviceCharge: 0,
        totalAmount: 0,
        splits: [],
      };
    }

    const subtotal = activeMembers.reduce((sum, m) => sum + (memberAmounts[m.id] || 0), 0);
    
    // Distribute discount according to method
    let discountPerPerson: { member_id: string; name: string; originalAmount: number; discountShare: number; afterDiscount: number }[] = [];
    
    if (discountSplitMethod === 'equal') {
      // Split discount equally
      const equalDiscount = activeMembers.length > 0 ? quickTotalDiscount / activeMembers.length : 0;
      discountPerPerson = activeMembers.map(m => {
        const original = memberAmounts[m.id] || 0;
        const discount = Math.min(original, equalDiscount); // Can't discount more than their amount
        return {
          member_id: m.id,
          name: m.name,
          originalAmount: original,
          discountShare: discount,
          afterDiscount: original - discount,
        };
      });
    } else {
      // ratio - split discount proportional to their consumption
      const discountRatio = subtotal > 0 ? quickTotalDiscount / subtotal : 0;
      discountPerPerson = activeMembers.map(m => {
        const original = memberAmounts[m.id] || 0;
        const discount = original * discountRatio;
        return {
          member_id: m.id,
          name: m.name,
          originalAmount: original,
          discountShare: discount,
          afterDiscount: original - discount,
        };
      });
    }

    const totalDiscount = discountPerPerson.reduce((sum, d) => sum + d.discountShare, 0);
    const amountAfterDiscount = subtotal - totalDiscount;
    const serviceCharge = amountAfterDiscount * (quickServiceCharge / 100);
    const totalAmount = amountAfterDiscount + serviceCharge;

    // Calculate final splits with service charge
    const splits = discountPerPerson.map(d => ({
      ...d,
      serviceChargeShare: d.afterDiscount * (quickServiceCharge / 100),
      finalAmount: d.afterDiscount + (d.afterDiscount * (quickServiceCharge / 100)),
    }));

    return {
      subtotal,
      totalDiscount,
      discountPerPerson,
      amountAfterDiscount,
      serviceCharge,
      totalAmount,
      splits,
    };
  }

  // ===== CLASSIC MODE CALCULATION =====
  function calculateClassicTotals() {
    const amountAfterDiscount = Math.max(0, totalAmount - discountAmount);
    const serviceCharge = amountAfterDiscount * (serviceChargePercent / 100);
    const netAmount = amountAfterDiscount + serviceCharge;
    return { subtotal: totalAmount, discount: discountAmount, amountAfterDiscount, serviceCharge, netAmount };
  }

  function calculateClassicSplits() {
    const { netAmount } = calculateClassicTotals();
    const activeMembers = members.filter((m) => {
      if (splitType === 'manual') return (manualAmounts[m.id] || 0) > 0;
      if (splitType === 'percentage') return (percentages[m.id] || 0) > 0;
      return true;
    });

    if (activeMembers.length === 0) {
      return members.map((m) => ({ member_id: m.id, amount_owed: 0 }));
    }

    switch (splitType) {
      case 'equal': {
        const equalAmount = netAmount / activeMembers.length;
        return members.map((m) => ({
          member_id: m.id,
          amount_owed: activeMembers.some((am) => am.id === m.id) ? equalAmount : 0,
        }));
      }
      case 'manual': {
        const totalManual = Object.values(manualAmounts).reduce((a, b) => a + b, 0);
        const ratio = totalManual > 0 ? netAmount / totalManual : 0;
        return members.map((m) => ({
          member_id: m.id,
          amount_owed: (manualAmounts[m.id] || 0) * ratio,
        }));
      }
      case 'percentage': {
        return members.map((m) => ({
          member_id: m.id,
          amount_owed: netAmount * ((percentages[m.id] || 0) / 100),
        }));
      }
      default:
        return members.map((m) => ({ member_id: m.id, amount_owed: 0 }));
    }
  }

  async function saveClassicBill() {
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
      const splits = calculateClassicSplits().filter(s => s.amount_owed > 0);
      
      if (splits.length === 0) {
        toastStore.add({ message: 'กรุณาระบุจำนวนเงินที่ต้องหาร', type: 'warning' });
        isSubmitting = false;
        return;
      }

      const { data: billData, error: billError } = await supabase!
        .from('bills')
        .insert({
          group_id: groupId,
          description: description.trim(),
          total_amount: totalAmount,
          discount_amount: discountAmount,
          service_charge_percent: serviceChargePercent,
          payer_member_id: payerMemberId,
          split_type: splitType,
        })
        .select()
        .single();

      if (billError) throw billError;

      await supabase!
        .from('bill_splits')
        .insert(
          splits.map(s => ({
            bill_id: billData.id,
            member_id: s.member_id,
            amount_owed: s.amount_owed,
          }))
        );

      toastStore.add({ message: 'บันทึกบิลสำเร็จ', type: 'success' });
      window.location.href = `/groups/${groupId}`;
    } catch (error) {
      console.error('Error saving bill:', error);
      toastStore.add({ message: 'ไม่สามารถบันทึกบิลได้', type: 'error' });
    } finally {
      isSubmitting = false;
    }
  }

  async function saveQuickBill() {
    if (!quickDescription.trim()) {
      toastStore.add({ message: 'กรุณาใส่รายละเอียดบิล', type: 'warning' });
      return;
    }
    if (!quickPayerId) {
      toastStore.add({ message: 'กรุณาเลือกผู้จ่าย', type: 'warning' });
      return;
    }

    const calculation = calculateQuickSplitV2();
    
    if (calculation.splits.length === 0) {
      toastStore.add({ message: 'กรุณากรอกจำนวนเงินอย่างน้อย 1 คน', type: 'warning' });
      return;
    }

    isSubmitting = true;
    try {
      const { data: billData, error: billError } = await supabase!
        .from('bills')
        .insert({
          group_id: groupId,
          description: quickDescription.trim(),
          total_amount: calculation.subtotal,
          discount_amount: calculation.totalDiscount,
          service_charge_percent: quickServiceCharge,
          payer_member_id: quickPayerId,
          split_type: 'manual',
        })
        .select()
        .single();

      if (billError) throw billError;

      await supabase!
        .from('bill_splits')
        .insert(
          calculation.splits.map(s => ({
            bill_id: billData.id,
            member_id: s.member_id,
            amount_owed: s.finalAmount,
          }))
        );

      toastStore.add({ message: 'บันทึกบิลสำเร็จ', type: 'success' });
      window.location.href = `/groups/${groupId}`;
    } catch (error) {
      console.error('Error saving bill:', error);
      toastStore.add({ message: 'ไม่สามารถบันทึกบิลได้', type: 'error' });
    } finally {
      isSubmitting = false;
    }
  }

  onMount(async () => {
    isLoading.set(true);
    await Promise.all([loadGroup(), loadMembers()]);
    isLoading.set(false);
  });

  // Derived values for classic mode
  let classicTotals = $derived(calculateClassicTotals());
  let classicSplits = $derived(calculateClassicSplits());

  // Derived values for quick mode
  let quickCalculation = $derived(calculateQuickSplitV2());
</script>

<Header title="เพิ่มบิลใหม่" showBack />

<main class="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
  {#if group}
    <div class="mt-4 space-y-6">
      
      <!-- Mode Selection -->
      <Card class="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <h3 class="text-sm font-medium text-primary-800 mb-3">เลือกโหมดการเพิ่มบิล</h3>
        <div class="grid grid-cols-2 gap-3">
          <button
            class="p-4 rounded-xl border-2 text-left transition-all
              {billMode === 'classic' 
                ? 'border-primary-600 bg-white shadow-md' 
                : 'border-transparent bg-white/50 hover:bg-white'}"
            onclick={() => billMode = 'classic'}
          >
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
              <Calculator class="w-5 h-5 text-primary-600" />
            </div>
            <p class="font-semibold text-gray-900">แบบเดิม</p>
            <p class="text-xs text-gray-500 mt-1">หารเท่า / เปอร์เซ็นต์</p>
          </button>
          
          <button
            class="p-4 rounded-xl border-2 text-left transition-all
              {billMode === 'quick' 
                ? 'border-success-600 bg-white shadow-md' 
                : 'border-transparent bg-white/50 hover:bg-white'}"
            onclick={() => billMode = 'quick'}
          >
            <div class="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mb-2">
              <ArrowRightLeft class="w-5 h-5 text-success-600" />
            </div>
            <p class="font-semibold text-gray-900">แบบใหม่</p>
            <p class="text-xs text-gray-500 mt-1">หารแค่ส่วนลด</p>
          </button>
        </div>
      </Card>

      {#if billMode === 'classic'}
        <!-- ===== CLASSIC MODE ===== -->
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
              <label for="classic-payer" class="block text-sm font-medium text-gray-700 mb-1.5">
                ใครเป็นคนจ่าย
              </label>
              <select
                id="classic-payer"
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
              <span class="font-medium">{formatCurrency(classicTotals.subtotal)}</span>
            </div>
            {#if classicTotals.discount > 0}
              <div class="flex justify-between text-danger-600">
                <span>ส่วนลด</span>
                <span class="font-medium">-{formatCurrency(classicTotals.discount)}</span>
              </div>
            {/if}
            {#if classicTotals.serviceCharge > 0}
              <div class="flex justify-between">
                <span class="text-gray-600">Service Charge</span>
                <span class="font-medium">{formatCurrency(classicTotals.serviceCharge)}</span>
              </div>
            {/if}
            <div class="border-t border-gray-200 pt-2 flex justify-between text-base">
              <span class="font-medium text-gray-900">ยอดสุทธิ</span>
              <span class="font-bold text-primary-600">{formatCurrency(classicTotals.netAmount)}</span>
            </div>
          </div>
        </Card>

        <!-- Split Type -->
        <Card>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">วิธีหาร</h3>
          <div class="grid grid-cols-3 gap-2 mb-6">
            <button
              class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
                {splitType === 'equal' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}"
              onclick={() => splitType = 'equal'}
            >หารเท่า</button>
            <button
              class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
                {splitType === 'percentage' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}"
              onclick={() => splitType = 'percentage'}
            >หาร %</button>
            <button
              class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
                {splitType === 'manual' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}"
              onclick={() => splitType = 'manual'}
            >กำหนดเอง</button>
          </div>

          <div class="space-y-3">
            {#each members as member}
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar name={member.name} size="sm" />
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{member.name}</p>
                </div>

                {#if splitType === 'equal'}
                  {@const equalAmount = members.length > 0 ? classicTotals.netAmount / members.length : 0}
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
                    {formatCurrency(classicTotals.netAmount * ((percentages[member.id] || 0) / 100))}
                  </p>
                {:else if splitType === 'manual'}
                  <input
                    type="number"
                    bind:value={manualAmounts[member.id]}
                    placeholder="0"
                    class="w-28 px-2 py-1.5 text-right border border-gray-300 rounded-lg text-sm"
                  />
                {/if}
              </div>
            {/each}
          </div>
        </Card>

        <div class="flex gap-3">
          <Button variant="secondary" onclick={() => window.location.href = `/groups/${groupId}`} class="flex-1">
            ยกเลิก
          </Button>
          <Button onclick={saveClassicBill} loading={isSubmitting} class="flex-1">
            บันทึกบิล
          </Button>
        </div>

      {:else}
        <!-- ===== QUICK MODE (Split Discount Only) ===== -->
        <Card>
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet class="w-5 h-5 text-success-600" />
            ข้อมูลบิล
          </h3>
          
          <div class="space-y-4">
            <Input
              label="รายละเอียด"
              placeholder="เช่น ข้าวเที่ยง, ค่า Taxi"
              bind:value={quickDescription}
              required
            />

            <div>
              <label for="quick-payer" class="block text-sm font-medium text-gray-700 mb-1.5">
                ใครเป็นคนจ่าย
              </label>
              <select
                id="quick-payer"
                bind:value={quickPayerId}
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

        <!-- Members Amounts -->
        <Card>
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck class="w-5 h-5 text-success-600" />
            จำนวนเงินแต่ละคน
          </h3>
          <p class="text-sm text-gray-500 mb-4">กรอกจำนวนเงินที่แต่ละคนต้องจ่าย (ก่อนหักส่วนลด)</p>

          <div class="space-y-3">
            {#each members as member}
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar name={member.name} size="sm" />
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{member.name}</p>
                </div>
                <div class="w-32">
                  <Input
                    type="number"
                    bind:value={memberAmounts[member.id]}
                    placeholder="0"
                  />
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-4 p-3 bg-primary-50 rounded-lg">
            <div class="flex justify-between text-sm">
              <span class="text-primary-700 font-medium">รวมยอด</span>
              <span class="font-bold text-primary-700">
                {formatCurrency(quickCalculation.subtotal)}
              </span>
            </div>
          </div>
        </Card>

        <!-- Discount & Service Charge -->
        <Card class="bg-warning-50 border-warning-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Percent class="w-5 h-5 text-warning-600" />
            ส่วนลดและ Service Charge
          </h3>
          
          <!-- Discount Split Method -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">วิธีหารส่วนลด</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
                  {discountSplitMethod === 'equal' 
                    ? 'border-warning-600 bg-warning-100 text-warning-800' 
                    : 'border-gray-200 text-gray-600 bg-white'}"
                onclick={() => discountSplitMethod = 'equal'}
              >
                <Users class="w-4 h-4 inline mr-1" />
                หารเท่า
              </button>
              <button
                class="px-3 py-2 rounded-xl text-sm font-medium transition-all border-2
                  {discountSplitMethod === 'ratio' 
                    ? 'border-warning-600 bg-warning-100 text-warning-800' 
                    : 'border-gray-200 text-gray-600 bg-white'}"
                onclick={() => discountSplitMethod = 'ratio'}
              >
                <Calculator class="w-4 h-4 inline mr-1" />
                ตามสัดส่วน
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              {#if discountSplitMethod === 'equal'}
                ส่วนลดหารเท่า ๆ กันทุกคน
              {:else}
                ส่วนลดหารตามสัดส่วนที่แต่ละคนจ่าย
              {/if}
            </p>
          </div>

          <div class="space-y-4">
            <Input
              label="ส่วนลดรวม (บาท)"
              type="number"
              bind:value={quickTotalDiscount}
              placeholder="0"
            />
            
            <Input
              label="Service Charge (%)"
              type="number"
              bind:value={quickServiceCharge}
              placeholder="0"
            />
          </div>
        </Card>

        <!-- Calculation Summary -->
        <Card class="bg-success-50 border-success-200">
          <h4 class="font-semibold text-success-800 mb-4 flex items-center gap-2">
            <Calculator class="w-5 h-5" />
            สรุปการคำนวณ
          </h4>
          
          <div class="space-y-4">
            <!-- Original Amounts -->
            <div class="p-3 bg-white rounded-lg">
              <p class="text-sm text-gray-600 mb-2">ยอดก่อนหักส่วนลด</p>
              {#each quickCalculation.splits as split}
                <div class="flex justify-between py-1 text-sm">
                  <span class="flex items-center gap-2">
                    <Avatar name={split.name} size="xs" />
                    {split.name}
                  </span>
                  <span class="font-medium">{formatCurrency(split.originalAmount)}</span>
                </div>
              {/each}
              <div class="border-t border-gray-200 mt-2 pt-2 flex justify-between font-medium">
                <span>รวม</span>
                <span>{formatCurrency(quickCalculation.subtotal)}</span>
              </div>
            </div>

            <!-- Discount Distribution -->
            {#if quickTotalDiscount > 0}
              <div class="p-3 bg-warning-50 rounded-lg">
                <p class="text-sm text-warning-700 mb-2">
                  ส่วนลด {formatCurrency(quickCalculation.totalDiscount)} 
                  ({discountSplitMethod === 'equal' ? 'หารเท่า' : 'ตามสัดส่วน'})
                </p>
                {#each quickCalculation.splits as split}
                  {#if split.discountShare > 0}
                    <div class="flex justify-between py-1 text-sm">
                      <span class="text-gray-600">{split.name} ได้ส่วนลด</span>
                      <span class="text-warning-700 font-medium">-{formatCurrency(split.discountShare)}</span>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            <!-- After Discount -->
            <div class="p-3 bg-primary-50 rounded-lg">
              <p class="text-sm text-primary-700 mb-2">ยอดหลังหักส่วนลด</p>
              {#each quickCalculation.splits as split}
                <div class="flex justify-between py-1 text-sm">
                  <span class="flex items-center gap-2">
                    <Avatar name={split.name} size="xs" />
                    {split.name}
                  </span>
                  <span class="font-medium text-primary-700">
                    {formatCurrency(split.afterDiscount)}
                  </span>
                </div>
              {/each}
              <div class="border-t border-primary-200 mt-2 pt-2 flex justify-between font-medium">
                <span class="text-primary-800">รวม</span>
                <span class="text-primary-800">{formatCurrency(quickCalculation.amountAfterDiscount)}</span>
              </div>
            </div>

            <!-- Service Charge -->
            {#if quickServiceCharge > 0}
              <div class="flex justify-between text-gray-700">
                <span>Service Charge ({quickServiceCharge}%)</span>
                <span>+{formatCurrency(quickCalculation.serviceCharge)}</span>
              </div>
            {/if}

            <!-- Final Amount -->
            <div class="border-t-2 border-success-200 pt-3">
              <p class="text-sm font-medium text-success-800 mb-2">ยอดสุทธิที่ต้องจ่าย</p>
              {#each quickCalculation.splits as split}
                <div class="flex justify-between py-1.5">
                  <span class="flex items-center gap-2">
                    <Avatar name={split.name} size="xs" />
                    {split.name}
                  </span>
                  <span class="font-bold text-success-700">{formatCurrency(split.finalAmount)}</span>
                </div>
              {/each}
              <div class="border-t border-success-200 mt-2 pt-2 flex justify-between text-lg font-bold text-success-800">
                <span>รวมทั้งหมด</span>
                <span>{formatCurrency(quickCalculation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div class="flex gap-3">
          <Button variant="secondary" onclick={() => window.location.href = `/groups/${groupId}`} class="flex-1">
            ยกเลิก
          </Button>
          <Button onclick={saveQuickBill} loading={isSubmitting} class="flex-1 bg-success-600 hover:bg-success-700">
            <Wallet class="w-4 h-4" />
            บันทึกบิล
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</main>
