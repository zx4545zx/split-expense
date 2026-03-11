// Database Types for Split Expense App

export interface Group {
  id: string;
  name: string;
  created_at: string;
  owner_id: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  name: string;
  user_id: string | null;
  created_at: string;
}

export type SplitType = 'equal' | 'manual' | 'percentage';

export interface Bill {
  id: string;
  group_id: string;
  description: string;
  total_amount: number;
  discount_amount: number;
  service_charge_percent: number;
  payer_member_id: string | null;
  split_type: string; // 'equal' | 'manual' | 'percentage'
  created_at: string;
}

export interface BillSplit {
  id: string;
  bill_id: string;
  member_id: string;
  amount_owed: number;
  is_paid: boolean;
  created_at: string;
}

// Extended types with joined data
export interface BillWithSplits extends Bill {
  bill_splits: (BillSplit & { member: GroupMember })[];
  payer: GroupMember | null;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  bills_count?: number;
}

export interface GroupSummary {
  member: GroupMember;
  totalOwed: number;
  totalPaid: number;
  netBalance: number; // positive = should receive, negative = should pay
}

// Form data types
export interface CreateGroupData {
  name: string;
}

export interface CreateMemberData {
  name: string;
}

export interface CreateBillData {
  description: string;
  total_amount: number;
  discount_amount: number;
  service_charge_percent: number;
  payer_member_id: string;
  split_type: SplitType;
  splits: {
    member_id: string;
    amount_owed: number;
  }[];
}

// UI Types
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
