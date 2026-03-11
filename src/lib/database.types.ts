export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          created_at: string
          owner_id: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          owner_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          name: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bills: {
        Row: {
          id: string
          group_id: string
          description: string
          total_amount: number
          discount_amount: number
          service_charge_percent: number
          payer_member_id: string | null
          split_type: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          description: string
          total_amount: number
          discount_amount?: number
          service_charge_percent?: number
          payer_member_id?: string | null
          split_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          description?: string
          total_amount?: number
          discount_amount?: number
          service_charge_percent?: number
          payer_member_id?: string | null
          split_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payer_member_id_fkey"
            columns: ["payer_member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          }
        ]
      }
      bill_splits: {
        Row: {
          id: string
          bill_id: string
          member_id: string
          amount_owed: number
          is_paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          member_id: string
          amount_owed: number
          is_paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          member_id?: string
          amount_owed?: number
          is_paid?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_splits_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
