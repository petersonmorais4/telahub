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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      advertiser_leads: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          name: string
          notified_at: string | null
          phone: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          name: string
          notified_at?: string | null
          phone: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notified_at?: string | null
          phone?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          company_name: string
          default_duration: number
          id: number
          idle_message: string
          logo_url: string | null
          player_bg: string
          transition: string
          updated_at: string
          weather_city: string
        }
        Insert: {
          company_name?: string
          default_duration?: number
          id?: number
          idle_message?: string
          logo_url?: string | null
          player_bg?: string
          transition?: string
          updated_at?: string
          weather_city?: string
        }
        Update: {
          company_name?: string
          default_duration?: number
          id?: number
          idle_message?: string
          logo_url?: string | null
          player_bg?: string
          transition?: string
          updated_at?: string
          weather_city?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          funding_source: string
          id: string
          notes: string | null
          quantity: number
          supplier: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          funding_source?: string
          id?: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          funding_source?: string
          id?: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
        }
        Relationships: []
      }
      login_mfa: {
        Row: {
          attempts: number
          code_hash: string | null
          created_at: string
          expires_at: string | null
          session_id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash?: string | null
          created_at?: string
          expires_at?: string | null
          session_id: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string | null
          created_at?: string
          expires_at?: string | null
          session_id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          active: boolean
          content_config: Json
          created_at: string
          duration: number
          end_date: string | null
          id: string
          start_date: string | null
          storage_path: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          content_config?: Json
          created_at?: string
          duration?: number
          end_date?: string | null
          id?: string
          start_date?: string | null
          storage_path: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          content_config?: Json
          created_at?: string
          duration?: number
          end_date?: string | null
          id?: string
          start_date?: string | null
          storage_path?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      media_contacts: {
        Row: {
          client_email: string | null
          client_name: string | null
          media_id: string
          send_report: boolean
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          media_id: string
          send_report?: boolean
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          media_id?: string
          send_report?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_contacts_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          address: string
          business_name: string
          cnpj: string
          created_at: string
          id: string
          notified_at: string | null
        }
        Insert: {
          address: string
          business_name: string
          cnpj: string
          created_at?: string
          id?: string
          notified_at?: string | null
        }
        Update: {
          address?: string
          business_name?: string
          cnpj?: string
          created_at?: string
          id?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      play_logs: {
        Row: {
          id: string
          media_id: string | null
          played_at: string
          screen_id: string | null
        }
        Insert: {
          id?: string
          media_id?: string | null
          played_at?: string
          screen_id?: string | null
        }
        Update: {
          id?: string
          media_id?: string | null
          played_at?: string
          screen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_logs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_logs_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string
          id: string
          media_id: string
          playlist_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          playlist_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          playlist_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          loop: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          loop?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          loop?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      revenues: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          media_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          recurrence_days: number
          recurring: boolean
        }
        Insert: {
          amount: number
          client_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recurrence_days?: number
          recurring?: boolean
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recurrence_days?: number
          recurring?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "revenues_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_lead_events: {
        Row: {
          body: string | null
          created_at: string
          event_date: string
          from_stage: string | null
          id: string
          kind: string
          lead_id: string
          to_stage: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_date?: string
          from_stage?: string | null
          id?: string
          kind?: string
          lead_id: string
          to_stage?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          event_date?: string
          from_stage?: string | null
          id?: string
          kind?: string
          lead_id?: string
          to_stage?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          business_name: string
          city: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          id: string
          lost_reason: string | null
          monthly_value: number
          next_action_date: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          position: number
          segment: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          business_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lost_reason?: string | null
          monthly_value?: number
          next_action_date?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          position?: number
          segment?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lost_reason?: string | null
          monthly_value?: number
          next_action_date?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          position?: number
          segment?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          id: string
          media_id: string | null
          name: string | null
          playlist_id: string | null
          start_time: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          media_id?: string | null
          name?: string | null
          playlist_id?: string | null
          start_time?: string
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          media_id?: string | null
          name?: string | null
          playlist_id?: string | null
          start_time?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "schedules_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_contacts: {
        Row: {
          partner_email: string | null
          partner_name: string | null
          screen_id: string
          updated_at: string
        }
        Insert: {
          partner_email?: string | null
          partner_name?: string | null
          screen_id: string
          updated_at?: string
        }
        Update: {
          partner_email?: string | null
          partner_name?: string | null
          screen_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_contacts_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: true
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          address_number: string | null
          business_hours: Json | null
          cep: string | null
          city: string | null
          code: string
          complement: string | null
          created_at: string
          id: string
          last_seen: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          neighborhood: string | null
          orientation: string
          playlist_id: string | null
          rotation: number | null
          show_on_map: boolean
          state: string | null
          status: string
          street: string | null
        }
        Insert: {
          address_number?: string | null
          business_hours?: Json | null
          cep?: string | null
          city?: string | null
          code: string
          complement?: string | null
          created_at?: string
          id?: string
          last_seen?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          orientation?: string
          playlist_id?: string | null
          rotation?: number | null
          show_on_map?: boolean
          state?: string | null
          status?: string
          street?: string | null
        }
        Update: {
          address_number?: string | null
          business_hours?: Json | null
          cep?: string | null
          city?: string | null
          code?: string
          complement?: string | null
          created_at?: string
          id?: string
          last_seen?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          orientation?: string
          playlist_id?: string | null
          rotation?: number | null
          show_on_map?: boolean
          state?: string | null
          status?: string
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screens_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          phone: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          phone?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_message_statuses: {
        Row: {
          created_at: string
          delivery_id: string
          error_details: Json | null
          id: string
          provider_message_id: string
          provider_timestamp: string | null
          status: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          error_details?: Json | null
          id?: string
          provider_message_id: string
          provider_timestamp?: string | null
          status: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          error_details?: Json | null
          id?: string
          provider_message_id?: string
          provider_timestamp?: string | null
          status?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_details: Json | null
          failed_at: string | null
          id: string
          message_type: string
          provider_message_id: string | null
          provider_timestamp: string | null
          read_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_details?: Json | null
          failed_at?: string | null
          id?: string
          message_type?: string
          provider_message_id?: string | null
          provider_timestamp?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_details?: Json | null
          failed_at?: string | null
          id?: string
          message_type?: string
          provider_message_id?: string | null
          provider_timestamp?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          attempts: number
          delivery_id: string
          event: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          attempts?: number
          delivery_id: string
          event: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          attempts?: number
          delivery_id?: string
          event?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_finance_read: { Args: { _user_id: string }; Returns: boolean }
      can_finance_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_operacional: { Args: { _user_id: string }; Returns: boolean }
      is_sales: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_sales_users: {
        Args: never
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      touch_screen: { Args: { p_code: string }; Returns: undefined }
      valid_business_hours: { Args: { value: Json }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer" | "operacional"
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
      app_role: ["admin", "operator", "viewer", "operacional"],
    },
  },
} as const
