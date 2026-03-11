import { writable, derived } from 'svelte/store';
import type { Toast, Group, GroupMember, Bill, GroupSummary } from './types';

// Toast notifications
function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      update((toasts) => [...toasts, { ...toast, id }]);
      
      setTimeout(() => {
        update((toasts) => toasts.filter((t) => t.id !== id));
      }, toast.duration || 3000);
      
      return id;
    },
    remove: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
  };
}

export const toastStore = createToastStore();

// Current group store
export const currentGroup = writable<Group | null>(null);

// Group members store
export const groupMembers = writable<GroupMember[]>([]);

// Bills store
export const bills = writable<Bill[]>([]);

// Loading states
export const isLoading = writable(false);

// Derived store for group summary
export const groupSummary = derived(
  [bills, groupMembers],
  ([$bills, $members]) => {
    const summary: Record<string, GroupSummary> = {};
    
    // Initialize summary for all members
    $members.forEach((member) => {
      summary[member.id] = {
        member,
        totalOwed: 0,
        totalPaid: 0,
        netBalance: 0,
      };
    });

    // Calculate from bills (this will be populated from API)
    return Object.values(summary);
  }
);
