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
      anonymous_submission_credentials: {
        Row: {
          credential_digest: string
          evaluation_assignment_id: string
          expires_at: string
          id: string
          issued_at: string
          organization_id: string
          redeemed_on: string | null
          status: string
        }
        Insert: {
          credential_digest: string
          evaluation_assignment_id: string
          expires_at: string
          id?: string
          issued_at?: string
          organization_id: string
          redeemed_on?: string | null
          status?: string
        }
        Update: {
          credential_digest?: string
          evaluation_assignment_id?: string
          expires_at?: string
          id?: string
          issued_at?: string
          organization_id?: string
          redeemed_on?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_submission_credentials_evaluation_assignment_id_fkey"
            columns: ["evaluation_assignment_id"]
            isOneToOne: false
            referencedRelation: "evaluation_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_submission_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      encrypted_evaluation_submissions: {
        Row: {
          assignment_kind: string
          encrypted_payload: string
          encryption_algorithm: string
          encryption_context_version: number
          encryption_key_version: string
          encryption_nonce: string
          evaluation_cycle_id: string
          id: string
          organization_id: string
          payload_schema_version: number
          project_id: string | null
          stored_on: string
          subject_user_id: string
          template_version_id: string
        }
        Insert: {
          assignment_kind: string
          encrypted_payload: string
          encryption_algorithm: string
          encryption_context_version: number
          encryption_key_version: string
          encryption_nonce: string
          evaluation_cycle_id: string
          id?: string
          organization_id: string
          payload_schema_version: number
          project_id?: string | null
          stored_on?: string
          subject_user_id: string
          template_version_id: string
        }
        Update: {
          assignment_kind?: string
          encrypted_payload?: string
          encryption_algorithm?: string
          encryption_context_version?: number
          encryption_key_version?: string
          encryption_nonce?: string
          evaluation_cycle_id?: string
          id?: string
          organization_id?: string
          payload_schema_version?: number
          project_id?: string | null
          stored_on?: string
          subject_user_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_evaluation_submissions_cycle_tenant_fk"
            columns: ["organization_id", "evaluation_cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "encrypted_evaluation_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encrypted_evaluation_submissions_project_tenant_fk"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "encrypted_evaluation_submissions_template_tenant_fk"
            columns: ["organization_id", "template_version_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      evaluation_assignments: {
        Row: {
          assignment_kind: string
          created_at: string
          created_by_user_id: string | null
          evaluation_cycle_id: string
          evaluator_user_id: string
          id: string
          organization_id: string
          project_id: string | null
          status: string
          subject_user_id: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          assignment_kind?: string
          created_at?: string
          created_by_user_id?: string | null
          evaluation_cycle_id: string
          evaluator_user_id: string
          id?: string
          organization_id: string
          project_id?: string | null
          status?: string
          subject_user_id: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          assignment_kind?: string
          created_at?: string
          created_by_user_id?: string | null
          evaluation_cycle_id?: string
          evaluator_user_id?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          status?: string
          subject_user_id?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_assignments_evaluation_cycle_id_fkey"
            columns: ["evaluation_cycle_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_template_version_tenant_fk"
            columns: ["organization_id", "template_version_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_versions"
            referencedColumns: ["organization_id", "id"]
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
          template_version_id: string
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
          template_version_id: string
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
          template_version_id?: string
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
          {
            foreignKeyName: "evaluation_cycles_template_version_tenant_fk"
            columns: ["organization_id", "template_version_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      evaluation_encryption_recovery_canaries: {
        Row: {
          canary_digest: string
          context_version: number
          encrypted_canary: string
          encryption_key_version: string
          environment_id: string
          nonce: string
          refreshed_at: string
        }
        Insert: {
          canary_digest: string
          context_version?: number
          encrypted_canary: string
          encryption_key_version: string
          environment_id: string
          nonce: string
          refreshed_at?: string
        }
        Update: {
          canary_digest?: string
          context_version?: number
          encrypted_canary?: string
          encryption_key_version?: string
          environment_id?: string
          nonce?: string
          refreshed_at?: string
        }
        Relationships: []
      }
      evaluation_template_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          options: Json
          organization_id: string
          position: number
          prompt: string
          question_type: string
          template_version_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          organization_id: string
          position: number
          prompt: string
          question_type: string
          template_version_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          organization_id?: string
          position?: number
          prompt?: string
          question_type?: string
          template_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_questions_version_tenant_fk"
            columns: ["organization_id", "template_version_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      evaluation_template_versions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          published_at: string | null
          published_by_user_id: string | null
          status: string
          template_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          published_at?: string | null
          published_by_user_id?: string | null
          status?: string
          template_id: string
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          published_at?: string | null
          published_by_user_id?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_versions_template_tenant_fk"
            columns: ["organization_id", "template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      organization_evaluation_retention_policies: {
        Row: {
          automatic_purge_enabled: boolean
          last_purge_completed_at: string | null
          last_purge_cutoff_on: string | null
          legal_hold: boolean
          organization_id: string
          policy_version: number
          retention_days: number
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          automatic_purge_enabled?: boolean
          last_purge_completed_at?: string | null
          last_purge_cutoff_on?: string | null
          legal_hold?: boolean
          organization_id: string
          policy_version?: number
          retention_days?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          automatic_purge_enabled?: boolean
          last_purge_completed_at?: string | null
          last_purge_cutoff_on?: string | null
          legal_hold?: boolean
          organization_id?: string
          policy_version?: number
          retention_days?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_evaluation_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          project_id?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_organization_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_project_tenant_fk"
            columns: ["organization_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["organization_id", "id"]
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
      security_abuse_event_counters: {
        Row: {
          bucket_started_at: string
          event_count: number
          event_type: string
        }
        Insert: {
          bucket_started_at: string
          event_count: number
          event_type: string
        }
        Update: {
          bucket_started_at?: string
          event_count?: number
          event_type?: string
        }
        Relationships: []
      }
      security_rate_limit_buckets: {
        Row: {
          bucket_key_hash: string
          bucket_scope: string
          expires_at: string
          request_count: number
          window_started_at: string
        }
        Insert: {
          bucket_key_hash: string
          bucket_scope: string
          expires_at: string
          request_count: number
          window_started_at: string
        }
        Update: {
          bucket_key_hash?: string
          bucket_scope?: string
          expires_at?: string
          request_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      tenant_bootstrap_operations: {
        Row: {
          administrator_user_id: string
          completed_at: string
          initial_unit_id: string
          invitation_id: string
          organization_id: string
          request_fingerprint: string
          request_id: string
        }
        Insert: {
          administrator_user_id: string
          completed_at?: string
          initial_unit_id: string
          invitation_id: string
          organization_id: string
          request_fingerprint: string
          request_id: string
        }
        Update: {
          administrator_user_id?: string
          completed_at?: string
          initial_unit_id?: string
          invitation_id?: string
          organization_id?: string
          request_fingerprint?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_bootstrap_operations_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "user_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_bootstrap_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_bootstrap_operations_unit_fk"
            columns: ["organization_id", "initial_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_auth_user_id: string | null
          invited_by_user_id: string | null
          invited_role_code: string
          invited_scope_id: string | null
          invited_scope_type: string
          manager_user_id: string | null
          membership_kind: string
          organization_id: string | null
          revoked_at: string | null
          token_hash: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          expires_at: string
          id?: string
          invited_auth_user_id?: string | null
          invited_by_user_id?: string | null
          invited_role_code: string
          invited_scope_id?: string | null
          invited_scope_type: string
          manager_user_id?: string | null
          membership_kind?: string
          organization_id?: string | null
          revoked_at?: string | null
          token_hash: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_auth_user_id?: string | null
          invited_by_user_id?: string | null
          invited_role_code?: string
          invited_scope_id?: string | null
          invited_scope_type?: string
          manager_user_id?: string | null
          membership_kind?: string
          organization_id?: string | null
          revoked_at?: string | null
          token_hash?: string
          unit_id?: string | null
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
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_unit_fk"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["organization_id", "id"]
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
      accept_user_invitation: {
        Args: { accepting_user_id: string; invitation_id: string }
        Returns: Json
      }
      admin_assign_user_role: {
        Args: {
          actor_user_id: string
          assigned_role_code: string
          assigned_unit_id: string
          managed_organization_id: string
          target_user_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "user_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_clone_evaluation_template_version: {
        Args: { actor_user_id: string; source_template_version_id: string }
        Returns: Json
      }
      admin_end_user_role: {
        Args: {
          actor_user_id: string
          managed_organization_id: string
          role_assignment_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "user_role_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_publish_evaluation_template_version: {
        Args: { actor_user_id: string; managed_template_version_id: string }
        Returns: Json
      }
      admin_save_evaluation_template_draft: {
        Args: {
          actor_user_id: string
          managed_organization_id: string
          managed_template_id: string
          managed_template_version_id: string
          template_description: string
          template_name: string
          template_questions: Json
        }
        Returns: Json
      }
      admin_set_user_hierarchy_context: {
        Args: {
          actor_user_id: string
          direct_manager_user_id: string
          managed_organization_id: string
          primary_membership_kind: string
          primary_unit_id: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_update_evaluation_retention_policy: {
        Args: {
          actor_user_id: string
          managed_automatic_purge_enabled: boolean
          managed_legal_hold: boolean
          managed_organization_id: string
          managed_retention_days: number
        }
        Returns: Json
      }
      admin_update_organization_name: {
        Args: {
          actor_user_id: string
          managed_organization_id: string
          organization_name: string
        }
        Returns: Json
      }
      admin_update_project_dates: {
        Args: {
          actor_user_id: string
          managed_evaluation_cycle_id: string
          managed_project_id: string
          new_evaluation_closes_at: string
          new_project_completed_on: string
        }
        Returns: Json
      }
      admin_upsert_organization_unit: {
        Args: {
          actor_user_id: string
          managed_organization_id: string
          managed_parent_unit_id: string
          managed_status: string
          managed_unit_id: string
          managed_unit_type: string
          unit_name: string
          unit_slug: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "organization_units"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bootstrap_organization_tenant: {
        Args: {
          administrator_display_name: string
          administrator_email: string
          bootstrap_administrator_user_id: string
          bootstrap_request_id: string
          expected_request_fingerprint: string
          initial_unit_name: string
          initial_unit_slug: string
          invitation_expires_in_days?: number
          organization_name: string
          organization_slug: string
        }
        Returns: Json
      }
      list_platform_organization_tenants: {
        Args: { actor_user_id: string }
        Returns: Json
      }
      platform_bootstrap_organization_tenant: {
        Args: {
          actor_user_id: string
          administrator_display_name: string
          administrator_email: string
          bootstrap_administrator_user_id: string
          bootstrap_request_id: string
          expected_request_fingerprint: string
          initial_unit_name: string
          initial_unit_slug: string
          invitation_expires_in_days?: number
          organization_name: string
          organization_slug: string
        }
        Returns: Json
      }
      platform_renew_tenant_bootstrap_invitation: {
        Args: {
          actor_user_id: string
          bootstrap_request_id: string
          invitation_expires_in_days?: number
        }
        Returns: Json
      }
      require_active_platform_system_admin: {
        Args: { actor_user_id: string }
        Returns: undefined
      }
      can_review_evaluation_subject: {
        Args: {
          actor_user_id: string
          managed_evaluation_cycle_id: string
          managed_organization_id: string
          managed_project_id: string
          managed_subject_user_id: string
        }
        Returns: boolean
      }
      consume_anonymous_submission_request: {
        Args: { credential_digest_hex: string }
        Returns: Json
      }
      consume_security_rate_limit: {
        Args: {
          managed_bucket_key_hash: string
          managed_bucket_scope: string
          managed_limit: number
          managed_observed_at: string
          managed_window: string
        }
        Returns: number
      }
      execute_due_evaluation_content_retention: { Args: never; Returns: Json }
      get_anonymous_submission_abuse_summary: {
        Args: { actor_user_id: string }
        Returns: Json
      }
      get_anonymous_submission_abuse_summary_for_operator: {
        Args: never
        Returns: Json
      }
      get_anonymous_submission_context: {
        Args: { credential_digest_hex: string }
        Returns: Json
      }
      get_encrypted_evaluation_report_batch: {
        Args: {
          actor_user_id: string
          managed_evaluation_cycle_id: string
          managed_subject_user_id: string
        }
        Returns: Json
      }
      get_my_evaluation_assignments: { Args: never; Returns: Json }
      get_my_workspace_context: { Args: never; Returns: Json }
      get_tenant_bootstrap_operation: {
        Args: {
          bootstrap_request_id: string
          expected_request_fingerprint: string
        }
        Returns: Json
      }
      get_thresholded_evaluation_report_batch_without_close_metadata: {
        Args: {
          actor_user_id: string
          managed_evaluation_cycle_id: string
          managed_subject_user_id: string
        }
        Returns: Json
      }
      issue_anonymous_submission_credential: {
        Args: {
          actor_user_id: string
          credential_digest_hex: string
          managed_assignment_id: string
        }
        Returns: Json
      }
      list_manageable_evaluation_retention_policies: {
        Args: { actor_user_id: string }
        Returns: Json
      }
      list_my_evaluation_report_targets: {
        Args: { actor_user_id: string }
        Returns: Json
      }
      list_referenced_evaluation_encryption_key_versions: {
        Args: never
        Returns: string[]
      }
      read_anonymous_submission_abuse_summary: { Args: never; Returns: Json }
      record_security_abuse_event: {
        Args: { managed_event_type: string; managed_observed_at: string }
        Returns: undefined
      }
      redeem_anonymous_submission_credential: {
        Args: {
          credential_digest_hex: string
          encrypted_payload_hex: string
          encryption_nonce_hex: string
          managed_encryption_context_version: number
          managed_encryption_key_version: string
          managed_payload_schema_version: number
        }
        Returns: Json
      }
      renew_tenant_bootstrap_invitation: {
        Args: {
          bootstrap_request_id: string
          expected_request_fingerprint: string
          invitation_expires_in_days?: number
        }
        Returns: Json
      }
      require_active_organization_identity: {
        Args: { checked_organization_id: string; checked_user_id: string }
        Returns: undefined
      }
      require_active_system_admin: {
        Args: { actor_user_id: string; managed_organization_id: string }
        Returns: undefined
      }
      upsert_evaluation_encryption_recovery_canaries: {
        Args: { managed_canaries: Json; managed_environment_id: string }
        Returns: number
      }
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
