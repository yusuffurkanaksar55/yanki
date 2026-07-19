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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_roles: {
        Row: {
          created_at: string
          description: string
          role_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          role_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          role_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_user_id: string | null
          event_scope_id: string | null
          event_scope_type: string | null
          event_type: string
          id: string
          occurred_at: string
          safe_metadata: Json
        }
        Insert: {
          actor_user_id?: string | null
          event_scope_id?: string | null
          event_scope_type?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          safe_metadata?: Json
        }
        Update: {
          actor_user_id?: string | null
          event_scope_id?: string | null
          event_scope_type?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          safe_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_event_scope_type_fkey"
            columns: ["event_scope_type"]
            isOneToOne: false
            referencedRelation: "scope_types"
            referencedColumns: ["scope_type"]
          },
        ]
      }
      evaluation_cycles: {
        Row: {
          anonymity_threshold: number
          closes_at: string
          created_at: string
          created_by_user_id: string | null
          cycle_type: string
          id: string
          name: string
          opens_at: string
          organization_id: string
          project_completed_on: string | null
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anonymity_threshold?: number
          closes_at: string
          created_at?: string
          created_by_user_id?: string | null
          cycle_type?: string
          id?: string
          name: string
          opens_at: string
          organization_id: string
          project_completed_on?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anonymity_threshold?: number
          closes_at?: string
          created_at?: string
          created_by_user_id?: string | null
          cycle_type?: string
          id?: string
          name?: string
          opens_at?: string
          organization_id?: string
          project_completed_on?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_cycles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_assignments: {
        Row: {
          created_at: string
          direct_report_user_id: string
          ends_at: string | null
          id: string
          manager_user_id: string
          organization_id: string
          relationship_type: string
          scope_unit_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direct_report_user_id: string
          ends_at?: string | null
          id?: string
          manager_user_id: string
          organization_id: string
          relationship_type?: string
          scope_unit_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direct_report_user_id?: string
          ends_at?: string | null
          id?: string
          manager_user_id?: string
          organization_id?: string
          relationship_type?: string
          scope_unit_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_assignments_scope_unit_id_fkey"
            columns: ["scope_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_unit_memberships: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_primary: boolean
          membership_kind: string
          organization_id: string
          starts_at: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_primary?: boolean
          membership_kind?: string
          organization_id: string
          starts_at?: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_primary?: boolean
          membership_kind?: string
          organization_id?: string
          starts_at?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_unit_memberships_unit_fk"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_units: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_unit_id: string | null
          slug: string
          status: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_unit_id?: string | null
          slug: string
          status?: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_unit_id?: string | null
          slug?: string
          status?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_memberships: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          membership_kind: string
          project_id: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          membership_kind?: string
          project_id: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          membership_kind?: string
          project_id?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          completes_on: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          project_manager_user_id: string | null
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          completes_on?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          project_manager_user_id?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          completes_on?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          project_manager_user_id?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_types: {
        Row: {
          created_at: string
          description: string
          scope_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          scope_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          scope_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string | null
          invited_role_code: string
          invited_scope_id: string | null
          invited_scope_type: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by_user_id?: string | null
          invited_role_code: string
          invited_scope_id?: string | null
          invited_scope_type: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          invited_role_code?: string
          invited_scope_id?: string | null
          invited_scope_type?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_role_code_fkey"
            columns: ["invited_role_code"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["role_code"]
          },
          {
            foreignKeyName: "user_invitations_invited_scope_type_fkey"
            columns: ["invited_scope_type"]
            isOneToOne: false
            referencedRelation: "scope_types"
            referencedColumns: ["scope_type"]
          },
        ]
      }
      user_profiles: {
        Row: {
          activated_at: string | null
          created_at: string
          display_name: string | null
          email: string
          onboarding_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          onboarding_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          onboarding_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          role_code: string
          scope_id: string | null
          scope_type: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          role_code: string
          scope_id?: string | null
          scope_type: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          role_code?: string
          scope_id?: string | null
          scope_type?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["role_code"]
          },
          {
            foreignKeyName: "user_role_assignments_scope_type_fkey"
            columns: ["scope_type"]
            isOneToOne: false
            referencedRelation: "scope_types"
            referencedColumns: ["scope_type"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_workspace_context: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
