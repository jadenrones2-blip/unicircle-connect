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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          club_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          club_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          club_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      applicants: {
        Row: {
          club_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          major: string | null
          notes: string | null
          stage_id: string | null
          updated_at: string
          year: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          major?: string | null
          notes?: string | null
          stage_id?: string | null
          updated_at?: string
          year?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          major?: string | null
          notes?: string | null
          stage_id?: string | null
          updated_at?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "recruitment_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          club_id: string
          created_at: string | null
          email: string
          first_attempt_at: string | null
          id: string
          ip_address: string | null
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          club_id: string
          created_at?: string | null
          email: string
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          club_id?: string
          created_at?: string | null
          email?: string
          first_attempt_at?: string | null
          id?: string
          ip_address?: string | null
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      club_applications: {
        Row: {
          applied_at: string
          club_id: string
          club_name: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          club_id: string
          club_name: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          club_id?: string
          club_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      club_claim_requests: {
        Row: {
          club_id: string
          club_name: string
          created_at: string
          email: string
          id: string
          name: string
          proof_link: string | null
          status: string
          token_expires_at: string | null
          user_id: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          club_id: string
          club_name: string
          created_at?: string
          email: string
          id?: string
          name: string
          proof_link?: string | null
          status?: string
          token_expires_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          club_id?: string
          club_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          proof_link?: string | null
          status?: string
          token_expires_at?: string | null
          user_id?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      club_memberships: {
        Row: {
          club_id: string
          club_name: string
          created_at: string
          id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          club_name: string
          created_at?: string
          id?: string
          joined_at?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          club_name?: string
          created_at?: string
          id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      club_owners: {
        Row: {
          club_id: string
          club_name: string
          created_at: string
          email: string
          id: string
          last_verification_at: string | null
          provisional_until: string | null
          restrictions: Json | null
          trust_level: Database["public"]["Enums"]["trust_level"] | null
          trust_score: number | null
          user_id: string
          verification_state:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified_at: string
          verified_domain: string | null
        }
        Insert: {
          club_id: string
          club_name: string
          created_at?: string
          email: string
          id?: string
          last_verification_at?: string | null
          provisional_until?: string | null
          restrictions?: Json | null
          trust_level?: Database["public"]["Enums"]["trust_level"] | null
          trust_score?: number | null
          user_id: string
          verification_state?:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified_at?: string
          verified_domain?: string | null
        }
        Update: {
          club_id?: string
          club_name?: string
          created_at?: string
          email?: string
          id?: string
          last_verification_at?: string | null
          provisional_until?: string | null
          restrictions?: Json | null
          trust_level?: Database["public"]["Enums"]["trust_level"] | null
          trust_score?: number | null
          user_id?: string
          verification_state?:
            | Database["public"]["Enums"]["verification_state"]
            | null
          verified_at?: string
          verified_domain?: string | null
        }
        Relationships: []
      }
      disposable_domains: {
        Row: {
          added_at: string | null
          domain: string
        }
        Insert: {
          added_at?: string | null
          domain: string
        }
        Update: {
          added_at?: string | null
          domain?: string
        }
        Relationships: []
      }
      email_domain_rules: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          reason: string | null
          rule_type: string
          trust_level: Database["public"]["Enums"]["trust_level"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          reason?: string | null
          rule_type: string
          trust_level?: Database["public"]["Enums"]["trust_level"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          reason?: string | null
          rule_type?: string
          trust_level?: Database["public"]["Enums"]["trust_level"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ownership_transfers: {
        Row: {
          approvals: Json | null
          club_id: string
          created_at: string | null
          expires_at: string | null
          from_user_id: string | null
          id: string
          reason: string | null
          required_approvals: number | null
          status: string | null
          to_email: string
          to_user_id: string
          updated_at: string | null
        }
        Insert: {
          approvals?: Json | null
          club_id: string
          created_at?: string | null
          expires_at?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          required_approvals?: number | null
          status?: string | null
          to_email: string
          to_user_id: string
          updated_at?: string | null
        }
        Update: {
          approvals?: Json | null
          club_id?: string
          created_at?: string | null
          expires_at?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          required_approvals?: number | null
          status?: string | null
          to_email?: string
          to_user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruitment_settings: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_stages: {
        Row: {
          club_id: string
          created_at: string
          id: string
          label: string
          order_index: number
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          label: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          label?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest_category: string
          interest_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_category: string
          interest_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_category?: string
          interest_value?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      trust_level: "high" | "medium" | "low"
      verification_state:
        | "unverified"
        | "provisional"
        | "verified"
        | "suspended"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      trust_level: ["high", "medium", "low"],
      verification_state: [
        "unverified",
        "provisional",
        "verified",
        "suspended",
      ],
    },
  },
} as const
