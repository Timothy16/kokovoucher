export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string
          actor_id: string | null
          at: string
          id: number
          note: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor: string
          actor_id?: string | null
          at?: string
          id?: never
          note?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor?: string
          actor_id?: string | null
          at?: string
          id?: never
          note?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      combos: {
        Row: {
          available: boolean
          category: string
          created_at: string
          description: string
          id: string
          image_path: string
          name: string
          restaurant_id: string
          short_description: string
          soda_options: string[]
          spice_option: boolean
          updated_at: string
          water_option: boolean
        }
        Insert: {
          available?: boolean
          category: string
          created_at?: string
          description?: string
          id?: string
          image_path: string
          name: string
          restaurant_id: string
          short_description?: string
          soda_options?: string[]
          spice_option?: boolean
          updated_at?: string
          water_option?: boolean
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_path?: string
          name?: string
          restaurant_id?: string
          short_description?: string
          soda_options?: string[]
          spice_option?: boolean
          updated_at?: string
          water_option?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "combos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error: string | null
          id: string
          provider_message_id: string | null
          recipient: string
          recipient_type: Database["public"]["Enums"]["notification_recipient_type"]
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string
          summary: string
          template: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient: string
          recipient_type: Database["public"]["Enums"]["notification_recipient_type"]
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject: string
          summary: string
          template: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient?: string
          recipient_type?: Database["public"]["Enums"]["notification_recipient_type"]
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string
          summary?: string
          template?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          at: string
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          at?: string
          id?: never
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          at?: string
          id?: never
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_info: string | null
          amount: number
          combo_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          delivery_name: string
          delivery_phone: string
          delivery_whatsapp: string
          dispute_note: string | null
          dispute_reported_at: string | null
          dispute_resolution_note: string | null
          dispute_resolved_at: string | null
          dispute_status: Database["public"]["Enums"]["dispute_status"] | null
          drink_choice: string | null
          drop_option: Database["public"]["Enums"]["drop_option"]
          floor: string
          house_name: string
          house_number: string
          id: string
          landmark: string | null
          reference: string
          restaurant_id: string
          spice_level: Database["public"]["Enums"]["spice_level"] | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          voucher_id: string
        }
        Insert: {
          additional_info?: string | null
          amount: number
          combo_id: string
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          delivery_name: string
          delivery_phone: string
          delivery_whatsapp: string
          dispute_note?: string | null
          dispute_reported_at?: string | null
          dispute_resolution_note?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"] | null
          drink_choice?: string | null
          drop_option: Database["public"]["Enums"]["drop_option"]
          floor: string
          house_name: string
          house_number: string
          id?: string
          landmark?: string | null
          reference: string
          restaurant_id: string
          spice_level?: Database["public"]["Enums"]["spice_level"] | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          voucher_id: string
        }
        Update: {
          additional_info?: string | null
          amount?: number
          combo_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          delivery_name?: string
          delivery_phone?: string
          delivery_whatsapp?: string
          dispute_note?: string | null
          dispute_reported_at?: string | null
          dispute_resolution_note?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"] | null
          drink_choice?: string | null
          drop_option?: Database["public"]["Enums"]["drop_option"]
          floor?: string
          house_name?: string
          house_number?: string
          id?: string
          landmark?: string | null
          reference?: string
          restaurant_id?: string
          spice_level?: Database["public"]["Enums"]["spice_level"] | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "public_menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_items: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          id: string
          payout_id: string | null
          restaurant_id: string
          revoke_reason: string | null
          revoked_at: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["payout_source_type"]
          status: Database["public"]["Enums"]["payout_item_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          id?: string
          payout_id?: string | null
          restaurant_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["payout_source_type"]
          status?: Database["public"]["Enums"]["payout_item_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          id?: string
          payout_id?: string | null
          restaurant_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["payout_source_type"]
          status?: Database["public"]["Enums"]["payout_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          currency: Database["public"]["Enums"]["currency"]
          id: string
          item_count: number
          processed_at: string
          processed_by: string | null
          reference: string | null
          restaurant_id: string
          total_amount: number
        }
        Insert: {
          currency: Database["public"]["Enums"]["currency"]
          id?: string
          item_count: number
          processed_at?: string
          processed_by?: string | null
          reference?: string | null
          restaurant_id: string
          total_amount: number
        }
        Update: {
          currency?: Database["public"]["Enums"]["currency"]
          id?: string
          item_count?: number
          processed_at?: string
          processed_by?: string | null
          reference?: string | null
          restaurant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_started_at: string
        }
        Insert: {
          hits: number
          key: string
          window_started_at: string
        }
        Update: {
          hits?: number
          key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      restaurant_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          restaurant_id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          restaurant_id: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          restaurant_id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          activated_at: string | null
          address: string
          contact_email: string
          contact_number: string
          contact_person: string
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          disabled_at: string | null
          id: string
          invited_at: string
          logo_path: string | null
          name: string
          status: Database["public"]["Enums"]["restaurant_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          address: string
          contact_email: string
          contact_number: string
          contact_person: string
          created_at?: string
          currency: Database["public"]["Enums"]["currency"]
          disabled_at?: string | null
          id?: string
          invited_at?: string
          logo_path?: string | null
          name: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          address?: string
          contact_email?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          disabled_at?: string | null
          id?: string
          invited_at?: string
          logo_path?: string | null
          name?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          admin_email: string
          id: boolean
          updated_at: string
          voucher_validity_days: number
        }
        Insert: {
          admin_email: string
          id?: boolean
          updated_at?: string
          voucher_validity_days?: number
        }
        Update: {
          admin_email?: string
          id?: boolean
          updated_at?: string
          voucher_validity_days?: number
        }
        Relationships: []
      }
      voucher_events: {
        Row: {
          at: string
          id: number
          note: string | null
          type: Database["public"]["Enums"]["voucher_event_type"]
          voucher_id: string
        }
        Insert: {
          at?: string
          id?: never
          note?: string | null
          type: Database["public"]["Enums"]["voucher_event_type"]
          voucher_id: string
        }
        Update: {
          at?: string
          id?: never
          note?: string | null
          type?: Database["public"]["Enums"]["voucher_event_type"]
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_events_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          customer_email: string
          customer_full_name: string
          customer_phone: string
          expires_at: string
          id: string
          locked_at: string | null
          redeem_method: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at: string | null
          reminder_sent_at: string | null
          secret_key: string
          secret_key_normalized: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          verify_attempts: number
          void_reason: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency"]
          customer_email: string
          customer_full_name: string
          customer_phone: string
          expires_at: string
          id?: string
          locked_at?: string | null
          redeem_method?: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at?: string | null
          reminder_sent_at?: string | null
          secret_key: string
          secret_key_normalized?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          verify_attempts?: number
          void_reason?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          customer_email?: string
          customer_full_name?: string
          customer_phone?: string
          expires_at?: string
          id?: string
          locked_at?: string | null
          redeem_method?: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at?: string | null
          reminder_sent_at?: string | null
          secret_key?: string
          secret_key_normalized?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          verify_attempts?: number
          void_reason?: string | null
        }
        Relationships: []
      }
      walk_ins: {
        Row: {
          bill_amount: number
          created_at: string
          credited_amount: number
          currency: Database["public"]["Enums"]["currency"]
          forfeited_amount: number
          id: string
          restaurant_id: string
          voucher_id: string
        }
        Insert: {
          bill_amount: number
          created_at?: string
          credited_amount: number
          currency: Database["public"]["Enums"]["currency"]
          forfeited_amount: number
          id?: string
          restaurant_id: string
          voucher_id: string
        }
        Update: {
          bill_amount?: number
          created_at?: string
          credited_amount?: number
          currency?: Database["public"]["Enums"]["currency"]
          forfeited_amount?: number
          id?: string
          restaurant_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walk_ins_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_ins_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: true
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payout_ledger: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency"] | null
          dispute_status: Database["public"]["Enums"]["dispute_status"] | null
          id: string | null
          order_reference: string | null
          payout_id: string | null
          restaurant_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["payout_source_type"] | null
          status: Database["public"]["Enums"]["payout_item_status"] | null
          walk_in_bill: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_menu: {
        Row: {
          category: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency"] | null
          description: string | null
          id: string | null
          image_path: string | null
          name: string | null
          restaurant_address: string | null
          restaurant_id: string | null
          restaurant_logo_path: string | null
          restaurant_name: string | null
          short_description: string | null
          soda_options: string[] | null
          spice_option: boolean | null
          water_option: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "combos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_wallets: {
        Row: {
          currency: Database["public"]["Enums"]["currency"] | null
          pending_balance: number | null
          pending_count: number | null
          restaurant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_order: {
        Args: {
          p_next: Database["public"]["Enums"]["order_status"]
          p_note: string
          p_order_id: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      auth_email_in_use: { Args: { p_email: string }; Returns: boolean }
      check_voucher_credentials: {
        Args: { p_code: string; p_secret_key: string }
        Returns: Json
      }
      claim_expiry_reminders: {
        Args: { p_hours: number }
        Returns: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          customer_email: string
          customer_full_name: string
          customer_phone: string
          expires_at: string
          id: string
          locked_at: string | null
          redeem_method: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at: string | null
          reminder_sent_at: string | null
          secret_key: string
          secret_key_normalized: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          verify_attempts: number
          void_reason: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "vouchers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_walkin: {
        Args: {
          p_bill: number
          p_code: string
          p_restaurant_id: string
          p_secret_key: string
        }
        Returns: Json
      }
      current_restaurant_id: { Args: never; Returns: string }
      disable_restaurant: { Args: { p_restaurant_id: string }; Returns: Json }
      expire_vouchers: { Args: never; Returns: number }
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      issue_voucher: {
        Args: {
          p_amount: number
          p_created_by: string
          p_currency: Database["public"]["Enums"]["currency"]
          p_email: string
          p_full_name: string
          p_phone: string
          p_secret_key: string
        }
        Returns: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          customer_email: string
          customer_full_name: string
          customer_phone: string
          expires_at: string
          id: string
          locked_at: string | null
          redeem_method: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at: string | null
          reminder_sent_at: string | null
          secret_key: string
          secret_key_normalized: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          verify_attempts: number
          void_reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vouchers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      place_order: {
        Args: {
          p_additional_info: string
          p_code: string
          p_combo_id: string
          p_delivery_name: string
          p_delivery_phone: string
          p_delivery_whatsapp: string
          p_drink: string
          p_drop: Database["public"]["Enums"]["drop_option"]
          p_floor: string
          p_house_name: string
          p_house_number: string
          p_landmark: string
          p_secret_key: string
          p_spice: Database["public"]["Enums"]["spice_level"]
        }
        Returns: Json
      }
      process_payout: {
        Args: {
          p_acknowledge_disputes: boolean
          p_expected_count: number
          p_expected_total: number
          p_processed_by: string
          p_reference: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      release_voucher: {
        Args: { p_note: string; p_voucher_id: string }
        Returns: boolean
      }
      report_order_problem: {
        Args: { p_note: string; p_reference: string; p_secret_key: string }
        Returns: Json
      }
      void_voucher: {
        Args: { p_reason: string; p_voucher_id: string }
        Returns: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          customer_email: string
          customer_full_name: string
          customer_phone: string
          expires_at: string
          id: string
          locked_at: string | null
          redeem_method: Database["public"]["Enums"]["redeem_method"] | null
          redeemed_at: string | null
          reminder_sent_at: string | null
          secret_key: string
          secret_key_normalized: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          verify_attempts: number
          void_reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vouchers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      currency: "NGN" | "KES" | "USD"
      dispute_status: "open" | "resolved"
      drop_option: "door_drop" | "leave_at_gate"
      notification_channel: "email" | "whatsapp"
      notification_recipient_type: "customer" | "restaurant" | "admin"
      notification_status: "queued" | "sent" | "failed" | "skipped"
      order_status:
        | "placed"
        | "received"
        | "dispatched"
        | "delivered"
        | "cancelled"
        | "rejected"
      payout_item_status: "pending" | "paid" | "revoked"
      payout_source_type: "order" | "walk_in"
      redeem_method: "delivery" | "walk_in"
      restaurant_status: "invited" | "active" | "disabled"
      spice_level: "spicy" | "non_spicy"
      voucher_event_type:
        | "issued"
        | "reserved"
        | "released"
        | "redeemed_delivery"
        | "redeemed_walkin"
        | "expired"
        | "voided"
      voucher_status: "issued" | "reserved" | "redeemed" | "expired" | "void"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency: ["NGN", "KES", "USD"],
      dispute_status: ["open", "resolved"],
      drop_option: ["door_drop", "leave_at_gate"],
      notification_channel: ["email", "whatsapp"],
      notification_recipient_type: ["customer", "restaurant", "admin"],
      notification_status: ["queued", "sent", "failed", "skipped"],
      order_status: [
        "placed",
        "received",
        "dispatched",
        "delivered",
        "cancelled",
        "rejected",
      ],
      payout_item_status: ["pending", "paid", "revoked"],
      payout_source_type: ["order", "walk_in"],
      redeem_method: ["delivery", "walk_in"],
      restaurant_status: ["invited", "active", "disabled"],
      spice_level: ["spicy", "non_spicy"],
      voucher_event_type: [
        "issued",
        "reserved",
        "released",
        "redeemed_delivery",
        "redeemed_walkin",
        "expired",
        "voided",
      ],
      voucher_status: ["issued", "reserved", "redeemed", "expired", "void"],
    },
  },
} as const
