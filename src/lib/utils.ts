import type { GroupMember, Bill, BillSplit, SplitType } from './types';

// Format currency
export function formatCurrency(amount: number, currency = 'THB'): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format number
export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format date
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

// Format date time
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Generate ID
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Calculate split amounts
export function calculateSplitAmounts(
  totalAmount: number,
  discountAmount: number,
  serviceChargePercent: number,
  members: GroupMember[],
  splitType: SplitType,
  manualAmounts?: Record<string, number>,
  percentages?: Record<string, number>
): { member_id: string; amount_owed: number }[] {
  // Calculate net amount after discount and service charge
  const amountAfterDiscount = Math.max(0, totalAmount - discountAmount);
  const serviceCharge = amountAfterDiscount * (serviceChargePercent / 100);
  const netAmount = amountAfterDiscount + serviceCharge;

  const activeMembers = members.filter((m) => {
    if (splitType === 'manual' && manualAmounts) {
      return (manualAmounts[m.id] || 0) > 0;
    }
    if (splitType === 'percentage' && percentages) {
      return (percentages[m.id] || 0) > 0;
    }
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
      if (!manualAmounts) {
        return members.map((m) => ({ member_id: m.id, amount_owed: 0 }));
      }
      const totalManual = Object.values(manualAmounts).reduce((a, b) => a + b, 0);
      const ratio = totalManual > 0 ? netAmount / totalManual : 0;
      
      return members.map((m) => ({
        member_id: m.id,
        amount_owed: (manualAmounts[m.id] || 0) * ratio,
      }));
    }

    case 'percentage': {
      if (!percentages) {
        return members.map((m) => ({ member_id: m.id, amount_owed: 0 }));
      }
      return members.map((m) => ({
        member_id: m.id,
        amount_owed: netAmount * ((percentages[m.id] || 0) / 100),
      }));
    }

    default:
      return members.map((m) => ({ member_id: m.id, amount_owed: 0 }));
  }
}

// Calculate totals for display
export function calculateBillTotals(
  totalAmount: number,
  discountAmount: number,
  serviceChargePercent: number
) {
  const amountAfterDiscount = Math.max(0, totalAmount - discountAmount);
  const serviceCharge = amountAfterDiscount * (serviceChargePercent / 100);
  const netAmount = amountAfterDiscount + serviceCharge;

  return {
    subtotal: totalAmount,
    discount: discountAmount,
    amountAfterDiscount,
    serviceCharge,
    netAmount,
  };
}

// Debounce function
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Get avatar color based on name
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
