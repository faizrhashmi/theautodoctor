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
    PostgrestVersion: "13.0.5"
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
      account_deletion_queue: {
        Row: {
          admin_notes: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          data_deleted: Json | null
          data_retained: Json | null
          deletion_reason: string | null
          full_anonymization_date: string | null
          id: string
          ip_address: unknown
          processing_started_at: string | null
          requested_at: string | null
          requested_by: string | null
          retention_schedule: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          data_deleted?: Json | null
          data_retained?: Json | null
          deletion_reason?: string | null
          full_anonymization_date?: string | null
          id?: string
          ip_address?: unknown
          processing_started_at?: string | null
          requested_at?: string | null
          requested_by?: string | null
          retention_schedule?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          data_deleted?: Json | null
          data_retained?: Json | null
          deletion_reason?: string | null
          full_anonymization_date?: string | null
          id?: string
          ip_address?: unknown
          processing_started_at?: string | null
          requested_at?: string | null
          requested_by?: string | null
          retention_schedule?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_errors: {
        Row: {
          affected_users: string[] | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          first_seen: string | null
          id: string
          last_seen: string | null
          metadata: Json | null
          occurrence_count: number | null
          resolution_notes: string | null
          source: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          affected_users?: string[] | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          occurrence_count?: number | null
          resolution_notes?: string | null
          source: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_users?: string[] | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          occurrence_count?: number | null
          resolution_notes?: string | null
          source?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          source: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      admin_query_history: {
        Row: {
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          execution_time_ms: number | null
          id: string
          query: string
          rows_returned: number | null
          success: boolean | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          query: string
          rows_returned?: number | null
          success?: boolean | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          id?: string
          query?: string
          rows_returned?: number | null
          success?: boolean | null
        }
        Relationships: []
      }
      admin_saved_queries: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          query: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          query: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          query?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agreement_sections: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          agreement_id: string
          created_at: string | null
          display_order: number
          id: string
          section_content: string
          section_key: string
          section_title: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          agreement_id: string
          created_at?: string | null
          display_order?: number
          id?: string
          section_content: string
          section_key: string
          section_title: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          agreement_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          section_content?: string
          section_key?: string
          section_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_sections_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "agreement_sections_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_sections_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["agreement_id"]
          },
        ]
      }
      bay_bookings: {
        Row: {
          actual_job_count: number | null
          agreement_id: string | null
          bay_name: string | null
          bay_number: number | null
          booking_date: string
          booking_fee: number | null
          charged: boolean | null
          checked_in_at: string | null
          checked_out_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          end_time: string
          estimated_job_count: number | null
          id: string
          mechanic_id: string
          mechanic_notes: string | null
          paid: boolean | null
          quote_ids: string[] | null
          requested_at: string | null
          session_ids: string[] | null
          start_time: string
          status: string | null
          updated_at: string | null
          workshop_id: string
          workshop_notes: string | null
        }
        Insert: {
          actual_job_count?: number | null
          agreement_id?: string | null
          bay_name?: string | null
          bay_number?: number | null
          booking_date: string
          booking_fee?: number | null
          charged?: boolean | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_time: string
          estimated_job_count?: number | null
          id?: string
          mechanic_id: string
          mechanic_notes?: string | null
          paid?: boolean | null
          quote_ids?: string[] | null
          requested_at?: string | null
          session_ids?: string[] | null
          start_time: string
          status?: string | null
          updated_at?: string | null
          workshop_id: string
          workshop_notes?: string | null
        }
        Update: {
          actual_job_count?: number | null
          agreement_id?: string | null
          bay_name?: string | null
          bay_number?: number | null
          booking_date?: string
          booking_fee?: number | null
          charged?: boolean | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_time?: string
          estimated_job_count?: number | null
          id?: string
          mechanic_id?: string
          mechanic_notes?: string | null
          paid?: boolean | null
          quote_ids?: string[] | null
          requested_at?: string | null
          session_ids?: string[] | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
          workshop_id?: string
          workshop_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bay_bookings_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bay_bookings_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bay_bookings_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "bay_bookings_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bay_bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "bay_bookings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: number
          mechanic_id: string | null
          service_id: number | null
          start_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_at?: string | null
          id?: number
          mechanic_id?: string | null
          service_id?: number | null
          start_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string | null
          id?: number
          mechanic_id?: string | null
          service_id?: number | null
          start_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_specializations: {
        Row: {
          active: boolean | null
          brand_logo_url: string | null
          brand_name: string
          created_at: string | null
          id: string
          is_luxury: boolean | null
          requires_certification: boolean | null
          specialist_premium: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          brand_logo_url?: string | null
          brand_name: string
          created_at?: string | null
          id?: string
          is_luxury?: boolean | null
          requires_certification?: boolean | null
          specialist_premium?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          brand_logo_url?: string | null
          brand_name?: string
          created_at?: string | null
          id?: string
          is_luxury?: boolean | null
          requires_certification?: boolean | null
          specialist_premium?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          session_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          session_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_history: {
        Row: {
          cleanup_type: string
          created_at: string | null
          id: string
          items_cleaned: number | null
          preview_mode: boolean | null
          summary: Json | null
          triggered_by: string | null
        }
        Insert: {
          cleanup_type: string
          created_at?: string | null
          id?: string
          items_cleaned?: number | null
          preview_mode?: boolean | null
          summary?: Json | null
          triggered_by?: string | null
        }
        Update: {
          cleanup_type?: string
          created_at?: string | null
          id?: string
          items_cleaned?: number | null
          preview_mode?: boolean | null
          summary?: Json | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      consent_withdrawal_log: {
        Row: {
          consent_type: string
          created_at: string | null
          customer_id: string
          id: string
          ip_address: unknown
          original_consent_id: string | null
          processed: boolean | null
          processed_at: string | null
          processed_by: string | null
          user_agent: string | null
          withdrawal_method: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          customer_id: string
          id?: string
          ip_address?: unknown
          original_consent_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          user_agent?: string | null
          withdrawal_method?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          ip_address?: unknown
          original_consent_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          user_agent?: string | null
          withdrawal_method?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_withdrawal_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "consent_withdrawal_log_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_businesses: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          assigned_account_manager_id: string | null
          auto_renew: boolean | null
          billing_address_same_as_company: boolean | null
          billing_city: string | null
          billing_contact_name: string | null
          billing_contact_phone: string | null
          billing_email: string | null
          billing_postal_code: string | null
          billing_province: string | null
          billing_street_address: string | null
          business_registration_number: string | null
          business_type: string
          city: string | null
          company_email: string
          company_name: string
          company_phone: string | null
          company_website: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          country: string | null
          created_at: string
          current_month_sessions: number | null
          custom_rate_per_session: number | null
          discount_percentage: number | null
          fleet_size: number | null
          id: string
          industry: string | null
          is_active: boolean | null
          metadata: Json | null
          monthly_session_limit: number | null
          notes: string | null
          payment_terms: string | null
          postal_code: string | null
          primary_contact_email: string
          primary_contact_name: string
          primary_contact_phone: string | null
          primary_contact_title: string | null
          province: string | null
          rejection_reason: string | null
          street_address: string | null
          subscription_tier: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_account_manager_id?: string | null
          auto_renew?: boolean | null
          billing_address_same_as_company?: boolean | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          billing_province?: string | null
          billing_street_address?: string | null
          business_registration_number?: string | null
          business_type: string
          city?: string | null
          company_email: string
          company_name: string
          company_phone?: string | null
          company_website?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          country?: string | null
          created_at?: string
          current_month_sessions?: number | null
          custom_rate_per_session?: number | null
          discount_percentage?: number | null
          fleet_size?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          monthly_session_limit?: number | null
          notes?: string | null
          payment_terms?: string | null
          postal_code?: string | null
          primary_contact_email: string
          primary_contact_name: string
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          province?: string | null
          rejection_reason?: string | null
          street_address?: string | null
          subscription_tier?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_account_manager_id?: string | null
          auto_renew?: boolean | null
          billing_address_same_as_company?: boolean | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_contact_phone?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          billing_province?: string | null
          billing_street_address?: string | null
          business_registration_number?: string | null
          business_type?: string
          city?: string | null
          company_email?: string
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          country?: string | null
          created_at?: string
          current_month_sessions?: number | null
          custom_rate_per_session?: number | null
          discount_percentage?: number | null
          fleet_size?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          monthly_session_limit?: number | null
          notes?: string | null
          payment_terms?: string | null
          postal_code?: string | null
          primary_contact_email?: string
          primary_contact_name?: string
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          province?: string | null
          rejection_reason?: string | null
          street_address?: string | null
          subscription_tier?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      corporate_employees: {
        Row: {
          added_by: string | null
          corporate_id: string
          created_at: string
          department: string | null
          employee_number: string | null
          employee_role: string
          employee_user_id: string
          id: string
          is_active: boolean | null
          last_session_at: string | null
          metadata: Json | null
          notes: string | null
          removed_at: string | null
          removed_by: string | null
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          corporate_id: string
          created_at?: string
          department?: string | null
          employee_number?: string | null
          employee_role: string
          employee_user_id: string
          id?: string
          is_active?: boolean | null
          last_session_at?: string | null
          metadata?: Json | null
          notes?: string | null
          removed_at?: string | null
          removed_by?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          corporate_id?: string
          created_at?: string
          department?: string | null
          employee_number?: string | null
          employee_role?: string
          employee_user_id?: string
          id?: string
          is_active?: boolean | null
          last_session_at?: string | null
          metadata?: Json | null
          notes?: string | null
          removed_at?: string | null
          removed_by?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_employees_corporate_id_fkey"
            columns: ["corporate_id"]
            isOneToOne: false
            referencedRelation: "corporate_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_invoices: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          corporate_id: string
          created_at: string
          discount_amount: number
          due_date: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          sent_at: string | null
          session_ids: Json | null
          sessions_count: number
          status: string
          stripe_invoice_id: string | null
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          corporate_id: string
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          session_ids?: Json | null
          sessions_count?: number
          status?: string
          stripe_invoice_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          corporate_id?: string
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          session_ids?: Json | null
          sessions_count?: number
          status?: string
          stripe_invoice_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_invoices_corporate_id_fkey"
            columns: ["corporate_id"]
            isOneToOne: false
            referencedRelation: "corporate_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_vehicles: {
        Row: {
          assigned_to_employee_id: string | null
          corporate_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_service_date: string | null
          license_plate: string | null
          make: string | null
          metadata: Json | null
          model: string | null
          next_service_date: string | null
          notes: string | null
          total_sessions: number | null
          updated_at: string
          vehicle_number: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_to_employee_id?: string | null
          corporate_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_service_date?: string | null
          license_plate?: string | null
          make?: string | null
          metadata?: Json | null
          model?: string | null
          next_service_date?: string | null
          notes?: string | null
          total_sessions?: number | null
          updated_at?: string
          vehicle_number?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_to_employee_id?: string | null
          corporate_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_service_date?: string | null
          license_plate?: string | null
          make?: string | null
          metadata?: Json | null
          model?: string | null
          next_service_date?: string | null
          notes?: string | null
          total_sessions?: number | null
          updated_at?: string
          vehicle_number?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_vehicles_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "corporate_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_vehicles_corporate_id_fkey"
            columns: ["corporate_id"]
            isOneToOne: false
            referencedRelation: "corporate_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_pricing: {
        Row: {
          created_at: string
          created_by: string | null
          credit_cost: number
          effective_from: string
          effective_until: string | null
          id: string
          is_specialist: boolean
          notes: string | null
          session_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_cost: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_specialist?: boolean
          notes?: string | null
          session_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_cost?: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_specialist?: boolean
          notes?: string | null
          session_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_pricing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_pricing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_pricing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "credit_pricing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          related_session_id: string | null
          session_type: string | null
          subscription_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          related_session_id?: string | null
          session_type?: string | null
          subscription_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          related_session_id?: string | null
          session_type?: string | null
          subscription_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credit_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "credit_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_consents: {
        Row: {
          consent_granted: boolean
          consent_method: string | null
          consent_text: string | null
          consent_type: string
          consent_version: string
          created_at: string | null
          customer_id: string
          granted_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          updated_at: string | null
          user_agent: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_granted?: boolean
          consent_method?: string | null
          consent_text?: string | null
          consent_type: string
          consent_version: string
          created_at?: string | null
          customer_id: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          updated_at?: string | null
          user_agent?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_granted?: boolean
          consent_method?: string | null
          consent_text?: string | null
          consent_type?: string
          consent_version?: string
          created_at?: string | null
          customer_id?: string
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          updated_at?: string | null
          user_agent?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          amount: number
          created_at: string
          customer_user_id: string
          expires_at: string | null
          id: string
          session_id: string | null
          status: string
          type: string
          updated_at: string
          used_at: string | null
          used_for_session_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_user_id: string
          expires_at?: string | null
          id?: string
          session_id?: string | null
          status?: string
          type: string
          updated_at?: string
          used_at?: string | null
          used_for_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_user_id?: string
          expires_at?: string | null
          id?: string
          session_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          used_at?: string | null
          used_for_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_used_for_session_id_fkey"
            columns: ["used_for_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          added_at: string | null
          customer_id: string | null
          id: string
          last_service_at: string | null
          mechanic_id: string | null
          total_services: number | null
          total_spent: number | null
          workshop_id: string | null
        }
        Insert: {
          added_at?: string | null
          customer_id?: string | null
          id?: string
          last_service_at?: string | null
          mechanic_id?: string | null
          total_services?: number | null
          total_spent?: number | null
          workshop_id?: string | null
        }
        Update: {
          added_at?: string | null
          customer_id?: string | null
          id?: string
          last_service_at?: string | null
          mechanic_id?: string | null
          total_services?: number | null
          total_spent?: number | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "customer_favorites_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          accent_color: string | null
          auto_accept_specialist_match: boolean
          blocked_mechanics: string[] | null
          created_at: string
          customer_id: string
          email_notifications: boolean
          favorite_mechanics: string[] | null
          id: string
          maintenance_reminders_enabled: boolean
          marketing_emails: boolean
          preferred_contact_method: string | null
          preferred_contact_time: string | null
          preferred_session_type: string | null
          push_notifications: boolean
          reminder_frequency_days: number | null
          sms_notifications: boolean
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          auto_accept_specialist_match?: boolean
          blocked_mechanics?: string[] | null
          created_at?: string
          customer_id: string
          email_notifications?: boolean
          favorite_mechanics?: string[] | null
          id?: string
          maintenance_reminders_enabled?: boolean
          marketing_emails?: boolean
          preferred_contact_method?: string | null
          preferred_contact_time?: string | null
          preferred_session_type?: string | null
          push_notifications?: boolean
          reminder_frequency_days?: number | null
          sms_notifications?: boolean
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          auto_accept_specialist_match?: boolean
          blocked_mechanics?: string[] | null
          created_at?: string
          customer_id?: string
          email_notifications?: boolean
          favorite_mechanics?: string[] | null
          id?: string
          maintenance_reminders_enabled?: boolean
          marketing_emails?: boolean
          preferred_contact_method?: string | null
          preferred_contact_time?: string | null
          preferred_session_type?: string | null
          push_notifications?: boolean
          reminder_frequency_days?: number | null
          sms_notifications?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle_end: string
          billing_cycle_start: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string
          credits_used: number
          current_credits: number
          customer_id: string
          ended_at: string | null
          id: string
          next_billing_date: string | null
          plan_id: string
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_credits_allocated: number
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle_end: string
          billing_cycle_start?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          credits_used?: number
          current_credits?: number
          customer_id: string
          ended_at?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_credits_allocated?: number
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_cycle_end?: string
          billing_cycle_start?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          credits_used?: number
          current_credits?: number
          customer_id?: string
          ended_at?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_credits_allocated?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_waitlist: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          metadata: Json | null
          notification_type: string
          notified_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          notified_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          notified_at?: string | null
          status?: string
        }
        Relationships: []
      }
      data_anonymization_log: {
        Row: {
          anonymization_method: string | null
          anonymized_at: string | null
          created_at: string | null
          customer_id: string
          data_type: string
          deletion_request_id: string | null
          error_message: string | null
          id: string
          performed_by: string | null
          records_affected: number | null
          retention_period_days: number | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          anonymization_method?: string | null
          anonymized_at?: string | null
          created_at?: string | null
          customer_id: string
          data_type: string
          deletion_request_id?: string | null
          error_message?: string | null
          id?: string
          performed_by?: string | null
          records_affected?: number | null
          retention_period_days?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          anonymization_method?: string | null
          anonymized_at?: string | null
          created_at?: string | null
          customer_id?: string
          data_type?: string
          deletion_request_id?: string | null
          error_message?: string | null
          id?: string
          performed_by?: string | null
          records_affected?: number | null
          retention_period_days?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_anonymization_log_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "account_deletion_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_anonymization_log_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "pending_account_deletions"
            referencedColumns: ["deletion_id"]
          },
        ]
      }
      data_breach_log: {
        Row: {
          actions_taken: string[] | null
          assigned_to: string | null
          breach_type: string
          contained_at: string | null
          contributing_factors: string[] | null
          created_at: string | null
          customers_affected: number | null
          customers_notified: boolean | null
          customers_notified_at: string | null
          data_categories_affected: string[] | null
          discovered_at: string
          discovered_by: string | null
          discovery_method: string | null
          estimated_records_affected: number | null
          external_report_url: string | null
          id: string
          incident_report_url: string | null
          metadata: Json | null
          notification_method: string | null
          preventive_measures: string[] | null
          priority: number | null
          privacy_commissioner_notified: boolean | null
          privacy_commissioner_notified_at: string | null
          remediated_at: string | null
          response_status: string
          root_cause: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          actions_taken?: string[] | null
          assigned_to?: string | null
          breach_type: string
          contained_at?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          customers_affected?: number | null
          customers_notified?: boolean | null
          customers_notified_at?: string | null
          data_categories_affected?: string[] | null
          discovered_at: string
          discovered_by?: string | null
          discovery_method?: string | null
          estimated_records_affected?: number | null
          external_report_url?: string | null
          id?: string
          incident_report_url?: string | null
          metadata?: Json | null
          notification_method?: string | null
          preventive_measures?: string[] | null
          priority?: number | null
          privacy_commissioner_notified?: boolean | null
          privacy_commissioner_notified_at?: string | null
          remediated_at?: string | null
          response_status?: string
          root_cause?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          actions_taken?: string[] | null
          assigned_to?: string | null
          breach_type?: string
          contained_at?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          customers_affected?: number | null
          customers_notified?: boolean | null
          customers_notified_at?: string | null
          data_categories_affected?: string[] | null
          discovered_at?: string
          discovered_by?: string | null
          discovery_method?: string | null
          estimated_records_affected?: number | null
          external_report_url?: string | null
          id?: string
          incident_report_url?: string | null
          metadata?: Json | null
          notification_method?: string | null
          preventive_measures?: string[] | null
          priority?: number | null
          privacy_commissioner_notified?: boolean | null
          privacy_commissioner_notified_at?: string | null
          remediated_at?: string | null
          response_status?: string
          root_cause?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_breach_log_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_breach_log_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_breach_log_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "data_breach_log_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_breach_log_discovered_by_fkey"
            columns: ["discovered_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_breach_log_discovered_by_fkey"
            columns: ["discovered_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_breach_log_discovered_by_fkey"
            columns: ["discovered_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "data_breach_log_discovered_by_fkey"
            columns: ["discovered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sharing_consent_log: {
        Row: {
          consent_granted: boolean
          consent_granted_at: string | null
          consent_withdrawn_at: string | null
          created_at: string | null
          customer_id: string
          data_types_shared: string[]
          disclosure_text: string | null
          id: string
          ip_address: unknown
          purpose: string
          quote_id: string | null
          session_id: string | null
          shared_with_id: string | null
          shared_with_name: string | null
          shared_with_type: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          consent_granted?: boolean
          consent_granted_at?: string | null
          consent_withdrawn_at?: string | null
          created_at?: string | null
          customer_id: string
          data_types_shared: string[]
          disclosure_text?: string | null
          id?: string
          ip_address?: unknown
          purpose: string
          quote_id?: string | null
          session_id?: string | null
          shared_with_id?: string | null
          shared_with_name?: string | null
          shared_with_type: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_granted?: boolean
          consent_granted_at?: string | null
          consent_withdrawn_at?: string | null
          created_at?: string | null
          customer_id?: string
          data_types_shared?: string[]
          disclosure_text?: string | null
          id?: string
          ip_address?: unknown
          purpose?: string
          quote_id?: string | null
          session_id?: string | null
          shared_with_id?: string | null
          shared_with_name?: string | null
          shared_with_type?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sharing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sharing_consent_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          advice_only: boolean | null
          base_price: number
          bay_booking_id: string | null
          created_at: string | null
          customer_id: string | null
          diagnosis_summary: string | null
          duration_minutes: number | null
          ended_at: string | null
          escalated: boolean | null
          escalated_at: string | null
          escalated_by_mechanic_id: string | null
          escalated_to_workshop_id: string | null
          escalation_notes: string | null
          escalation_status: string | null
          extension_minutes: number | null
          id: string
          issue_description: string | null
          mechanic_id: string | null
          photos: Json | null
          quote_id: string | null
          quote_sent: boolean | null
          recommended_services: string[] | null
          scheduled_at: string | null
          service_type: string | null
          session_duration_type: string | null
          session_type: string
          started_at: string | null
          status: string | null
          time_cap_seconds: number | null
          time_extended: boolean | null
          total_price: number
          updated_at: string | null
          upgrade_price: number | null
          urgency: string | null
          vehicle_id: string | null
          vehicle_info: Json | null
          workshop_id: string | null
        }
        Insert: {
          advice_only?: boolean | null
          base_price: number
          bay_booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          diagnosis_summary?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_by_mechanic_id?: string | null
          escalated_to_workshop_id?: string | null
          escalation_notes?: string | null
          escalation_status?: string | null
          extension_minutes?: number | null
          id?: string
          issue_description?: string | null
          mechanic_id?: string | null
          photos?: Json | null
          quote_id?: string | null
          quote_sent?: boolean | null
          recommended_services?: string[] | null
          scheduled_at?: string | null
          service_type?: string | null
          session_duration_type?: string | null
          session_type: string
          started_at?: string | null
          status?: string | null
          time_cap_seconds?: number | null
          time_extended?: boolean | null
          total_price: number
          updated_at?: string | null
          upgrade_price?: number | null
          urgency?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
          workshop_id?: string | null
        }
        Update: {
          advice_only?: boolean | null
          base_price?: number
          bay_booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          diagnosis_summary?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_by_mechanic_id?: string | null
          escalated_to_workshop_id?: string | null
          escalation_notes?: string | null
          escalation_status?: string | null
          extension_minutes?: number | null
          id?: string
          issue_description?: string | null
          mechanic_id?: string | null
          photos?: Json | null
          quote_id?: string | null
          quote_sent?: boolean | null
          recommended_services?: string[] | null
          scheduled_at?: string | null
          service_type?: string | null
          session_duration_type?: string | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          time_cap_seconds?: number | null
          time_extended?: boolean | null
          total_price?: number
          updated_at?: string | null
          upgrade_price?: number | null
          urgency?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_sessions_bay_booking_id_fkey"
            columns: ["bay_booking_id"]
            isOneToOne: false
            referencedRelation: "bay_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_by_mechanic_id_fkey"
            columns: ["escalated_by_mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_escalated_to_workshop_id_fkey"
            columns: ["escalated_to_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "diagnostic_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          from_email: string | null
          html_body: string
          id: string
          last_error: string | null
          max_attempts: number | null
          priority: number | null
          resend_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          text_body: string | null
          to_email: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          from_email?: string | null
          html_body: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          priority?: number | null
          resend_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          text_body?: string | null
          to_email: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          from_email?: string | null
          html_body?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          priority?: number | null
          resend_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          text_body?: string | null
          to_email?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_for_roles: string[] | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean
          metadata: Json | null
          rollout_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_for_roles?: string[] | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_for_roles?: string[] | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fee_change_log: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          entity_id: string | null
          entity_type: string
          field_name: string
          id: string
          metadata: Json | null
          new_value: number | null
          old_value: number | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          entity_id?: string | null
          entity_type: string
          field_name: string
          id?: string
          metadata?: Json | null
          new_value?: number | null
          old_value?: number | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          entity_id?: string | null
          entity_type?: string
          field_name?: string
          id?: string
          metadata?: Json | null
          new_value?: number | null
          old_value?: number | null
        }
        Relationships: []
      }
      homepage_config: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          section_key: string
          section_name: string
          section_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          section_key: string
          section_name: string
          section_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          section_key?: string
          section_name?: string
          section_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "homepage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "homepage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "homepage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      in_person_visits: {
        Row: {
          arrived_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_coordinates: unknown
          customer_id: string | null
          customer_location: string | null
          diagnostic_session_id: string | null
          id: string
          inspection_notes: string | null
          mechanic_id: string | null
          photos: Json | null
          quote_id: string | null
          quote_sent: boolean | null
          scheduled_at: string
          status: string | null
          trip_fee: number | null
          updated_at: string | null
          visit_type: string
          workshop_id: string | null
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_coordinates?: unknown
          customer_id?: string | null
          customer_location?: string | null
          diagnostic_session_id?: string | null
          id?: string
          inspection_notes?: string | null
          mechanic_id?: string | null
          photos?: Json | null
          quote_id?: string | null
          quote_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          trip_fee?: number | null
          updated_at?: string | null
          visit_type: string
          workshop_id?: string | null
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_coordinates?: unknown
          customer_id?: string | null
          customer_location?: string | null
          diagnostic_session_id?: string | null
          id?: string
          inspection_notes?: string | null
          mechanic_id?: string | null
          photos?: Json | null
          quote_id?: string | null
          quote_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          trip_fee?: number | null
          updated_at?: string | null
          visit_type?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_person_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "in_person_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "in_person_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "in_person_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_person_visits_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_person_visits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "in_person_visits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      insurance_verification_log: {
        Row: {
          agreement_id: string | null
          certificate_url: string | null
          coverage_amount: number | null
          created_at: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          ip_address: unknown
          organization_id: string
          policy_number: string | null
          provider: string | null
          rejection_reason: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verification_status: string | null
          verification_type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agreement_id?: string | null
          certificate_url?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          ip_address?: unknown
          organization_id: string
          policy_number?: string | null
          provider?: string | null
          rejection_reason?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verification_type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agreement_id?: string | null
          certificate_url?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string
          policy_number?: string | null
          provider?: string | null
          rejection_reason?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verification_type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_verification_log_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_verification_log_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_verification_log_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_deletions: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deleted_email: string | null
          id: string
          intake_id: string
          payload: Json | null
          reason: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_email?: string | null
          id?: string
          intake_id: string
          payload?: Json | null
          reason?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_email?: string | null
          id?: string
          intake_id?: string
          payload?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_intake_deletions_intake_id"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_intake_deletions_intake_id"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["intake_id"]
          },
        ]
      }
      intakes: {
        Row: {
          city: string | null
          concern: string | null
          created_at: string
          customer_name: string | null
          email: string | null
          files: Json
          id: string
          make: string | null
          model: string | null
          name: string | null
          odometer: string | null
          phone: string | null
          plan: string
          plate: string | null
          status: string | null
          urgent: boolean | null
          vehicle_id: string | null
          vin: string | null
          year: string | null
        }
        Insert: {
          city?: string | null
          concern?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string | null
          files?: Json
          id?: string
          make?: string | null
          model?: string | null
          name?: string | null
          odometer?: string | null
          phone?: string | null
          plan: string
          plate?: string | null
          status?: string | null
          urgent?: boolean | null
          vehicle_id?: string | null
          vin?: string | null
          year?: string | null
        }
        Update: {
          city?: string | null
          concern?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string | null
          files?: Json
          id?: string
          make?: string | null
          model?: string | null
          name?: string | null
          odometer?: string | null
          phone?: string | null
          plan?: string
          plate?: string | null
          status?: string | null
          urgent?: boolean | null
          vehicle_id?: string | null
          vin?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "intakes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "intakes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_compliance_audit_log: {
        Row: {
          automated: boolean | null
          compliance_status: string | null
          compliance_type: string
          created_at: string | null
          entity_id: string
          entity_type: string
          event_description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          automated?: boolean | null
          compliance_status?: string | null
          compliance_type: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          event_description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          automated?: boolean | null
          compliance_status?: string | null
          compliance_type?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          event_description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_compliance_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "legal_compliance_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "legal_compliance_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "legal_compliance_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      livekit_rooms: {
        Row: {
          created_at: string
          id: string
          identity: string
          last_refreshed_at: string | null
          role: string
          room_name: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity: string
          last_refreshed_at?: string | null
          role: string
          room_name: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity?: string
          last_refreshed_at?: string | null
          role?: string
          room_name?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livekit_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      major_cities: {
        Row: {
          city_name: string
          country_code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          state_province: string | null
          timezone: string | null
        }
        Insert: {
          city_name: string
          country_code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state_province?: string | null
          timezone?: string | null
        }
        Update: {
          city_name?: string
          country_code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state_province?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      marketing_consent_log: {
        Row: {
          consent_language: string | null
          consent_text: string | null
          consent_type: string
          created_at: string | null
          customer_id: string
          evidence_url: string | null
          id: string
          ip_address: unknown
          method: string | null
          opt_in: boolean
          opt_in_date: string | null
          opt_out_date: string | null
          user_agent: string | null
        }
        Insert: {
          consent_language?: string | null
          consent_text?: string | null
          consent_type: string
          created_at?: string | null
          customer_id: string
          evidence_url?: string | null
          id?: string
          ip_address: unknown
          method?: string | null
          opt_in: boolean
          opt_in_date?: string | null
          opt_out_date?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_language?: string | null
          consent_text?: string | null
          consent_type?: string
          created_at?: string | null
          customer_id?: string
          evidence_url?: string | null
          id?: string
          ip_address?: unknown
          method?: string | null
          opt_in?: boolean
          opt_in_date?: string | null
          opt_out_date?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          mechanic_id: string
          metadata: Json | null
          notes: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          mechanic_id: string
          metadata?: Json | null
          notes?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          mechanic_id?: string
          metadata?: Json | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_admin_actions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          mechanic_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          mechanic_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          mechanic_id?: string
          start_time?: string
        }
        Relationships: []
      }
      mechanic_clients: {
        Row: {
          created_at: string | null
          customer_id: string
          first_service_date: string | null
          id: string
          is_favorite: boolean | null
          is_repeat_customer: boolean | null
          last_contact_date: string | null
          last_service_date: string | null
          mechanic_id: string
          mechanic_notes: string | null
          next_service_due: string | null
          physical_repairs_count: number | null
          service_history: string[] | null
          tags: string[] | null
          total_services: number | null
          total_spent: number | null
          updated_at: string | null
          vehicle_info: Json | null
          virtual_sessions_count: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          first_service_date?: string | null
          id?: string
          is_favorite?: boolean | null
          is_repeat_customer?: boolean | null
          last_contact_date?: string | null
          last_service_date?: string | null
          mechanic_id: string
          mechanic_notes?: string | null
          next_service_due?: string | null
          physical_repairs_count?: number | null
          service_history?: string[] | null
          tags?: string[] | null
          total_services?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vehicle_info?: Json | null
          virtual_sessions_count?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          first_service_date?: string | null
          id?: string
          is_favorite?: boolean | null
          is_repeat_customer?: boolean | null
          last_contact_date?: string | null
          last_service_date?: string | null
          mechanic_id?: string
          mechanic_notes?: string | null
          next_service_due?: string | null
          physical_repairs_count?: number | null
          service_history?: string[] | null
          tags?: string[] | null
          total_services?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vehicle_info?: Json | null
          virtual_sessions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_clients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_clients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_clients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_clients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_clients_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          mechanic_id: string
          metadata: Json | null
          storage_path: string
          storage_url: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          mechanic_id: string
          metadata?: Json | null
          storage_path: string
          storage_url?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          mechanic_id?: string
          metadata?: Json | null
          storage_path?: string
          storage_url?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_documents_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_earnings: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          gross_amount_cents: number
          id: string
          is_workshop_mechanic: boolean | null
          mechanic_id: string
          mechanic_net_cents: number
          payment_intent_id: string | null
          payout_date: string | null
          payout_error: string | null
          payout_id: string | null
          payout_status: string | null
          platform_fee_cents: number | null
          session_id: string | null
          updated_at: string | null
          workshop_earning_id: string | null
          workshop_fee_cents: number | null
          workshop_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          gross_amount_cents: number
          id?: string
          is_workshop_mechanic?: boolean | null
          mechanic_id: string
          mechanic_net_cents: number
          payment_intent_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee_cents?: number | null
          session_id?: string | null
          updated_at?: string | null
          workshop_earning_id?: string | null
          workshop_fee_cents?: number | null
          workshop_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          gross_amount_cents?: number
          id?: string
          is_workshop_mechanic?: boolean | null
          mechanic_id?: string
          mechanic_net_cents?: number
          payment_intent_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee_cents?: number | null
          session_id?: string | null
          updated_at?: string | null
          workshop_earning_id?: string | null
          workshop_fee_cents?: number | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_earning_id_fkey"
            columns: ["workshop_earning_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      mechanic_earnings_breakdown: {
        Row: {
          average_session_value: number | null
          bay_rental_fees_paid: number | null
          created_at: string | null
          gross_earnings: number | null
          id: string
          mechanic_id: string
          membership_fees_paid: number | null
          net_earnings: number | null
          period_end: string
          period_start: string
          period_type: string
          physical_repairs_count: number | null
          physical_repairs_gross: number | null
          physical_repairs_net: number | null
          physical_repairs_workshop_share: number | null
          platform_fees_paid: number | null
          sessions_per_day: number | null
          total_deductions: number | null
          updated_at: string | null
          virtual_chat_earnings: number | null
          virtual_chat_sessions: number | null
          virtual_total_earnings: number | null
          virtual_video_earnings: number | null
          virtual_video_sessions: number | null
        }
        Insert: {
          average_session_value?: number | null
          bay_rental_fees_paid?: number | null
          created_at?: string | null
          gross_earnings?: number | null
          id?: string
          mechanic_id: string
          membership_fees_paid?: number | null
          net_earnings?: number | null
          period_end: string
          period_start: string
          period_type: string
          physical_repairs_count?: number | null
          physical_repairs_gross?: number | null
          physical_repairs_net?: number | null
          physical_repairs_workshop_share?: number | null
          platform_fees_paid?: number | null
          sessions_per_day?: number | null
          total_deductions?: number | null
          updated_at?: string | null
          virtual_chat_earnings?: number | null
          virtual_chat_sessions?: number | null
          virtual_total_earnings?: number | null
          virtual_video_earnings?: number | null
          virtual_video_sessions?: number | null
        }
        Update: {
          average_session_value?: number | null
          bay_rental_fees_paid?: number | null
          created_at?: string | null
          gross_earnings?: number | null
          id?: string
          mechanic_id?: string
          membership_fees_paid?: number | null
          net_earnings?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          physical_repairs_count?: number | null
          physical_repairs_gross?: number | null
          physical_repairs_net?: number | null
          physical_repairs_workshop_share?: number | null
          platform_fees_paid?: number | null
          sessions_per_day?: number | null
          total_deductions?: number | null
          updated_at?: string | null
          virtual_chat_earnings?: number | null
          virtual_chat_sessions?: number | null
          virtual_total_earnings?: number | null
          virtual_video_earnings?: number | null
          virtual_video_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_earnings_breakdown_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_escalation_stats: {
        Row: {
          average_customer_satisfaction: number | null
          average_workshop_rating: number | null
          escalations_accepted: number | null
          escalations_converted: number | null
          escalations_quoted: number | null
          last_escalation_at: string | null
          mechanic_id: string
          total_escalations: number | null
          total_referral_fees_earned: number | null
          total_referral_fees_pending: number | null
          updated_at: string | null
        }
        Insert: {
          average_customer_satisfaction?: number | null
          average_workshop_rating?: number | null
          escalations_accepted?: number | null
          escalations_converted?: number | null
          escalations_quoted?: number | null
          last_escalation_at?: string | null
          mechanic_id: string
          total_escalations?: number | null
          total_referral_fees_earned?: number | null
          total_referral_fees_pending?: number | null
          updated_at?: string | null
        }
        Update: {
          average_customer_satisfaction?: number | null
          average_workshop_rating?: number | null
          escalations_accepted?: number | null
          escalations_converted?: number | null
          escalations_quoted?: number | null
          last_escalation_at?: string | null
          mechanic_id?: string
          total_escalations?: number | null
          total_referral_fees_earned?: number | null
          total_referral_fees_pending?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_escalation_stats_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_fee_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          custom_referral_fee_percent: number
          effective_date: string
          expiry_date: string | null
          id: string
          is_active: boolean
          mechanic_id: string
          override_reason: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_referral_fee_percent: number
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          mechanic_id: string
          override_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_referral_fee_percent?: number
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          mechanic_id?: string
          override_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_fee_overrides_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_profile_requirements: {
        Row: {
          created_at: string | null
          field_category: string
          field_name: string
          id: string
          required_for_general: boolean | null
          required_for_specialist: boolean | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          field_category: string
          field_name: string
          id?: string
          required_for_general?: boolean | null
          required_for_specialist?: boolean | null
          weight: number
        }
        Update: {
          created_at?: string | null
          field_category?: string
          field_name?: string
          id?: string
          required_for_general?: boolean | null
          required_for_specialist?: boolean | null
          weight?: number
        }
        Relationships: []
      }
      mechanic_profiles: {
        Row: {
          bio: string | null
          certifications: string | null
          created_at: string | null
          license_no: string | null
          rating: number | null
          user_id: string
          verification_status: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          certifications?: string | null
          created_at?: string | null
          license_no?: string | null
          rating?: number | null
          user_id: string
          verification_status?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          certifications?: string | null
          created_at?: string | null
          license_no?: string | null
          rating?: number | null
          user_id?: string
          verification_status?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_recommendations: {
        Row: {
          availability_match: boolean | null
          avg_rating: number | null
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          location_proximity: boolean | null
          mechanic_id: string
          metadata: Json | null
          past_sessions_count: number | null
          reasons: string[] | null
          score: number
          specialty_match: boolean | null
          updated_at: string
        }
        Insert: {
          availability_match?: boolean | null
          avg_rating?: number | null
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          location_proximity?: boolean | null
          mechanic_id: string
          metadata?: Json | null
          past_sessions_count?: number | null
          reasons?: string[] | null
          score: number
          specialty_match?: boolean | null
          updated_at?: string
        }
        Update: {
          availability_match?: boolean | null
          avg_rating?: number | null
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          location_proximity?: boolean | null
          mechanic_id?: string
          metadata?: Json | null
          past_sessions_count?: number | null
          reasons?: string[] | null
          score?: number
          specialty_match?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_recommendations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_referral_earnings: {
        Row: {
          bid_amount: number
          bid_id: string
          commission_amount: number
          created_at: string
          customer_id: string
          diagnostic_session_id: string | null
          earned_at: string
          id: string
          mechanic_id: string
          metadata: Json | null
          paid_at: string | null
          payout_id: string | null
          referral_rate: number
          rfq_id: string
          status: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          bid_amount: number
          bid_id: string
          commission_amount: number
          created_at?: string
          customer_id: string
          diagnostic_session_id?: string | null
          earned_at?: string
          id?: string
          mechanic_id: string
          metadata?: Json | null
          paid_at?: string | null
          payout_id?: string | null
          referral_rate?: number
          rfq_id: string
          status?: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          bid_amount?: number
          bid_id?: string
          commission_amount?: number
          created_at?: string
          customer_id?: string
          diagnostic_session_id?: string | null
          earned_at?: string
          id?: string
          mechanic_id?: string
          metadata?: Json | null
          paid_at?: string | null
          payout_id?: string | null
          referral_rate?: number
          rfq_id?: string
          status?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_referral_earnings_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "workshop_rfq_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "workshop_rfq_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_referral_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      mechanic_sessions_archive: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          mechanic_id: string | null
          token: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id: string
          mechanic_id?: string | null
          token?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mechanic_id?: string | null
          token?: string | null
        }
        Relationships: []
      }
      mechanic_shift_logs: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          created_at: string | null
          full_sessions_taken: number | null
          id: string
          location: string | null
          mechanic_id: string
          micro_minutes_used: number | null
          micro_sessions_taken: number | null
          notes: string | null
          shift_duration_minutes: number | null
          updated_at: string | null
          workshop_id: string | null
        }
        Insert: {
          clock_in_at: string
          clock_out_at?: string | null
          created_at?: string | null
          full_sessions_taken?: number | null
          id?: string
          location?: string | null
          mechanic_id: string
          micro_minutes_used?: number | null
          micro_sessions_taken?: number | null
          notes?: string | null
          shift_duration_minutes?: number | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string | null
          full_sessions_taken?: number | null
          id?: string
          location?: string | null
          mechanic_id?: string
          micro_minutes_used?: number | null
          micro_sessions_taken?: number | null
          notes?: string | null
          shift_duration_minutes?: number | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanic_shift_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      mechanic_time_off: {
        Row: {
          created_at: string
          end_date: string
          id: string
          mechanic_id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          mechanic_id: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          mechanic_id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_time_off_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_type_change_log: {
        Row: {
          change_reason: string | null
          change_source: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          mechanic_id: string
          new_account_type: string | null
          new_workshop_id: string | null
          old_account_type: string | null
          old_workshop_id: string | null
        }
        Insert: {
          change_reason?: string | null
          change_source?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          mechanic_id: string
          new_account_type?: string | null
          new_workshop_id?: string | null
          old_account_type?: string | null
          old_workshop_id?: string | null
        }
        Update: {
          change_reason?: string | null
          change_source?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          mechanic_id?: string
          new_account_type?: string | null
          new_workshop_id?: string | null
          old_account_type?: string | null
          old_workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_type_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_type_change_log_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          about_me: string | null
          accepts_physical_bookings: boolean | null
          account_status: string | null
          account_type: string | null
          annual_revenue_estimate: number | null
          application_draft: Json | null
          application_status: string | null
          application_submitted_at: string | null
          approval_notes: string | null
          approved_at: string | null
          auto_approved: boolean | null
          background_check_status: string | null
          ban_reason: string | null
          banking_info_completed: boolean | null
          brand_specializations: string[] | null
          business_license_document: string | null
          business_license_number: string | null
          business_number: string | null
          can_accept_sessions: boolean | null
          can_perform_physical_work: boolean | null
          can_refuse_work: boolean | null
          certification_authority: string | null
          certification_documents: string[] | null
          certification_expiry_date: string | null
          certification_number: string | null
          certification_region: string | null
          certification_type: string | null
          city: string | null
          completed_sessions: number | null
          country: string | null
          crc_date: string | null
          crc_document: string | null
          created_at: string
          criminal_record_check: boolean | null
          current_step: number | null
          currently_on_shift: boolean | null
          daily_micro_minutes_cap: number | null
          daily_micro_minutes_used: number | null
          date_of_birth: string | null
          email: string | null
          employment_end_date: string | null
          employment_start_date: string | null
          employment_type: string | null
          full_address: string | null
          gst_hst_registered: boolean | null
          gst_hst_registration_date: string | null
          has_liability_insurance: boolean | null
          hourly_rate: number | null
          id: string
          insurance_certificate_url: string | null
          insurance_coverage_amount: number | null
          insurance_document: string | null
          insurance_expiry: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          invite_accepted_at: string | null
          invited_by: string | null
          is_available: boolean | null
          is_brand_specialist: boolean | null
          is_workshop: boolean | null
          last_clock_in: string | null
          last_clock_out: string | null
          last_micro_reset_date: string | null
          last_seen_at: string | null
          last_t4a_amount: number | null
          last_updated: string | null
          liability_insurance: boolean | null
          mobile_license_expiry: string | null
          mobile_license_number: string | null
          mobile_license_province: string | null
          name: string | null
          other_certifications: Json | null
          owns_customer_relationships: boolean | null
          participation_mode: string | null
          partnership_terms: Json | null
          partnership_type: string | null
          payroll_id: string | null
          phone: string | null
          postal_code: string | null
          prefers_physical: boolean | null
          prefers_virtual: boolean | null
          profile_completion_score: number | null
          provides_own_tools: boolean | null
          province: string | null
          rating: number | null
          red_seal_certified: boolean | null
          red_seal_expiry_date: string | null
          red_seal_number: string | null
          red_seal_province: string | null
          requires_sin_collection: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_keywords: string[] | null
          service_tier: string | null
          sets_own_schedule: boolean | null
          shop_address: string | null
          shop_affiliation: string | null
          shop_hours: Json | null
          shop_name: string | null
          sin_collection_completed_at: string | null
          sin_encrypted: string | null
          sin_or_business_number: string | null
          source: string | null
          specialist_tier: string | null
          specializations: string[] | null
          state_province: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_details_submitted: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          suspended_until: string | null
          t4a_issued_years: number[] | null
          tax_id_verified: boolean | null
          timezone: string | null
          user_id: string | null
          works_for_multiple_clients: boolean | null
          workshop_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          about_me?: string | null
          accepts_physical_bookings?: boolean | null
          account_status?: string | null
          account_type?: string | null
          annual_revenue_estimate?: number | null
          application_draft?: Json | null
          application_status?: string | null
          application_submitted_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          background_check_status?: string | null
          ban_reason?: string | null
          banking_info_completed?: boolean | null
          brand_specializations?: string[] | null
          business_license_document?: string | null
          business_license_number?: string | null
          business_number?: string | null
          can_accept_sessions?: boolean | null
          can_perform_physical_work?: boolean | null
          can_refuse_work?: boolean | null
          certification_authority?: string | null
          certification_documents?: string[] | null
          certification_expiry_date?: string | null
          certification_number?: string | null
          certification_region?: string | null
          certification_type?: string | null
          city?: string | null
          completed_sessions?: number | null
          country?: string | null
          crc_date?: string | null
          crc_document?: string | null
          created_at?: string
          criminal_record_check?: boolean | null
          current_step?: number | null
          currently_on_shift?: boolean | null
          daily_micro_minutes_cap?: number | null
          daily_micro_minutes_used?: number | null
          date_of_birth?: string | null
          email?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          employment_type?: string | null
          full_address?: string | null
          gst_hst_registered?: boolean | null
          gst_hst_registration_date?: string | null
          has_liability_insurance?: boolean | null
          hourly_rate?: number | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_document?: string | null
          insurance_expiry?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          invite_accepted_at?: string | null
          invited_by?: string | null
          is_available?: boolean | null
          is_brand_specialist?: boolean | null
          is_workshop?: boolean | null
          last_clock_in?: string | null
          last_clock_out?: string | null
          last_micro_reset_date?: string | null
          last_seen_at?: string | null
          last_t4a_amount?: number | null
          last_updated?: string | null
          liability_insurance?: boolean | null
          mobile_license_expiry?: string | null
          mobile_license_number?: string | null
          mobile_license_province?: string | null
          name?: string | null
          other_certifications?: Json | null
          owns_customer_relationships?: boolean | null
          participation_mode?: string | null
          partnership_terms?: Json | null
          partnership_type?: string | null
          payroll_id?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_physical?: boolean | null
          prefers_virtual?: boolean | null
          profile_completion_score?: number | null
          provides_own_tools?: boolean | null
          province?: string | null
          rating?: number | null
          red_seal_certified?: boolean | null
          red_seal_expiry_date?: string | null
          red_seal_number?: string | null
          red_seal_province?: string | null
          requires_sin_collection?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_keywords?: string[] | null
          service_tier?: string | null
          sets_own_schedule?: boolean | null
          shop_address?: string | null
          shop_affiliation?: string | null
          shop_hours?: Json | null
          shop_name?: string | null
          sin_collection_completed_at?: string | null
          sin_encrypted?: string | null
          sin_or_business_number?: string | null
          source?: string | null
          specialist_tier?: string | null
          specializations?: string[] | null
          state_province?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          suspended_until?: string | null
          t4a_issued_years?: number[] | null
          tax_id_verified?: boolean | null
          timezone?: string | null
          user_id?: string | null
          works_for_multiple_clients?: boolean | null
          workshop_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          about_me?: string | null
          accepts_physical_bookings?: boolean | null
          account_status?: string | null
          account_type?: string | null
          annual_revenue_estimate?: number | null
          application_draft?: Json | null
          application_status?: string | null
          application_submitted_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          background_check_status?: string | null
          ban_reason?: string | null
          banking_info_completed?: boolean | null
          brand_specializations?: string[] | null
          business_license_document?: string | null
          business_license_number?: string | null
          business_number?: string | null
          can_accept_sessions?: boolean | null
          can_perform_physical_work?: boolean | null
          can_refuse_work?: boolean | null
          certification_authority?: string | null
          certification_documents?: string[] | null
          certification_expiry_date?: string | null
          certification_number?: string | null
          certification_region?: string | null
          certification_type?: string | null
          city?: string | null
          completed_sessions?: number | null
          country?: string | null
          crc_date?: string | null
          crc_document?: string | null
          created_at?: string
          criminal_record_check?: boolean | null
          current_step?: number | null
          currently_on_shift?: boolean | null
          daily_micro_minutes_cap?: number | null
          daily_micro_minutes_used?: number | null
          date_of_birth?: string | null
          email?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          employment_type?: string | null
          full_address?: string | null
          gst_hst_registered?: boolean | null
          gst_hst_registration_date?: string | null
          has_liability_insurance?: boolean | null
          hourly_rate?: number | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_document?: string | null
          insurance_expiry?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          invite_accepted_at?: string | null
          invited_by?: string | null
          is_available?: boolean | null
          is_brand_specialist?: boolean | null
          is_workshop?: boolean | null
          last_clock_in?: string | null
          last_clock_out?: string | null
          last_micro_reset_date?: string | null
          last_seen_at?: string | null
          last_t4a_amount?: number | null
          last_updated?: string | null
          liability_insurance?: boolean | null
          mobile_license_expiry?: string | null
          mobile_license_number?: string | null
          mobile_license_province?: string | null
          name?: string | null
          other_certifications?: Json | null
          owns_customer_relationships?: boolean | null
          participation_mode?: string | null
          partnership_terms?: Json | null
          partnership_type?: string | null
          payroll_id?: string | null
          phone?: string | null
          postal_code?: string | null
          prefers_physical?: boolean | null
          prefers_virtual?: boolean | null
          profile_completion_score?: number | null
          provides_own_tools?: boolean | null
          province?: string | null
          rating?: number | null
          red_seal_certified?: boolean | null
          red_seal_expiry_date?: string | null
          red_seal_number?: string | null
          red_seal_province?: string | null
          requires_sin_collection?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_keywords?: string[] | null
          service_tier?: string | null
          sets_own_schedule?: boolean | null
          shop_address?: string | null
          shop_affiliation?: string | null
          shop_hours?: Json | null
          shop_name?: string | null
          sin_collection_completed_at?: string | null
          sin_encrypted?: string | null
          sin_or_business_number?: string | null
          source?: string | null
          specialist_tier?: string | null
          specializations?: string[] | null
          state_province?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          suspended_until?: string | null
          t4a_issued_years?: number[] | null
          tax_id_verified?: boolean | null
          timezone?: string | null
          user_id?: string | null
          works_for_multiple_clients?: boolean | null
          workshop_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      mechanics_password_hash_archive: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          email: string | null
          mechanic_id: string
          name: string | null
          password_hash: string | null
          user_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          email?: string | null
          mechanic_id: string
          name?: string | null
          password_hash?: string | null
          user_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          email?: string | null
          mechanic_id?: string
          name?: string | null
          password_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ocpa_compliance_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          created_at: string | null
          id: string
          quote_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          workshop_id: string | null
        }
        Insert: {
          alert_message: string
          alert_type: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          workshop_id?: string | null
        }
        Update: {
          alert_message?: string
          alert_type?: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocpa_compliance_alerts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string | null
          invite_email: string | null
          invite_expires_at: string | null
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string
          permissions: Json | null
          role: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code?: string | null
          invite_email?: string | null
          invite_expires_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          permissions?: Json | null
          role: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string | null
          invite_email?: string | null
          invite_expires_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_number: string | null
          business_registration_date: string | null
          business_registration_number: string | null
          city: string | null
          corporate_registry_number: string | null
          country: string | null
          coverage_postal_codes: string[] | null
          created_at: string | null
          created_by: string | null
          custom_fee_agreement: boolean | null
          description: string | null
          email: string
          employee_count: string | null
          fleet_size: string | null
          id: string
          industry: string | null
          insurance_certificate_url: string | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          logo_url: string | null
          mechanic_capacity: number | null
          metadata: Json | null
          name: string
          ontario_business_number: string | null
          organization_type: string
          phone: string | null
          platform_fee_percentage: number | null
          postal_code: string | null
          province: string | null
          service_radius_km: number | null
          settings: Json | null
          slug: string
          status: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_charges_enabled: boolean | null
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          stripe_details_submitted: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tax_id: string | null
          updated_at: string | null
          verification_notes: string | null
          verification_status: string | null
          website: string | null
          wsib_account_number: string | null
          wsib_clearance_certificate_url: string | null
          wsib_clearance_expiry: string | null
          wsib_industry_class: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_number?: string | null
          business_registration_date?: string | null
          business_registration_number?: string | null
          city?: string | null
          corporate_registry_number?: string | null
          country?: string | null
          coverage_postal_codes?: string[] | null
          created_at?: string | null
          created_by?: string | null
          custom_fee_agreement?: boolean | null
          description?: string | null
          email: string
          employee_count?: string | null
          fleet_size?: string | null
          id?: string
          industry?: string | null
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          logo_url?: string | null
          mechanic_capacity?: number | null
          metadata?: Json | null
          name: string
          ontario_business_number?: string | null
          organization_type: string
          phone?: string | null
          platform_fee_percentage?: number | null
          postal_code?: string | null
          province?: string | null
          service_radius_km?: number | null
          settings?: Json | null
          slug: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          website?: string | null
          wsib_account_number?: string | null
          wsib_clearance_certificate_url?: string | null
          wsib_clearance_expiry?: string | null
          wsib_industry_class?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_number?: string | null
          business_registration_date?: string | null
          business_registration_number?: string | null
          city?: string | null
          corporate_registry_number?: string | null
          country?: string | null
          coverage_postal_codes?: string[] | null
          created_at?: string | null
          created_by?: string | null
          custom_fee_agreement?: boolean | null
          description?: string | null
          email?: string
          employee_count?: string | null
          fleet_size?: string | null
          id?: string
          industry?: string | null
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          logo_url?: string | null
          mechanic_capacity?: number | null
          metadata?: Json | null
          name?: string
          ontario_business_number?: string | null
          organization_type?: string
          phone?: string | null
          platform_fee_percentage?: number | null
          postal_code?: string | null
          province?: string | null
          service_radius_km?: number | null
          settings?: Json | null
          slug?: string
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          website?: string | null
          wsib_account_number?: string | null
          wsib_clearance_certificate_url?: string | null
          wsib_clearance_expiry?: string | null
          wsib_industry_class?: string | null
        }
        Relationships: []
      }
      partnership_revenue_splits: {
        Row: {
          agreement_id: string
          bay_booking_id: string | null
          bay_rental_fee: number | null
          created_at: string | null
          id: string
          mechanic_id: string
          mechanic_share_amount: number
          mechanic_share_percentage: number
          membership_fee_prorated: number | null
          paid_to_mechanic: boolean | null
          paid_to_mechanic_at: string | null
          paid_to_workshop: boolean | null
          paid_to_workshop_at: string | null
          payment_id: string | null
          platform_fee_amount: number
          platform_fee_percentage: number
          quote_id: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          session_id: string | null
          split_terms: Json | null
          split_type: string
          subtotal_after_platform_fee: number
          total_amount: number
          workshop_id: string
          workshop_share_amount: number
          workshop_share_percentage: number
        }
        Insert: {
          agreement_id: string
          bay_booking_id?: string | null
          bay_rental_fee?: number | null
          created_at?: string | null
          id?: string
          mechanic_id: string
          mechanic_share_amount: number
          mechanic_share_percentage: number
          membership_fee_prorated?: number | null
          paid_to_mechanic?: boolean | null
          paid_to_mechanic_at?: string | null
          paid_to_workshop?: boolean | null
          paid_to_workshop_at?: string | null
          payment_id?: string | null
          platform_fee_amount: number
          platform_fee_percentage: number
          quote_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          session_id?: string | null
          split_terms?: Json | null
          split_type: string
          subtotal_after_platform_fee: number
          total_amount: number
          workshop_id: string
          workshop_share_amount: number
          workshop_share_percentage: number
        }
        Update: {
          agreement_id?: string
          bay_booking_id?: string | null
          bay_rental_fee?: number | null
          created_at?: string | null
          id?: string
          mechanic_id?: string
          mechanic_share_amount?: number
          mechanic_share_percentage?: number
          membership_fee_prorated?: number | null
          paid_to_mechanic?: boolean | null
          paid_to_mechanic_at?: string | null
          paid_to_workshop?: boolean | null
          paid_to_workshop_at?: string | null
          payment_id?: string | null
          platform_fee_amount?: number
          platform_fee_percentage?: number
          quote_id?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          session_id?: string | null
          split_terms?: Json | null
          split_type?: string
          subtotal_after_platform_fee?: number
          total_amount?: number
          workshop_id?: string
          workshop_share_amount?: number
          workshop_share_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "partnership_revenue_splits_bay_booking_id_fkey"
            columns: ["bay_booking_id"]
            isOneToOne: false
            referencedRelation: "bay_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_revenue_splits_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      platform_chat_messages: {
        Row: {
          attachments: Json | null
          conversation_id: string
          conversation_type: string
          id: string
          is_system_message: boolean | null
          message: string
          read_at: string | null
          sender_id: string
          sender_type: string
          sent_at: string | null
        }
        Insert: {
          attachments?: Json | null
          conversation_id: string
          conversation_type: string
          id?: string
          is_system_message?: boolean | null
          message: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          sent_at?: string | null
        }
        Update: {
          attachments?: Json | null
          conversation_id?: string
          conversation_type?: string
          id?: string
          is_system_message?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      platform_fee_rules: {
        Row: {
          applies_to: string
          created_at: string | null
          created_by: string | null
          description: string | null
          fee_percentage: number | null
          flat_fee: number | null
          id: string
          is_active: boolean | null
          max_job_value: number | null
          min_job_value: number | null
          priority: number | null
          rule_name: string
          rule_type: string
          service_categories: string[] | null
          tiers: Json | null
          updated_at: string | null
        }
        Insert: {
          applies_to?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fee_percentage?: number | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean | null
          max_job_value?: number | null
          min_job_value?: number | null
          priority?: number | null
          rule_name: string
          rule_type: string
          service_categories?: string[] | null
          tiers?: Json | null
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fee_percentage?: number | null
          flat_fee?: number | null
          id?: string
          is_active?: boolean | null
          max_job_value?: number | null
          min_job_value?: number | null
          priority?: number | null
          rule_name?: string
          rule_type?: string
          service_categories?: string[] | null
          tiers?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_fee_settings: {
        Row: {
          created_at: string
          default_escrow_hold_days: number
          default_referral_fee_percent: number
          default_session_mechanic_percent: number
          default_session_platform_percent: number
          default_workshop_quote_platform_fee: number
          enable_auto_release: boolean
          high_value_escrow_hold_days: number
          high_value_threshold_cents: number
          id: string
          mechanic_referral_percent: number | null
          require_manual_approval_over_threshold: boolean
          updated_at: string
          updated_by: string | null
          workshop_escalation_referral_percent: number | null
        }
        Insert: {
          created_at?: string
          default_escrow_hold_days?: number
          default_referral_fee_percent?: number
          default_session_mechanic_percent?: number
          default_session_platform_percent?: number
          default_workshop_quote_platform_fee?: number
          enable_auto_release?: boolean
          high_value_escrow_hold_days?: number
          high_value_threshold_cents?: number
          id?: string
          mechanic_referral_percent?: number | null
          require_manual_approval_over_threshold?: boolean
          updated_at?: string
          updated_by?: string | null
          workshop_escalation_referral_percent?: number | null
        }
        Update: {
          created_at?: string
          default_escrow_hold_days?: number
          default_referral_fee_percent?: number
          default_session_mechanic_percent?: number
          default_session_platform_percent?: number
          default_workshop_quote_platform_fee?: number
          enable_auto_release?: boolean
          high_value_escrow_hold_days?: number
          high_value_threshold_cents?: number
          id?: string
          mechanic_referral_percent?: number | null
          require_manual_approval_over_threshold?: boolean
          updated_at?: string
          updated_by?: string | null
          workshop_escalation_referral_percent?: number | null
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          base_price_cents: number
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          mechanic_type: string
          tier_code: string
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          base_price_cents: number
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          mechanic_type: string
          tier_code: string
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          base_price_cents?: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          mechanic_type?: string
          tier_code?: string
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      privacy_audit_log: {
        Row: {
          created_at: string | null
          customer_id: string | null
          data_categories: string[] | null
          event_details: Json | null
          event_timestamp: string | null
          event_type: string
          id: string
          ip_address: unknown
          legal_basis: string | null
          location_country: string | null
          location_region: string | null
          organization_id: string | null
          performed_by: string | null
          performed_by_type: string
          retention_period_days: number | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          data_categories?: string[] | null
          event_details?: Json | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          legal_basis?: string | null
          location_country?: string | null
          location_region?: string | null
          organization_id?: string | null
          performed_by?: string | null
          performed_by_type: string
          retention_period_days?: number | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          data_categories?: string[] | null
          event_details?: Json | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          legal_basis?: string | null
          location_country?: string | null
          location_region?: string | null
          organization_id?: string | null
          performed_by?: string | null
          performed_by_type?: string
          retention_period_days?: number | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          account_type: string | null
          address_line1: string | null
          address_line2: string | null
          anonymized: boolean | null
          anonymized_at: string | null
          ban_reason: string | null
          city: string | null
          communication_preferences: Json | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deletion_request_id: string | null
          email: string | null
          email_verified: boolean | null
          free_session_override: boolean | null
          full_name: string | null
          id: string
          is_18_plus: boolean
          last_selected_slot: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          newsletter_subscribed: boolean | null
          onboarding_completed: boolean | null
          onboarding_dismissed: boolean | null
          onboarding_dismissed_at: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          postal_zip_code: string | null
          preferred_language: string | null
          preferred_plan: string | null
          profile_completed: boolean | null
          profile_completed_at: string | null
          province: string | null
          referral_source: string | null
          referred_by_workshop_id: string | null
          role: string | null
          source: string | null
          state_province: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_details_submitted: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          suspended_until: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          timezone: string | null
          updated_at: string | null
          vehicle_hint: string | null
          vehicle_info: Json | null
          waiver_accepted: boolean
          waiver_accepted_at: string | null
          waiver_ip_address: string | null
        }
        Insert: {
          account_status?: string | null
          account_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          anonymized?: boolean | null
          anonymized_at?: string | null
          ban_reason?: string | null
          city?: string | null
          communication_preferences?: Json | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deletion_request_id?: string | null
          email?: string | null
          email_verified?: boolean | null
          free_session_override?: boolean | null
          full_name?: string | null
          id: string
          is_18_plus?: boolean
          last_selected_slot?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          newsletter_subscribed?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_dismissed?: boolean | null
          onboarding_dismissed_at?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          postal_zip_code?: string | null
          preferred_language?: string | null
          preferred_plan?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          province?: string | null
          referral_source?: string | null
          referred_by_workshop_id?: string | null
          role?: string | null
          source?: string | null
          state_province?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          suspended_until?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          timezone?: string | null
          updated_at?: string | null
          vehicle_hint?: string | null
          vehicle_info?: Json | null
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
        }
        Update: {
          account_status?: string | null
          account_type?: string | null
          address_line1?: string | null
          address_line2?: string | null
          anonymized?: boolean | null
          anonymized_at?: string | null
          ban_reason?: string | null
          city?: string | null
          communication_preferences?: Json | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deletion_request_id?: string | null
          email?: string | null
          email_verified?: boolean | null
          free_session_override?: boolean | null
          full_name?: string | null
          id?: string
          is_18_plus?: boolean
          last_selected_slot?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          newsletter_subscribed?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_dismissed?: boolean | null
          onboarding_dismissed_at?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          postal_zip_code?: string | null
          preferred_language?: string | null
          preferred_plan?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          province?: string | null
          referral_source?: string | null
          referred_by_workshop_id?: string | null
          role?: string | null
          source?: string | null
          state_province?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          suspended_until?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          timezone?: string | null
          updated_at?: string | null
          vehicle_hint?: string | null
          vehicle_info?: Json | null
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "account_deletion_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "pending_account_deletions"
            referencedColumns: ["deletion_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_workshop_id_fkey"
            columns: ["referred_by_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      quote_acceptance_log: {
        Row: {
          acceptance_method: string
          accepted_at: string | null
          accepted_labor_cost: number | null
          accepted_parts_cost: number | null
          accepted_quote_snapshot: Json | null
          accepted_tax: number | null
          accepted_total_cost: number
          created_at: string | null
          customer_acknowledged_10_percent_rule: boolean
          customer_acknowledged_warranty: boolean
          customer_confirmed_labor_breakdown: boolean
          customer_confirmed_parts_breakdown: boolean
          customer_id: string
          id: string
          ip_address: unknown
          quote_id: string
          terms_shown_to_customer: string | null
          user_agent: string | null
          workshop_id: string | null
        }
        Insert: {
          acceptance_method: string
          accepted_at?: string | null
          accepted_labor_cost?: number | null
          accepted_parts_cost?: number | null
          accepted_quote_snapshot?: Json | null
          accepted_tax?: number | null
          accepted_total_cost: number
          created_at?: string | null
          customer_acknowledged_10_percent_rule?: boolean
          customer_acknowledged_warranty?: boolean
          customer_confirmed_labor_breakdown?: boolean
          customer_confirmed_parts_breakdown?: boolean
          customer_id: string
          id?: string
          ip_address?: unknown
          quote_id: string
          terms_shown_to_customer?: string | null
          user_agent?: string | null
          workshop_id?: string | null
        }
        Update: {
          acceptance_method?: string
          accepted_at?: string | null
          accepted_labor_cost?: number | null
          accepted_parts_cost?: number | null
          accepted_quote_snapshot?: Json | null
          accepted_tax?: number | null
          accepted_total_cost?: number
          created_at?: string | null
          customer_acknowledged_10_percent_rule?: boolean
          customer_acknowledged_warranty?: boolean
          customer_confirmed_labor_breakdown?: boolean
          customer_confirmed_parts_breakdown?: boolean
          customer_id?: string
          id?: string
          ip_address?: unknown
          quote_id?: string
          terms_shown_to_customer?: string | null
          user_agent?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_acceptance_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_acceptance_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      quote_modifications: {
        Row: {
          added_items: Json | null
          created_at: string | null
          created_by: string | null
          customer_response: string | null
          id: string
          modified_items: Json | null
          new_customer_total: number
          new_quote_id: string | null
          new_subtotal: number
          old_customer_total: number
          old_subtotal: number
          original_quote_id: string | null
          reason: string
          removed_items: Json | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          added_items?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_response?: string | null
          id?: string
          modified_items?: Json | null
          new_customer_total: number
          new_quote_id?: string | null
          new_subtotal: number
          old_customer_total: number
          old_subtotal: number
          original_quote_id?: string | null
          reason: string
          removed_items?: Json | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          added_items?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_response?: string | null
          id?: string
          modified_items?: Json | null
          new_customer_total?: number
          new_quote_id?: string | null
          new_subtotal?: number
          old_customer_total?: number
          old_subtotal?: number
          original_quote_id?: string | null
          reason?: string
          removed_items?: Json | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_modifications_new_quote_id_fkey"
            columns: ["new_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_modifications_new_quote_id_fkey"
            columns: ["new_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_modifications_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_modifications_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_variance_approval_log: {
        Row: {
          action_details: Json | null
          action_type: string
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          id: string
          notes: string | null
          variance_request_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          variance_request_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          variance_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_variance_approval_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_approval_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_approval_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_variance_approval_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_approval_log_variance_request_id_fkey"
            columns: ["variance_request_id"]
            isOneToOne: false
            referencedRelation: "quote_variance_compliance_status"
            referencedColumns: ["variance_request_id"]
          },
          {
            foreignKeyName: "quote_variance_approval_log_variance_request_id_fkey"
            columns: ["variance_request_id"]
            isOneToOne: false
            referencedRelation: "quote_variance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_variance_requests: {
        Row: {
          additional_labor_cost: number | null
          additional_parts_cost: number | null
          contact_method: string | null
          contact_notes: string | null
          contact_timestamp: string | null
          created_at: string | null
          customer_approval_ip_address: unknown
          customer_approval_method: string | null
          customer_approval_user_agent: string | null
          customer_authorized_amount: number | null
          customer_id: string
          customer_notes: string | null
          customer_response_at: string | null
          detailed_explanation: string
          exceeds_10_percent: boolean | null
          expires_at: string | null
          final_approved_cost: number | null
          id: string
          labor_breakdown_changes: Json | null
          ocpa_compliant: boolean | null
          original_quote_id: string
          original_total_cost: number
          parts_breakdown_changes: Json | null
          resolution_notes: string | null
          revised_quote_id: string | null
          revised_total_cost: number
          session_request_id: string | null
          status: string | null
          updated_at: string | null
          variance_amount: number | null
          variance_percent: number | null
          variance_reason: string
          work_can_proceed: boolean | null
          workshop_contacted_customer: boolean | null
          workshop_id: string
        }
        Insert: {
          additional_labor_cost?: number | null
          additional_parts_cost?: number | null
          contact_method?: string | null
          contact_notes?: string | null
          contact_timestamp?: string | null
          created_at?: string | null
          customer_approval_ip_address?: unknown
          customer_approval_method?: string | null
          customer_approval_user_agent?: string | null
          customer_authorized_amount?: number | null
          customer_id: string
          customer_notes?: string | null
          customer_response_at?: string | null
          detailed_explanation: string
          exceeds_10_percent?: boolean | null
          expires_at?: string | null
          final_approved_cost?: number | null
          id?: string
          labor_breakdown_changes?: Json | null
          ocpa_compliant?: boolean | null
          original_quote_id: string
          original_total_cost: number
          parts_breakdown_changes?: Json | null
          resolution_notes?: string | null
          revised_quote_id?: string | null
          revised_total_cost: number
          session_request_id?: string | null
          status?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_percent?: number | null
          variance_reason: string
          work_can_proceed?: boolean | null
          workshop_contacted_customer?: boolean | null
          workshop_id: string
        }
        Update: {
          additional_labor_cost?: number | null
          additional_parts_cost?: number | null
          contact_method?: string | null
          contact_notes?: string | null
          contact_timestamp?: string | null
          created_at?: string | null
          customer_approval_ip_address?: unknown
          customer_approval_method?: string | null
          customer_approval_user_agent?: string | null
          customer_authorized_amount?: number | null
          customer_id?: string
          customer_notes?: string | null
          customer_response_at?: string | null
          detailed_explanation?: string
          exceeds_10_percent?: boolean | null
          expires_at?: string | null
          final_approved_cost?: number | null
          id?: string
          labor_breakdown_changes?: Json | null
          ocpa_compliant?: boolean | null
          original_quote_id?: string
          original_total_cost?: number
          parts_breakdown_changes?: Json | null
          resolution_notes?: string | null
          revised_quote_id?: string | null
          revised_total_cost?: number
          session_request_id?: string | null
          status?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_percent?: number | null
          variance_reason?: string
          work_can_proceed?: boolean | null
          workshop_contacted_customer?: boolean | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_revised_quote_id_fkey"
            columns: ["revised_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_revised_quote_id_fkey"
            columns: ["revised_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_session_request_id_fkey"
            columns: ["session_request_id"]
            isOneToOne: false
            referencedRelation: "session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_session_request_id_fkey"
            columns: ["session_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["session_request_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      recommendation_feedback: {
        Row: {
          action: string
          created_at: string
          customer_id: string
          feedback_text: string | null
          id: string
          rating: number | null
          recommendation_id: string
          recommendation_type: string
        }
        Insert: {
          action: string
          created_at?: string
          customer_id: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          recommendation_id: string
          recommendation_type: string
        }
        Update: {
          action?: string
          created_at?: string
          customer_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          recommendation_id?: string
          recommendation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "recommendation_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "recommendation_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "recommendation_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_job_updates: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          customer_notified: boolean | null
          id: string
          internal_only: boolean | null
          message: string | null
          metadata: Json | null
          new_status: string
          notification_sent_at: string | null
          old_status: string
          photos: string[] | null
          repair_job_id: string
          update_type: string
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          customer_notified?: boolean | null
          id?: string
          internal_only?: boolean | null
          message?: string | null
          metadata?: Json | null
          new_status: string
          notification_sent_at?: string | null
          old_status: string
          photos?: string[] | null
          repair_job_id: string
          update_type: string
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          customer_notified?: boolean | null
          id?: string
          internal_only?: boolean | null
          message?: string | null
          metadata?: Json | null
          new_status?: string
          notification_sent_at?: string | null
          old_status?: string
          photos?: string[] | null
          repair_job_id?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_job_updates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_job_updates_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_jobs: {
        Row: {
          actual_labor_hours: number | null
          additional_quote_id: string | null
          additional_work_requested: boolean | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          customer_notified_ready: boolean | null
          description: string
          estimated_completion_date: string | null
          estimated_labor_hours: number | null
          final_notes: string | null
          id: string
          job_number: string | null
          last_update_sent_at: string | null
          mechanic_id: string | null
          metadata: Json | null
          parts_eta: string | null
          parts_ordered_at: string | null
          parts_ordered_count: number | null
          parts_received_at: string | null
          parts_received_count: number | null
          parts_status: string | null
          parts_supplier: string | null
          picked_up_at: string | null
          picked_up_by_name: string | null
          pickup_reminder_sent: boolean | null
          pickup_scheduled_at: string | null
          quality_check_at: string | null
          quality_check_passed: boolean | null
          quality_notes: string | null
          quote_accepted_at: string
          ready_for_pickup_at: string | null
          ready_notification_sent_at: string | null
          repair_quote_id: string
          repair_started_at: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_info: Json | null
          workshop_id: string | null
        }
        Insert: {
          actual_labor_hours?: number | null
          additional_quote_id?: string | null
          additional_work_requested?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_notified_ready?: boolean | null
          description: string
          estimated_completion_date?: string | null
          estimated_labor_hours?: number | null
          final_notes?: string | null
          id?: string
          job_number?: string | null
          last_update_sent_at?: string | null
          mechanic_id?: string | null
          metadata?: Json | null
          parts_eta?: string | null
          parts_ordered_at?: string | null
          parts_ordered_count?: number | null
          parts_received_at?: string | null
          parts_received_count?: number | null
          parts_status?: string | null
          parts_supplier?: string | null
          picked_up_at?: string | null
          picked_up_by_name?: string | null
          pickup_reminder_sent?: boolean | null
          pickup_scheduled_at?: string | null
          quality_check_at?: string | null
          quality_check_passed?: boolean | null
          quality_notes?: string | null
          quote_accepted_at: string
          ready_for_pickup_at?: string | null
          ready_notification_sent_at?: string | null
          repair_quote_id: string
          repair_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
          workshop_id?: string | null
        }
        Update: {
          actual_labor_hours?: number | null
          additional_quote_id?: string | null
          additional_work_requested?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_notified_ready?: boolean | null
          description?: string
          estimated_completion_date?: string | null
          estimated_labor_hours?: number | null
          final_notes?: string | null
          id?: string
          job_number?: string | null
          last_update_sent_at?: string | null
          mechanic_id?: string | null
          metadata?: Json | null
          parts_eta?: string | null
          parts_ordered_at?: string | null
          parts_ordered_count?: number | null
          parts_received_at?: string | null
          parts_received_count?: number | null
          parts_status?: string | null
          parts_supplier?: string | null
          picked_up_at?: string | null
          picked_up_by_name?: string | null
          pickup_reminder_sent?: boolean | null
          pickup_scheduled_at?: string | null
          quality_check_at?: string | null
          quality_check_passed?: boolean | null
          quality_notes?: string | null
          quote_accepted_at?: string
          ready_for_pickup_at?: string | null
          ready_notification_sent_at?: string | null
          repair_quote_id?: string
          repair_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_jobs_additional_quote_id_fkey"
            columns: ["additional_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "repair_jobs_additional_quote_id_fkey"
            columns: ["additional_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_repair_quote_id_fkey"
            columns: ["repair_quote_id"]
            isOneToOne: true
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "repair_jobs_repair_quote_id_fkey"
            columns: ["repair_quote_id"]
            isOneToOne: true
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_jobs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      repair_payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          escrow_status: string | null
          held_at: string | null
          id: string
          mechanic_id: string | null
          platform_fee: number
          provider_amount: number
          quote_id: string | null
          refunded_at: string | null
          released_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          updated_at: string | null
          workshop_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          escrow_status?: string | null
          held_at?: string | null
          id?: string
          mechanic_id?: string | null
          platform_fee: number
          provider_amount: number
          quote_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          escrow_status?: string | null
          held_at?: string | null
          id?: string
          mechanic_id?: string | null
          platform_fee?: number
          provider_amount?: number
          quote_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_payments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "repair_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_payments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      repair_quotes: {
        Row: {
          created_at: string | null
          customer_acceptance_ip_address: unknown
          customer_acceptance_method: string | null
          customer_accepted_at: string | null
          customer_contact_method: string | null
          customer_contact_timestamp: string | null
          customer_contacted_for_quote: boolean | null
          customer_id: string | null
          customer_notes: string | null
          customer_responded_at: string | null
          customer_response: string | null
          customer_total: number
          decline_reason: string | null
          diagnosing_mechanic_id: string | null
          diagnostic_session_id: string | null
          estimated_completion_hours: number | null
          fee_rule_applied: string | null
          id: string
          in_person_visit_id: string | null
          internal_notes: string | null
          is_modification: boolean | null
          labor_cost: number
          line_items: Json
          mechanic_id: string | null
          modification_reason: string | null
          notes: string | null
          parts_cost: number
          platform_fee_amount: number
          platform_fee_percent: number
          previous_quote_id: string | null
          provider_receives: number
          quote_type: string | null
          quote_valid_until: string | null
          quoting_user_id: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          updated_at: string | null
          vehicle_id: string | null
          viewed_at: string | null
          warranty_days: number | null
          warranty_disclosure_accepted: boolean | null
          warranty_exclusions: string | null
          warranty_expires_at: string | null
          warranty_type: string | null
          work_authorized: boolean | null
          work_authorized_at: string | null
          work_completed_at: string | null
          work_started_at: string | null
          workshop_id: string | null
          written_estimate_provided_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_acceptance_ip_address?: unknown
          customer_acceptance_method?: string | null
          customer_accepted_at?: string | null
          customer_contact_method?: string | null
          customer_contact_timestamp?: string | null
          customer_contacted_for_quote?: boolean | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_responded_at?: string | null
          customer_response?: string | null
          customer_total: number
          decline_reason?: string | null
          diagnosing_mechanic_id?: string | null
          diagnostic_session_id?: string | null
          estimated_completion_hours?: number | null
          fee_rule_applied?: string | null
          id?: string
          in_person_visit_id?: string | null
          internal_notes?: string | null
          is_modification?: boolean | null
          labor_cost?: number
          line_items: Json
          mechanic_id?: string | null
          modification_reason?: string | null
          notes?: string | null
          parts_cost?: number
          platform_fee_amount: number
          platform_fee_percent: number
          previous_quote_id?: string | null
          provider_receives: number
          quote_type?: string | null
          quote_valid_until?: string | null
          quoting_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          viewed_at?: string | null
          warranty_days?: number | null
          warranty_disclosure_accepted?: boolean | null
          warranty_exclusions?: string | null
          warranty_expires_at?: string | null
          warranty_type?: string | null
          work_authorized?: boolean | null
          work_authorized_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          workshop_id?: string | null
          written_estimate_provided_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_acceptance_ip_address?: unknown
          customer_acceptance_method?: string | null
          customer_accepted_at?: string | null
          customer_contact_method?: string | null
          customer_contact_timestamp?: string | null
          customer_contacted_for_quote?: boolean | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_responded_at?: string | null
          customer_response?: string | null
          customer_total?: number
          decline_reason?: string | null
          diagnosing_mechanic_id?: string | null
          diagnostic_session_id?: string | null
          estimated_completion_hours?: number | null
          fee_rule_applied?: string | null
          id?: string
          in_person_visit_id?: string | null
          internal_notes?: string | null
          is_modification?: boolean | null
          labor_cost?: number
          line_items?: Json
          mechanic_id?: string | null
          modification_reason?: string | null
          notes?: string | null
          parts_cost?: number
          platform_fee_amount?: number
          platform_fee_percent?: number
          previous_quote_id?: string | null
          provider_receives?: number
          quote_type?: string | null
          quote_valid_until?: string | null
          quoting_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          viewed_at?: string | null
          warranty_days?: number | null
          warranty_disclosure_accepted?: boolean | null
          warranty_exclusions?: string | null
          warranty_expires_at?: string | null
          warranty_type?: string | null
          work_authorized?: boolean | null
          work_authorized_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          workshop_id?: string | null
          written_estimate_provided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnosing_mechanic_id_fkey"
            columns: ["diagnosing_mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_in_person_visit_id_fkey"
            columns: ["in_person_visit_id"]
            isOneToOne: false
            referencedRelation: "in_person_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_previous_quote_id_fkey"
            columns: ["previous_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "repair_quotes_previous_quote_id_fkey"
            columns: ["previous_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_quoting_user_id_fkey"
            columns: ["quoting_user_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["security_event_type"]
          id: string
          ip_address: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["security_event_type"]
          id?: string
          ip_address?: string | null
          session_id?: string | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["security_event_type"]
          id?: string
          ip_address?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_keywords: {
        Row: {
          active: boolean | null
          category: string
          complexity: string | null
          created_at: string | null
          id: string
          keyword: string
          requires_specialist: boolean | null
        }
        Insert: {
          active?: boolean | null
          category: string
          complexity?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          requires_specialist?: boolean | null
        }
        Update: {
          active?: boolean | null
          category?: string
          complexity?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          requires_specialist?: boolean | null
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          billing_cycle: string | null
          created_at: string
          credit_allocation: number | null
          description: string
          discount_percent: number | null
          display_order: number
          duration_minutes: number
          features: Json
          id: string
          is_active: boolean
          marketing_badge: string | null
          max_rollover_credits: number | null
          name: string
          perks: Json
          plan_category: string | null
          plan_type: string | null
          price: number
          recommended_for: string | null
          requires_certification: boolean | null
          restricted_brands: string[] | null
          routing_preference: string | null
          show_on_homepage: boolean | null
          slug: string
          stripe_price_id: string | null
          stripe_subscription_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          credit_allocation?: number | null
          description: string
          discount_percent?: number | null
          display_order?: number
          duration_minutes: number
          features?: Json
          id?: string
          is_active?: boolean
          marketing_badge?: string | null
          max_rollover_credits?: number | null
          name: string
          perks?: Json
          plan_category?: string | null
          plan_type?: string | null
          price?: number
          recommended_for?: string | null
          requires_certification?: boolean | null
          restricted_brands?: string[] | null
          routing_preference?: string | null
          show_on_homepage?: boolean | null
          slug: string
          stripe_price_id?: string | null
          stripe_subscription_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          credit_allocation?: number | null
          description?: string
          discount_percent?: number | null
          display_order?: number
          duration_minutes?: number
          features?: Json
          id?: string
          is_active?: boolean
          marketing_badge?: string | null
          max_rollover_credits?: number | null
          name?: string
          perks?: Json
          plan_category?: string | null
          plan_type?: string | null
          price?: number
          recommended_for?: string | null
          requires_certification?: boolean | null
          restricted_brands?: string[] | null
          routing_preference?: string | null
          show_on_homepage?: boolean | null
          slug?: string
          stripe_price_id?: string | null
          stripe_subscription_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean | null
          code: string | null
          duration_min: number
          id: number
          name: string | null
          price_cents: number
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          duration_min: number
          id?: number
          name?: string | null
          price_cents: number
        }
        Update: {
          active?: boolean | null
          code?: string | null
          duration_min?: number
          id?: number
          name?: string | null
          price_cents?: number
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          mechanic_id: string | null
          metadata: Json | null
          session_id: string
          session_plan: string
          session_status: string
          session_type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          mechanic_id?: string | null
          metadata?: Json | null
          session_id: string
          session_plan: string
          session_status: string
          session_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          mechanic_id?: string | null
          metadata?: Json | null
          session_id?: string
          session_plan?: string
          session_status?: string
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_assignments: {
        Row: {
          accepted_at: string | null
          created_at: string
          expired_at: string | null
          expires_at: string | null
          id: string
          match_reasons: string[] | null
          match_score: number | null
          mechanic_id: string | null
          metadata: Json
          offered_at: string | null
          priority: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: string[] | null
          match_score?: number | null
          mechanic_id?: string | null
          metadata?: Json
          offered_at?: string | null
          priority?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: string[] | null
          match_score?: number | null
          mechanic_id?: string | null
          metadata?: Json
          offered_at?: string | null
          priority?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_assignments_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_devices: {
        Row: {
          device_fingerprint: string
          id: string
          joined_at: string
          kicked_at: string | null
          last_seen_at: string
          metadata: Json
          session_id: string
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          id?: string
          joined_at?: string
          kicked_at?: string | null
          last_seen_at?: string
          metadata?: Json
          session_id: string
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          id?: string
          joined_at?: string
          kicked_at?: string | null
          last_seen_at?: string
          metadata?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_devices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          mechanic_id: string | null
          metadata: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          mechanic_id?: string | null
          metadata?: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          mechanic_id?: string | null
          metadata?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_extensions: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          minutes: number
          payment_intent_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          minutes: number
          payment_intent_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          minutes?: number
          payment_intent_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_extensions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_files: {
        Row: {
          created_at: string
          description: string | null
          file_category: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string | null
          id: string
          metadata: Json | null
          session_id: string
          storage_path: string
          tags: string[] | null
          transcript: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_category?: string | null
          file_name: string
          file_size?: number
          file_type?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          storage_path: string
          tags?: string[] | null
          transcript?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_category?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          storage_path?: string
          tags?: string[] | null
          transcript?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
          role: string
          session_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          role: string
          session_id: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          role?: string
          session_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "session_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          email: string | null
          id: string
          joined_at: string | null
          role: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          joined_at?: string | null
          role: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          customer_city: string | null
          customer_country: string | null
          customer_email: string | null
          customer_id: string
          customer_name: string | null
          customer_postal_code: string | null
          expires_at: string | null
          extracted_keywords: string[] | null
          follow_up_type: string | null
          id: string
          is_follow_up: boolean | null
          is_urgent: boolean
          matching_score: Json | null
          mechanic_id: string | null
          parent_session_id: string | null
          plan_code: string | null
          prefer_local_mechanic: boolean | null
          preferred_mechanic_id: string | null
          preferred_workshop_id: string | null
          priority_notified_at: string | null
          priority_window_minutes: number | null
          request_type: string | null
          requested_brand: string | null
          routing_type: string | null
          session_id: string | null
          session_type: string
          status: string
          vehicle_id: string | null
          workshop_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          customer_city?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_id: string
          customer_name?: string | null
          customer_postal_code?: string | null
          expires_at?: string | null
          extracted_keywords?: string[] | null
          follow_up_type?: string | null
          id?: string
          is_follow_up?: boolean | null
          is_urgent?: boolean
          matching_score?: Json | null
          mechanic_id?: string | null
          parent_session_id?: string | null
          plan_code?: string | null
          prefer_local_mechanic?: boolean | null
          preferred_mechanic_id?: string | null
          preferred_workshop_id?: string | null
          priority_notified_at?: string | null
          priority_window_minutes?: number | null
          request_type?: string | null
          requested_brand?: string | null
          routing_type?: string | null
          session_id?: string | null
          session_type: string
          status?: string
          vehicle_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          customer_city?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_postal_code?: string | null
          expires_at?: string | null
          extracted_keywords?: string[] | null
          follow_up_type?: string | null
          id?: string
          is_follow_up?: boolean | null
          is_urgent?: boolean
          matching_score?: Json | null
          mechanic_id?: string | null
          parent_session_id?: string | null
          plan_code?: string | null
          prefer_local_mechanic?: boolean | null
          preferred_mechanic_id?: string | null
          preferred_workshop_id?: string | null
          priority_notified_at?: string | null
          priority_window_minutes?: number | null
          request_type?: string | null
          requested_brand?: string | null
          routing_type?: string | null
          session_id?: string | null
          session_type?: string
          status?: string
          vehicle_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_preferred_mechanic_id_fkey"
            columns: ["preferred_mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "session_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "session_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "session_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      session_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_user_id: string
          id: string
          mechanic_id: string
          rating: number
          session_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_user_id: string
          id?: string
          mechanic_id: string
          rating: number
          session_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_user_id?: string
          id?: string
          mechanic_id?: string
          rating?: number
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_reviews_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "session_reviews_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "session_reviews_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_reviews_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reviews_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_summaries: {
        Row: {
          created_at: string
          customer_report: string | null
          identified_issues: Json | null
          media_file_ids: string[] | null
          session_id: string
          session_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_report?: string | null
          identified_issues?: Json | null
          media_file_ids?: string[] | null
          session_id: string
          session_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_report?: string | null
          identified_issues?: Json | null
          media_file_ids?: string[] | null
          session_id?: string
          session_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_email: string | null
          customer_user_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          expires_at: string | null
          id: string
          intake_id: string | null
          is_follow_up: boolean | null
          is_paused: boolean | null
          last_state_change_at: string | null
          mechanic_id: string | null
          mechanic_notes: string | null
          metadata: Json | null
          parent_session_id: string | null
          plan: string
          preferred_workshop_id: string | null
          rating: number | null
          rating_comment: string | null
          reminder_15min_sent: boolean | null
          reminder_1h_sent: boolean | null
          reminder_24h_sent: boolean | null
          scheduled_end: string | null
          scheduled_for: string | null
          scheduled_start: string | null
          started_at: string | null
          status: string | null
          stripe_session_id: string
          summary_data: Json | null
          summary_submitted_at: string | null
          total_paused_ms: number | null
          type: Database["public"]["Enums"]["session_type"] | null
          updated_at: string | null
          waiver_reminder_sent_at: string | null
          waiver_signature: string | null
          waiver_signed_at: string | null
          workshop_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_user_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          is_follow_up?: boolean | null
          is_paused?: boolean | null
          last_state_change_at?: string | null
          mechanic_id?: string | null
          mechanic_notes?: string | null
          metadata?: Json | null
          parent_session_id?: string | null
          plan: string
          preferred_workshop_id?: string | null
          rating?: number | null
          rating_comment?: string | null
          reminder_15min_sent?: boolean | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          scheduled_start?: string | null
          started_at?: string | null
          status?: string | null
          stripe_session_id: string
          summary_data?: Json | null
          summary_submitted_at?: string | null
          total_paused_ms?: number | null
          type?: Database["public"]["Enums"]["session_type"] | null
          updated_at?: string | null
          waiver_reminder_sent_at?: string | null
          waiver_signature?: string | null
          waiver_signed_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_user_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          is_follow_up?: boolean | null
          is_paused?: boolean | null
          last_state_change_at?: string | null
          mechanic_id?: string | null
          mechanic_notes?: string | null
          metadata?: Json | null
          parent_session_id?: string | null
          plan?: string
          preferred_workshop_id?: string | null
          rating?: number | null
          rating_comment?: string | null
          reminder_15min_sent?: boolean | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          scheduled_start?: string | null
          started_at?: string | null
          status?: string | null
          stripe_session_id?: string
          summary_data?: Json | null
          summary_submitted_at?: string | null
          total_paused_ms?: number | null
          type?: Database["public"]["Enums"]["session_type"] | null
          updated_at?: string | null
          waiver_reminder_sent_at?: string | null
          waiver_signature?: string | null
          waiver_signed_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_preferred_workshop_id_fkey"
            columns: ["preferred_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      slot_reservations: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          end_time: string
          expires_at: string | null
          id: string
          mechanic_id: string
          metadata: Json | null
          reserved_at: string | null
          session_id: string | null
          start_time: string
          status: string
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          end_time: string
          expires_at?: string | null
          id?: string
          mechanic_id: string
          metadata?: Json | null
          reserved_at?: string | null
          session_id?: string | null
          start_time: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          end_time?: string
          expires_at?: string | null
          id?: string
          mechanic_id?: string
          metadata?: Json | null
          reserved_at?: string | null
          session_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_reservations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "slot_reservations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "slot_reservations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "slot_reservations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          end_at: string
          held_until: string | null
          id: number
          mechanic_id: string | null
          start_at: string
          status: string | null
        }
        Insert: {
          end_at: string
          held_until?: string | null
          id?: number
          mechanic_id?: string | null
          start_at: string
          status?: string | null
        }
        Update: {
          end_at?: string
          held_until?: string | null
          id?: number
          mechanic_id?: string | null
          start_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          default_timezone: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          default_timezone?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          default_timezone?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          checked_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      upsell_recommendations: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          customer_id: string | null
          dismissed_at: string | null
          id: string
          metadata: Json | null
          price_cents: number | null
          purchased_at: string | null
          recommendation_type: string
          service_description: string | null
          service_title: string
          session_id: string | null
          shown_at: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          dismissed_at?: string | null
          id?: string
          metadata?: Json | null
          price_cents?: number | null
          purchased_at?: string | null
          recommendation_type: string
          service_description?: string | null
          service_title: string
          session_id?: string | null
          shown_at?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          dismissed_at?: string | null
          id?: string
          metadata?: Json | null
          price_cents?: number | null
          purchased_at?: string | null
          recommendation_type?: string
          service_description?: string | null
          service_title?: string
          session_id?: string | null
          shown_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      vehicle_recommendations: {
        Row: {
          based_on_age: boolean
          based_on_history: boolean
          based_on_mileage: boolean
          based_on_season: boolean
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string
          dismissed_at: string | null
          dismissed_reason: string | null
          due_by_date: string | null
          due_by_mileage: number | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: string
          recommendation_type: string
          recommended_date: string | null
          scheduled_session_id: string | null
          status: string
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          based_on_age?: boolean
          based_on_history?: boolean
          based_on_mileage?: boolean
          based_on_season?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          due_by_date?: string | null
          due_by_mileage?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          recommendation_type: string
          recommended_date?: string | null
          scheduled_session_id?: string | null
          status?: string
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          based_on_age?: boolean
          based_on_history?: boolean
          based_on_mileage?: boolean
          based_on_season?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          due_by_date?: string | null
          due_by_mileage?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          recommendation_type?: string
          recommended_date?: string | null
          scheduled_session_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_scheduled_session_id_fkey"
            columns: ["scheduled_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_recommendations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          make: string
          mileage: string | null
          model: string
          nickname: string | null
          plate: string | null
          updated_at: string
          user_id: string
          vin: string | null
          year: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          make: string
          mileage?: string | null
          model: string
          nickname?: string | null
          plate?: string | null
          updated_at?: string
          user_id: string
          vin?: string | null
          year: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          make?: string
          mileage?: string | null
          model?: string
          nickname?: string | null
          plate?: string | null
          updated_at?: string
          user_id?: string
          vin?: string | null
          year?: string
        }
        Relationships: []
      }
      waiver_acceptances: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
          waiver_version: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
          waiver_version?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
          waiver_version?: string
        }
        Relationships: []
      }
      waiver_signatures: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          intake_id: string | null
          ip_address: string | null
          is_valid: boolean
          signature_data: string
          signed_at: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          waiver_version: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          intake_id?: string | null
          ip_address?: string | null
          is_valid?: boolean
          signature_data: string
          signed_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          waiver_version?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          intake_id?: string | null
          ip_address?: string | null
          is_valid?: boolean
          signature_data?: string
          signed_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          waiver_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_signatures_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_signatures_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["intake_id"]
          },
          {
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          claim_filed_date: string | null
          claim_type: string
          created_at: string | null
          customer_id: string
          customer_satisfied: boolean | null
          days_since_repair: number | null
          decline_reason: string | null
          id: string
          issue_description: string
          issue_discovered_date: string
          issue_photos: Json | null
          original_quote_id: string
          repair_completion_date: string
          resolution_completed_date: string | null
          resolution_type: string | null
          status: string | null
          warranty_valid: boolean | null
          within_warranty_period: boolean | null
          workshop_id: string | null
          workshop_response: string | null
          workshop_response_date: string | null
        }
        Insert: {
          claim_filed_date?: string | null
          claim_type: string
          created_at?: string | null
          customer_id: string
          customer_satisfied?: boolean | null
          days_since_repair?: number | null
          decline_reason?: string | null
          id?: string
          issue_description: string
          issue_discovered_date: string
          issue_photos?: Json | null
          original_quote_id: string
          repair_completion_date: string
          resolution_completed_date?: string | null
          resolution_type?: string | null
          status?: string | null
          warranty_valid?: boolean | null
          within_warranty_period?: boolean | null
          workshop_id?: string | null
          workshop_response?: string | null
          workshop_response_date?: string | null
        }
        Update: {
          claim_filed_date?: string | null
          claim_type?: string
          created_at?: string | null
          customer_id?: string
          customer_satisfied?: boolean | null
          days_since_repair?: number | null
          decline_reason?: string | null
          id?: string
          issue_description?: string
          issue_discovered_date?: string
          issue_photos?: Json | null
          original_quote_id?: string
          repair_completion_date?: string
          resolution_completed_date?: string | null
          resolution_type?: string | null
          status?: string | null
          warranty_valid?: boolean | null
          within_warranty_period?: boolean | null
          workshop_id?: string | null
          workshop_response?: string | null
          workshop_response_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "warranty_claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "warranty_claims_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      warranty_disclosure_acknowledgments: {
        Row: {
          acknowledgment_timestamp: string | null
          created_at: string | null
          customer_acknowledged: boolean
          customer_id: string
          id: string
          ip_address: unknown
          quote_id: string
          warranty_days_shown: number | null
          warranty_terms_shown: string
          workshop_id: string | null
        }
        Insert: {
          acknowledgment_timestamp?: string | null
          created_at?: string | null
          customer_acknowledged?: boolean
          customer_id: string
          id?: string
          ip_address?: unknown
          quote_id: string
          warranty_days_shown?: number | null
          warranty_terms_shown: string
          workshop_id?: string | null
        }
        Update: {
          acknowledgment_timestamp?: string | null
          created_at?: string | null
          customer_acknowledged?: boolean
          customer_id?: string
          id?: string
          ip_address?: unknown
          quote_id?: string
          warranty_days_shown?: number | null
          warranty_terms_shown?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "warranty_disclosure_acknowledgments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_agreements: {
        Row: {
          admin_notes: string | null
          agreement_pdf_url: string | null
          agreement_type: string
          agreement_version: string
          business_number: string | null
          business_registration_verified: boolean | null
          created_at: string | null
          electronic_signature: string
          gst_hst_number: string | null
          id: string
          insurance_certificate_url: string | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_provider: string | null
          insurance_verified: boolean | null
          ip_address: unknown
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sections_accepted: Json
          signed_at: string | null
          signed_by: string | null
          status: string
          updated_at: string | null
          user_agent: string | null
          wsib_account_number: string | null
          wsib_clearance_certificate_url: string | null
          wsib_required: boolean | null
          wsib_verified: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          agreement_pdf_url?: string | null
          agreement_type?: string
          agreement_version?: string
          business_number?: string | null
          business_registration_verified?: boolean | null
          created_at?: string | null
          electronic_signature: string
          gst_hst_number?: string | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_expiry_date?: string | null
          insurance_provider?: string | null
          insurance_verified?: boolean | null
          ip_address: unknown
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections_accepted?: Json
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          wsib_account_number?: string | null
          wsib_clearance_certificate_url?: string | null
          wsib_required?: boolean | null
          wsib_verified?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          agreement_pdf_url?: string | null
          agreement_type?: string
          agreement_version?: string
          business_number?: string | null
          business_registration_verified?: boolean | null
          created_at?: string | null
          electronic_signature?: string
          gst_hst_number?: string | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_coverage_amount?: number | null
          insurance_expiry_date?: string | null
          insurance_provider?: string | null
          insurance_verified?: boolean | null
          ip_address?: unknown
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sections_accepted?: Json
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          wsib_account_number?: string | null
          wsib_clearance_certificate_url?: string | null
          wsib_required?: boolean | null
          wsib_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_agreements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_agreements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_agreements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_agreements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_agreements_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_agreements_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_agreements_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_agreements_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_taken: string | null
          action_taken_at: string | null
          alert_type: string
          auto_resolved: boolean | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
          updated_at: string
          user_id: string | null
          workshop_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          action_taken_at?: string | null
          alert_type: string
          auto_resolved?: boolean | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
          updated_at?: string
          user_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          action_taken_at?: string | null
          alert_type?: string
          auto_resolved?: boolean | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_appointments: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_date: string | null
          confirmed_time: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          customer_user_id: string
          declined_at: string | null
          declined_reason: string | null
          diagnostic_session_id: string | null
          duration_minutes: number
          id: string
          issue_description: string
          requested_date: string
          requested_time: string
          service_type: string | null
          status: string
          updated_at: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          workshop_id: string
          workshop_notes: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          customer_user_id: string
          declined_at?: string | null
          declined_reason?: string | null
          diagnostic_session_id?: string | null
          duration_minutes?: number
          id?: string
          issue_description: string
          requested_date: string
          requested_time: string
          service_type?: string | null
          status?: string
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          workshop_id: string
          workshop_notes?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          customer_user_id?: string
          declined_at?: string | null
          declined_reason?: string | null
          diagnostic_session_id?: string | null
          duration_minutes?: number
          id?: string
          issue_description?: string
          requested_date?: string
          requested_time?: string
          service_type?: string | null
          status?: string
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          workshop_id?: string
          workshop_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_appointments_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_appointments_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_appointments_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_appointments_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_appointments_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_appointments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_availability: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          close_time: string
          created_at: string | null
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          updated_at: string | null
          workshop_id: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          close_time?: string
          created_at?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string | null
          workshop_id: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          close_time?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_availability_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_earnings: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          gross_amount_cents: number
          id: string
          mechanic_id: string | null
          payment_intent_id: string | null
          payout_date: string | null
          payout_error: string | null
          payout_id: string | null
          payout_status: string | null
          platform_fee_cents: number
          platform_fee_percentage: number
          session_id: string | null
          session_request_id: string | null
          updated_at: string | null
          workshop_id: string
          workshop_net_cents: number
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          gross_amount_cents: number
          id?: string
          mechanic_id?: string | null
          payment_intent_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee_cents: number
          platform_fee_percentage: number
          session_id?: string | null
          session_request_id?: string | null
          updated_at?: string | null
          workshop_id: string
          workshop_net_cents: number
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          gross_amount_cents?: number
          id?: string
          mechanic_id?: string | null
          payment_intent_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee_cents?: number
          platform_fee_percentage?: number
          session_id?: string | null
          session_request_id?: string | null
          updated_at?: string | null
          workshop_id?: string
          workshop_net_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_earnings_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_earnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_earnings_session_request_id_fkey"
            columns: ["session_request_id"]
            isOneToOne: false
            referencedRelation: "session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_earnings_session_request_id_fkey"
            columns: ["session_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["session_request_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_escalation_preferences: {
        Row: {
          accepted_service_types: string[] | null
          accepting_new_customers: boolean | null
          auto_accept_escalations: boolean | null
          business_hours: Json | null
          created_at: string | null
          id: string
          max_daily_escalations: number | null
          preferred_cities: string[] | null
          service_radius_km: number | null
          typical_quote_turnaround_hours: number | null
          updated_at: string | null
          workshop_id: string
        }
        Insert: {
          accepted_service_types?: string[] | null
          accepting_new_customers?: boolean | null
          auto_accept_escalations?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          max_daily_escalations?: number | null
          preferred_cities?: string[] | null
          service_radius_km?: number | null
          typical_quote_turnaround_hours?: number | null
          updated_at?: string | null
          workshop_id: string
        }
        Update: {
          accepted_service_types?: string[] | null
          accepting_new_customers?: boolean | null
          auto_accept_escalations?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          max_daily_escalations?: number | null
          preferred_cities?: string[] | null
          service_radius_km?: number | null
          typical_quote_turnaround_hours?: number | null
          updated_at?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_preferences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_escalation_queue: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_to_advisor_id: string | null
          assigned_workshop_id: string | null
          assignment_method: string | null
          auto_assigned: boolean | null
          created_at: string | null
          customer_can_request_deletion: boolean | null
          customer_consent_ip_address: string | null
          customer_consent_timestamp: string | null
          customer_consent_to_share_info: boolean | null
          customer_id: string
          customer_notified_of_referral: boolean | null
          customer_selected_bid_at: string | null
          data_shared_with_workshop: Json | null
          declined_at: string | null
          declined_reason: string | null
          diagnosis_summary: string | null
          diagnostic_photos: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id: string
          escalation_type: string | null
          id: string
          issue_summary: string | null
          mechanic_notes: string | null
          priority: string | null
          quote_created_at: string | null
          quote_id: string | null
          recommended_services: string[] | null
          referral_disclosure_shown_at: string | null
          referral_disclosure_text: string | null
          referral_disclosure_version: string | null
          referral_fee_amount: number | null
          referral_fee_percent: number | null
          referral_paid: boolean | null
          referral_paid_at: string | null
          rfq_bid_count: number | null
          rfq_bid_deadline: string | null
          rfq_marketplace_id: string | null
          rfq_posted_at: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
          vehicle_info: Json | null
          winning_bid_amount: number | null
          winning_workshop_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to_advisor_id?: string | null
          assigned_workshop_id?: string | null
          assignment_method?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_can_request_deletion?: boolean | null
          customer_consent_ip_address?: string | null
          customer_consent_timestamp?: string | null
          customer_consent_to_share_info?: boolean | null
          customer_id: string
          customer_notified_of_referral?: boolean | null
          customer_selected_bid_at?: string | null
          data_shared_with_workshop?: Json | null
          declined_at?: string | null
          declined_reason?: string | null
          diagnosis_summary?: string | null
          diagnostic_photos?: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id: string
          escalation_type?: string | null
          id?: string
          issue_summary?: string | null
          mechanic_notes?: string | null
          priority?: string | null
          quote_created_at?: string | null
          quote_id?: string | null
          recommended_services?: string[] | null
          referral_disclosure_shown_at?: string | null
          referral_disclosure_text?: string | null
          referral_disclosure_version?: string | null
          referral_fee_amount?: number | null
          referral_fee_percent?: number | null
          referral_paid?: boolean | null
          referral_paid_at?: string | null
          rfq_bid_count?: number | null
          rfq_bid_deadline?: string | null
          rfq_marketplace_id?: string | null
          rfq_posted_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_info?: Json | null
          winning_bid_amount?: number | null
          winning_workshop_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to_advisor_id?: string | null
          assigned_workshop_id?: string | null
          assignment_method?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_can_request_deletion?: boolean | null
          customer_consent_ip_address?: string | null
          customer_consent_timestamp?: string | null
          customer_consent_to_share_info?: boolean | null
          customer_id?: string
          customer_notified_of_referral?: boolean | null
          customer_selected_bid_at?: string | null
          data_shared_with_workshop?: Json | null
          declined_at?: string | null
          declined_reason?: string | null
          diagnosis_summary?: string | null
          diagnostic_photos?: Json | null
          diagnostic_session_id?: string
          escalating_mechanic_id?: string
          escalation_type?: string | null
          id?: string
          issue_summary?: string | null
          mechanic_notes?: string | null
          priority?: string | null
          quote_created_at?: string | null
          quote_id?: string | null
          recommended_services?: string[] | null
          referral_disclosure_shown_at?: string | null
          referral_disclosure_text?: string | null
          referral_disclosure_version?: string | null
          referral_fee_amount?: number | null
          referral_fee_percent?: number | null
          referral_paid?: boolean | null
          referral_paid_at?: string | null
          rfq_bid_count?: number | null
          rfq_bid_deadline?: string | null
          rfq_marketplace_id?: string | null
          rfq_posted_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_info?: Json | null
          winning_bid_amount?: number | null
          winning_workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_to_advisor_id_fkey"
            columns: ["assigned_to_advisor_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_assigned_workshop_id_fkey"
            columns: ["assigned_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_escalation_queue_winning_workshop_id_fkey"
            columns: ["winning_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_events: {
        Row: {
          admin_id: string | null
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          error_message: string | null
          event_category: string
          event_type: string
          id: string
          ip_address: unknown
          mechanic_id: string | null
          metadata: Json | null
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
          workshop_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_category: string
          event_type: string
          id?: string
          ip_address?: unknown
          mechanic_id?: string | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          mechanic_id?: string | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_fee_overrides: {
        Row: {
          agreement_end_date: string | null
          agreement_notes: string | null
          agreement_start_date: string | null
          agreement_type: string | null
          created_at: string
          created_by: string | null
          custom_escrow_hold_days: number | null
          custom_quote_platform_fee: number | null
          custom_session_platform_fee: number | null
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          workshop_id: string
        }
        Insert: {
          agreement_end_date?: string | null
          agreement_notes?: string | null
          agreement_start_date?: string | null
          agreement_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_escrow_hold_days?: number | null
          custom_quote_platform_fee?: number | null
          custom_session_platform_fee?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          workshop_id: string
        }
        Update: {
          agreement_end_date?: string | null
          agreement_notes?: string | null
          agreement_start_date?: string | null
          agreement_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_escrow_hold_days?: number | null
          custom_quote_platform_fee?: number | null
          custom_session_platform_fee?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_fee_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_metrics: {
        Row: {
          active_workshops: number | null
          api_errors: number | null
          api_success_rate: number | null
          applications_approved: number | null
          applications_pending: number | null
          applications_rejected: number | null
          avg_approval_time_hours: number | null
          avg_mechanics_per_workshop: number | null
          avg_page_load_ms: number | null
          created_at: string
          dashboard_logins: number | null
          email_approval_sent: number | null
          email_invite_sent: number | null
          email_rejection_sent: number | null
          email_success_rate: number | null
          emails_failed: number | null
          emails_sent: number | null
          id: string
          invite_acceptance_rate: number | null
          invites_accepted: number | null
          invites_expired: number | null
          invites_sent: number | null
          median_approval_time_hours: number | null
          metric_date: string
          metric_type: string
          notes: string | null
          pending_workshops: number | null
          profile_updates: number | null
          rejected_workshops: number | null
          signup_conversion_rate: number | null
          signups_completed: number | null
          signups_failed: number | null
          signups_started: number | null
          suspended_workshops: number | null
          total_mechanics_active: number | null
          total_mechanics_invited: number | null
          updated_at: string
          workshops_with_mechanics: number | null
        }
        Insert: {
          active_workshops?: number | null
          api_errors?: number | null
          api_success_rate?: number | null
          applications_approved?: number | null
          applications_pending?: number | null
          applications_rejected?: number | null
          avg_approval_time_hours?: number | null
          avg_mechanics_per_workshop?: number | null
          avg_page_load_ms?: number | null
          created_at?: string
          dashboard_logins?: number | null
          email_approval_sent?: number | null
          email_invite_sent?: number | null
          email_rejection_sent?: number | null
          email_success_rate?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          invite_acceptance_rate?: number | null
          invites_accepted?: number | null
          invites_expired?: number | null
          invites_sent?: number | null
          median_approval_time_hours?: number | null
          metric_date: string
          metric_type: string
          notes?: string | null
          pending_workshops?: number | null
          profile_updates?: number | null
          rejected_workshops?: number | null
          signup_conversion_rate?: number | null
          signups_completed?: number | null
          signups_failed?: number | null
          signups_started?: number | null
          suspended_workshops?: number | null
          total_mechanics_active?: number | null
          total_mechanics_invited?: number | null
          updated_at?: string
          workshops_with_mechanics?: number | null
        }
        Update: {
          active_workshops?: number | null
          api_errors?: number | null
          api_success_rate?: number | null
          applications_approved?: number | null
          applications_pending?: number | null
          applications_rejected?: number | null
          avg_approval_time_hours?: number | null
          avg_mechanics_per_workshop?: number | null
          avg_page_load_ms?: number | null
          created_at?: string
          dashboard_logins?: number | null
          email_approval_sent?: number | null
          email_invite_sent?: number | null
          email_rejection_sent?: number | null
          email_success_rate?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          invite_acceptance_rate?: number | null
          invites_accepted?: number | null
          invites_expired?: number | null
          invites_sent?: number | null
          median_approval_time_hours?: number | null
          metric_date?: string
          metric_type?: string
          notes?: string | null
          pending_workshops?: number | null
          profile_updates?: number | null
          rejected_workshops?: number | null
          signup_conversion_rate?: number | null
          signups_completed?: number | null
          signups_failed?: number | null
          signups_started?: number | null
          suspended_workshops?: number | null
          total_mechanics_active?: number | null
          total_mechanics_invited?: number | null
          updated_at?: string
          workshops_with_mechanics?: number | null
        }
        Relationships: []
      }
      workshop_rfq_bids: {
        Row: {
          accepted_at: string | null
          after_hours_service_available: boolean | null
          alternative_options: string | null
          can_provide_loaner_vehicle: boolean | null
          can_provide_pickup_dropoff: boolean | null
          created_at: string | null
          description: string
          earliest_availability_date: string | null
          environmental_fee: number | null
          estimated_completion_days: number | null
          estimated_labor_hours: number | null
          first_viewed_at: string | null
          id: string
          labor_cost: number | null
          labor_warranty_months: number | null
          metadata: Json | null
          parts_cost: number | null
          parts_needed: string | null
          parts_warranty_months: number | null
          quote_amount: number
          rejected_at: string | null
          repair_plan: string | null
          rfq_marketplace_id: string
          shop_supplies_fee: number | null
          status: string | null
          submitted_by_role: string | null
          submitted_by_user_id: string | null
          tax_amount: number | null
          updated_at: string | null
          viewed_by_customer: boolean | null
          warranty_info: string | null
          withdrawn_at: string | null
          withdrawn_reason: string | null
          workshop_certifications: string[] | null
          workshop_city: string | null
          workshop_id: string
          workshop_name: string
          workshop_rating: number | null
          workshop_review_count: number | null
          workshop_years_in_business: number | null
        }
        Insert: {
          accepted_at?: string | null
          after_hours_service_available?: boolean | null
          alternative_options?: string | null
          can_provide_loaner_vehicle?: boolean | null
          can_provide_pickup_dropoff?: boolean | null
          created_at?: string | null
          description: string
          earliest_availability_date?: string | null
          environmental_fee?: number | null
          estimated_completion_days?: number | null
          estimated_labor_hours?: number | null
          first_viewed_at?: string | null
          id?: string
          labor_cost?: number | null
          labor_warranty_months?: number | null
          metadata?: Json | null
          parts_cost?: number | null
          parts_needed?: string | null
          parts_warranty_months?: number | null
          quote_amount: number
          rejected_at?: string | null
          repair_plan?: string | null
          rfq_marketplace_id: string
          shop_supplies_fee?: number | null
          status?: string | null
          submitted_by_role?: string | null
          submitted_by_user_id?: string | null
          tax_amount?: number | null
          updated_at?: string | null
          viewed_by_customer?: boolean | null
          warranty_info?: string | null
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
          workshop_certifications?: string[] | null
          workshop_city?: string | null
          workshop_id: string
          workshop_name: string
          workshop_rating?: number | null
          workshop_review_count?: number | null
          workshop_years_in_business?: number | null
        }
        Update: {
          accepted_at?: string | null
          after_hours_service_available?: boolean | null
          alternative_options?: string | null
          can_provide_loaner_vehicle?: boolean | null
          can_provide_pickup_dropoff?: boolean | null
          created_at?: string | null
          description?: string
          earliest_availability_date?: string | null
          environmental_fee?: number | null
          estimated_completion_days?: number | null
          estimated_labor_hours?: number | null
          first_viewed_at?: string | null
          id?: string
          labor_cost?: number | null
          labor_warranty_months?: number | null
          metadata?: Json | null
          parts_cost?: number | null
          parts_needed?: string | null
          parts_warranty_months?: number | null
          quote_amount?: number
          rejected_at?: string | null
          repair_plan?: string | null
          rfq_marketplace_id?: string
          shop_supplies_fee?: number | null
          status?: string | null
          submitted_by_role?: string | null
          submitted_by_user_id?: string | null
          tax_amount?: number | null
          updated_at?: string | null
          viewed_by_customer?: boolean | null
          warranty_info?: string | null
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
          workshop_certifications?: string[] | null
          workshop_city?: string | null
          workshop_id?: string
          workshop_name?: string
          workshop_rating?: number | null
          workshop_review_count?: number | null
          workshop_years_in_business?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_rfq_bids_rfq_marketplace_id_fkey"
            columns: ["rfq_marketplace_id"]
            isOneToOne: false
            referencedRelation: "workshop_rfq_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_bids_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_rfq_marketplace: {
        Row: {
          accepted_at: string | null
          accepted_bid_id: string | null
          additional_documents: string[] | null
          additional_photos: string[] | null
          additional_videos: string[] | null
          auto_expire_hours: number | null
          bid_count: number | null
          bid_deadline: string
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          customer_city: string | null
          customer_consent_timestamp: string | null
          customer_consent_to_share_info: boolean
          customer_id: string
          customer_postal_code: string | null
          customer_province: string | null
          description: string
          diagnosis_summary: string
          diagnostic_photos: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id: string | null
          escalation_queue_id: string
          id: string
          issue_category: string | null
          latitude: number | null
          longitude: number | null
          max_bids: number | null
          max_distance_km: number | null
          mechanic_notes: string | null
          metadata: Json | null
          min_workshop_rating: number | null
          preferred_cities: string[] | null
          privacy_policy_version: string | null
          recommended_services: string[] | null
          referral_disclosure_text: string | null
          referral_fee_disclosed: boolean
          required_certifications: string[] | null
          rfq_status: string | null
          status: string | null
          title: string
          total_workshops_viewed: number | null
          updated_at: string | null
          urgency: string | null
          vehicle_id: string | null
          vehicle_make: string | null
          vehicle_mileage: number | null
          vehicle_model: string | null
          vehicle_vin: string | null
          vehicle_year: number | null
          view_count: number | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_bid_id?: string | null
          additional_documents?: string[] | null
          additional_photos?: string[] | null
          additional_videos?: string[] | null
          auto_expire_hours?: number | null
          bid_count?: number | null
          bid_deadline: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_city?: string | null
          customer_consent_timestamp?: string | null
          customer_consent_to_share_info?: boolean
          customer_id: string
          customer_postal_code?: string | null
          customer_province?: string | null
          description: string
          diagnosis_summary: string
          diagnostic_photos?: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id?: string | null
          escalation_queue_id: string
          id?: string
          issue_category?: string | null
          latitude?: number | null
          longitude?: number | null
          max_bids?: number | null
          max_distance_km?: number | null
          mechanic_notes?: string | null
          metadata?: Json | null
          min_workshop_rating?: number | null
          preferred_cities?: string[] | null
          privacy_policy_version?: string | null
          recommended_services?: string[] | null
          referral_disclosure_text?: string | null
          referral_fee_disclosed?: boolean
          required_certifications?: string[] | null
          rfq_status?: string | null
          status?: string | null
          title: string
          total_workshops_viewed?: number | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_mileage?: number | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
          view_count?: number | null
        }
        Update: {
          accepted_at?: string | null
          accepted_bid_id?: string | null
          additional_documents?: string[] | null
          additional_photos?: string[] | null
          additional_videos?: string[] | null
          auto_expire_hours?: number | null
          bid_count?: number | null
          bid_deadline?: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_city?: string | null
          customer_consent_timestamp?: string | null
          customer_consent_to_share_info?: boolean
          customer_id?: string
          customer_postal_code?: string | null
          customer_province?: string | null
          description?: string
          diagnosis_summary?: string
          diagnostic_photos?: Json | null
          diagnostic_session_id?: string
          escalating_mechanic_id?: string | null
          escalation_queue_id?: string
          id?: string
          issue_category?: string | null
          latitude?: number | null
          longitude?: number | null
          max_bids?: number | null
          max_distance_km?: number | null
          mechanic_notes?: string | null
          metadata?: Json | null
          min_workshop_rating?: number | null
          preferred_cities?: string[] | null
          privacy_policy_version?: string | null
          recommended_services?: string[] | null
          referral_disclosure_text?: string | null
          referral_fee_disclosed?: boolean
          required_certifications?: string[] | null
          rfq_status?: string | null
          status?: string | null
          title?: string
          total_workshops_viewed?: number | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_mileage?: number | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_accepted_bid"
            columns: ["accepted_bid_id"]
            isOneToOne: false
            referencedRelation: "workshop_rfq_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalating_mechanic_id_fkey"
            columns: ["escalating_mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_escalation_queue_id_fkey"
            columns: ["escalation_queue_id"]
            isOneToOne: true
            referencedRelation: "workshop_escalation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_intake_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_session_history"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "workshop_rfq_marketplace_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_rfq_views: {
        Row: {
          created_at: string | null
          id: string
          last_viewed_at: string | null
          rfq_marketplace_id: string
          submitted_bid: boolean | null
          view_count: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          rfq_marketplace_id: string
          submitted_bid?: boolean | null
          view_count?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_viewed_at?: string | null
          rfq_marketplace_id?: string
          submitted_bid?: boolean | null
          view_count?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_rfq_views_rfq_marketplace_id_fkey"
            columns: ["rfq_marketplace_id"]
            isOneToOne: false
            referencedRelation: "workshop_rfq_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_rfq_views_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_roles: {
        Row: {
          can_diagnose: boolean | null
          can_manage_mechanics: boolean | null
          can_manage_settings: boolean | null
          can_see_pricing: boolean | null
          can_send_quotes: boolean | null
          can_view_analytics: boolean | null
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string | null
          workshop_id: string | null
        }
        Insert: {
          can_diagnose?: boolean | null
          can_manage_mechanics?: boolean | null
          can_manage_settings?: boolean | null
          can_see_pricing?: boolean | null
          can_send_quotes?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          can_diagnose?: boolean | null
          can_manage_mechanics?: boolean | null
          can_manage_settings?: boolean | null
          can_see_pricing?: boolean | null
          can_send_quotes?: boolean | null
          can_view_analytics?: boolean | null
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_roles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
    }
    Views: {
      active_marketing_consents: {
        Row: {
          consent_type: string | null
          created_at: string | null
          customer_id: string | null
          ip_address: unknown
          opt_in: boolean | null
          opt_in_date: string | null
          opt_out_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "marketing_consent_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_data_access_audit: {
        Row: {
          access_reason: string | null
          admin_email: string | null
          admin_id: string | null
          admin_name: string | null
          audit_id: string | null
          changes_made: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          data_categories: string[] | null
          data_viewed: string | null
          event_timestamp: string | null
          event_type: string | null
          ip_address: unknown
        }
        Relationships: [
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "privacy_audit_log_performed_by_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_privacy_dashboard_summary: {
        Row: {
          active_data_breaches: number | null
          critical_high_breaches: number | null
          customers_fully_compliant: number | null
          customers_opted_in_marketing: number | null
          data_access_requests_30_days: number | null
          data_access_requests_overdue: number | null
          deletions_completed_30_days: number | null
          opt_outs_7_days: number | null
          pending_deletion_requests: number | null
          privacy_events_24_hours: number | null
          total_customers_with_consents: number | null
        }
        Relationships: []
      }
      compliance_alert_dashboard: {
        Row: {
          alert_id: string | null
          alert_message: string | null
          alert_type: string | null
          created_at: string | null
          hours_since_alert: number | null
          priority_score: number | null
          quote_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
          workshop_compliance_score: number | null
          workshop_id: string | null
          workshop_name: string | null
          workshop_overall_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocpa_compliance_alerts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "ocpa_compliance_alerts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      compliance_trend_monthly: {
        Row: {
          compliant_quotes: number | null
          employment_status_changes: number | null
          insurance_expirations: number | null
          insurance_verifications: number | null
          month: string | null
          non_compliant_quotes: number | null
          quotes_with_consent: number | null
          t4a_issued_count: number | null
          total_compliance_events: number | null
        }
        Relationships: []
      }
      consent_statistics: {
        Row: {
          active_consents: number | null
          consent_type: string | null
          granted_30_days: number | null
          granted_at_quote: number | null
          granted_at_signup: number | null
          granted_in_settings: number | null
          opt_in_percentage: number | null
          total_consent_records: number | null
          withdrawal_percentage: number | null
          withdrawn_30_days: number | null
          withdrawn_consents: number | null
        }
        Relationships: []
      }
      customer_analytics: {
        Row: {
          cancelled_sessions: number | null
          chat_sessions: number | null
          completed_sessions: number | null
          customer_id: string | null
          customer_name: string | null
          customer_since: string | null
          diagnostic_sessions: number | null
          engagement_score: number | null
          first_session_date: string | null
          last_session_date: string | null
          refreshed_at: string | null
          total_sessions: number | null
          total_vehicles: number | null
          video_sessions: number | null
        }
        Relationships: []
      }
      customer_consent_summary: {
        Row: {
          customer_id: string | null
          email: string | null
          full_name: string | null
          has_all_required_consents: boolean | null
          has_analytics_consent: boolean | null
          has_marketing_consent: boolean | null
          has_marketplace_consent: boolean | null
          has_privacy_consent: boolean | null
          has_terms_consent: boolean | null
          latest_consent_date: string | null
          total_active_consents: number | null
          total_withdrawals: number | null
        }
        Insert: {
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          has_all_required_consents?: never
          has_analytics_consent?: never
          has_marketing_consent?: never
          has_marketplace_consent?: never
          has_privacy_consent?: never
          has_terms_consent?: never
          latest_consent_date?: never
          total_active_consents?: never
          total_withdrawals?: never
        }
        Update: {
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          has_all_required_consents?: never
          has_analytics_consent?: never
          has_marketing_consent?: never
          has_marketplace_consent?: never
          has_privacy_consent?: never
          has_terms_consent?: never
          latest_consent_date?: never
          total_active_consents?: never
          total_withdrawals?: never
        }
        Relationships: []
      }
      customer_data_privacy_compliance: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          data_retention_status: string | null
          last_session_date: string | null
          oldest_session_date: string | null
          sessions_with_consent: number | null
          sessions_with_referral_disclosure: number | null
          total_quote_acceptances: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      customer_quote_offers_v: {
        Row: {
          alternative_options: string | null
          can_provide_loaner_vehicle: boolean | null
          can_provide_pickup_dropoff: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_responded_at: string | null
          customer_response: string | null
          description: string | null
          earliest_availability_date: string | null
          estimated_completion_days: number | null
          estimated_completion_hours: number | null
          line_items: Json | null
          mechanic_id: string | null
          offer_id: string | null
          platform_fee: number | null
          platform_fee_percent: number | null
          price_labor: number | null
          price_parts: number | null
          price_subtotal: number | null
          price_total: number | null
          rfq_id: string | null
          sent_at: string | null
          session_id: string | null
          source: string | null
          status: string | null
          vehicle_id: string | null
          viewed_at: string | null
          warranty_days: number | null
          warranty_months_labor: number | null
          warranty_months_parts: number | null
          workshop_city: string | null
          workshop_id: string | null
          workshop_name: string | null
          workshop_rating: number | null
          workshop_years_in_business: number | null
        }
        Relationships: []
      }
      data_access_request_audit: {
        Row: {
          audit_id: string | null
          customer_id: string | null
          data_format: string | null
          days_since_request: number | null
          download_url: string | null
          email: string | null
          event_timestamp: string | null
          event_type: string | null
          full_name: string | null
          ip_address: unknown
          pipeda_30_day_breach: boolean | null
          request_type: string | null
        }
        Relationships: []
      }
      data_access_requests_pending: {
        Row: {
          customer_id: string | null
          days_pending: number | null
          download_generated: boolean | null
          email: string | null
          event_details: Json | null
          full_name: string | null
          ip_address: unknown
          request_id: string | null
          requested_at: string | null
          status: string | null
        }
        Relationships: []
      }
      data_breach_dashboard: {
        Row: {
          assigned_to_email: string | null
          assigned_to_name: string | null
          breach_age: unknown
          breach_id: string | null
          breach_type: string | null
          customers_affected: number | null
          customers_notified: boolean | null
          data_categories_affected: string[] | null
          discovered_at: string | null
          priority: number | null
          privacy_commissioner_notified: boolean | null
          requires_immediate_attention: boolean | null
          response_status: string | null
          severity: string | null
          time_to_containment: unknown
          time_to_remediation: unknown
        }
        Relationships: []
      }
      expiring_insurance_alerts: {
        Row: {
          alert_level: string | null
          contact_email: string | null
          days_until_expiry: number | null
          insurance_expiry_date: string | null
          organization_id: string | null
          organization_name: string | null
        }
        Relationships: []
      }
      insurance_expiry_upcoming: {
        Row: {
          alert_level: string | null
          contact_email: string | null
          contact_phone: string | null
          days_until_expiry: number | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_provider: string | null
          last_alert_sent: string | null
          organization_id: string | null
          organization_name: string | null
        }
        Relationships: []
      }
      marketing_email_audit: {
        Row: {
          audit_id: string | null
          campaign_id: string | null
          clicked: boolean | null
          customer_id: string | null
          email: string | null
          email_subject: string | null
          email_type: string | null
          event_timestamp: string | null
          event_type: string | null
          full_name: string | null
          has_marketing_consent: boolean | null
          opened: boolean | null
        }
        Relationships: []
      }
      mechanic_analytics: {
        Row: {
          active_customers_30d: number | null
          cancelled_sessions: number | null
          chat_sessions: number | null
          completed_sessions: number | null
          diagnostic_sessions: number | null
          first_session_date: string | null
          last_session_date: string | null
          mechanic_id: string | null
          mechanic_name: string | null
          mechanic_since: string | null
          performance_score: number | null
          refreshed_at: string | null
          total_sessions: number | null
          unique_customers: number | null
          video_sessions: number | null
        }
        Relationships: []
      }
      mechanic_compliance_status: {
        Row: {
          compliance_warnings: string[] | null
          contractor_independence_confirmed: boolean | null
          employment_type: string | null
          insurance_compliant: boolean | null
          mechanic_id: string | null
          name: string | null
          overall_compliant: boolean | null
          tax_compliant: boolean | null
        }
        Insert: {
          compliance_warnings?: never
          contractor_independence_confirmed?: never
          employment_type?: string | null
          insurance_compliant?: never
          mechanic_id?: string | null
          name?: string | null
          overall_compliant?: never
          tax_compliant?: never
        }
        Update: {
          compliance_warnings?: never
          contractor_independence_confirmed?: never
          employment_type?: string | null
          insurance_compliant?: never
          mechanic_id?: string | null
          name?: string | null
          overall_compliant?: never
          tax_compliant?: never
        }
        Relationships: []
      }
      mechanic_contractor_compliance: {
        Row: {
          affiliated_workshops: string[] | null
          contractor_independence_status: string | null
          employment_type: string | null
          insurance_compliance_status: string | null
          mechanic_id: string | null
          mechanic_name: string | null
          overall_compliance_status: string | null
          t4a_compliance_status: string | null
          t4a_issued_years: number[] | null
          tax_compliance_status: string | null
          workshop_count: number | null
        }
        Relationships: []
      }
      mechanic_earnings_summary: {
        Row: {
          first_earning_date: string | null
          last_earning_date: string | null
          mechanic_email: string | null
          mechanic_id: string | null
          mechanic_name: string | null
          paid_out_cents: number | null
          pending_payout_cents: number | null
          total_gross_cents: number | null
          total_net_cents: number | null
          total_platform_fee_cents: number | null
          total_sessions: number | null
          total_workshop_fee_cents: number | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      mechanic_referral_summary: {
        Row: {
          avg_commission: number | null
          avg_referral_rate_percent: number | null
          first_referral_date: string | null
          last_referral_date: string | null
          mechanic_id: string | null
          paid_referrals: number | null
          pending_earnings: number | null
          pending_referrals: number | null
          total_earned: number | null
          total_paid: number | null
          total_referrals: number | null
          user_id: string | null
        }
        Relationships: []
      }
      ocpa_quote_compliance_status: {
        Row: {
          compliance_status: string | null
          customer_accepted: boolean | null
          customer_id: string | null
          diagnostic_session_id: string | null
          has_itemized_breakdown: boolean | null
          has_warranty_disclosure: boolean | null
          ocpa_violation_work_without_acceptance: boolean | null
          quote_created_at: string | null
          quote_id: string | null
          work_authorized: boolean | null
          work_started_on_expired_quote: boolean | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "repair_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_diagnostic_session_id_fkey"
            columns: ["diagnostic_session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "repair_quotes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      outdated_consent_versions: {
        Row: {
          consent_type: string | null
          consent_version: string | null
          current_version: string | null
          customer_id: string | null
          email: string | null
          full_name: string | null
          granted_at: string | null
          needs_update: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_account_deletions: {
        Row: {
          active_sessions_count: number | null
          customer_id: string | null
          deletion_id: string | null
          deletion_reason: string | null
          email: string | null
          full_anonymization_date: string | null
          full_name: string | null
          quotes_count: number | null
          requested_at: string | null
          sessions_count: number | null
          status: string | null
          vehicles_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_insurance_verifications: {
        Row: {
          certificate_url: string | null
          coverage_amount: number | null
          days_pending: number | null
          effective_date: string | null
          expiry_date: string | null
          organization_id: string | null
          organization_name: string | null
          provider: string | null
          uploaded_at: string | null
          uploaded_by_email: string | null
          uploaded_by_name: string | null
          verification_id: string | null
          verification_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "insurance_verification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      platform_analytics: {
        Row: {
          active_mechanics: number | null
          cancelled_sessions: number | null
          chat_sessions: number | null
          completed_sessions: number | null
          date: string | null
          diagnostic_sessions: number | null
          new_customers: number | null
          refreshed_at: string | null
          total_sessions: number | null
          unique_customers: number | null
          video_sessions: number | null
        }
        Relationships: []
      }
      platform_compliance_summary: {
        Row: {
          avg_warranty_claim_rate: number | null
          avg_warranty_satisfaction_rate: number | null
          compliant_workshops: number | null
          non_compliant_workshops: number | null
          platform_avg_compliance_score: number | null
          platform_quote_compliance_rate: number | null
          total_compliant_quotes: number | null
          total_critical_alerts: number | null
          total_non_compliant_quotes: number | null
          total_platform_quotes: number | null
          total_unresolved_alerts: number | null
          total_variance_requests: number | null
          total_variance_violations: number | null
          total_warning_alerts: number | null
          total_warranty_claims: number | null
          total_workshops: number | null
          workshops_gst_hst_registered: number | null
          workshops_insurance_expiring_soon: number | null
          workshops_with_business_number: number | null
          workshops_with_expired_insurance: number | null
          workshops_with_valid_insurance: number | null
          workshops_with_wsib: number | null
          workshops_wsib_expired: number | null
        }
        Relationships: []
      }
      privacy_consent_audit: {
        Row: {
          audit_id: string | null
          consent_method: string | null
          consent_type: string | null
          consent_version: string | null
          customer_id: string | null
          email: string | null
          event_timestamp: string | null
          event_type: string | null
          full_name: string | null
          ip_address: unknown
          legal_basis: string | null
        }
        Relationships: []
      }
      quote_variance_compliance_status: {
        Row: {
          compliance_status: string | null
          customer_id: string | null
          customer_response_at: string | null
          exceeds_10_percent: boolean | null
          hours_since_request: number | null
          ocpa_compliant: boolean | null
          original_quote_id: string | null
          original_total_cost: number | null
          revised_total_cost: number | null
          status: string | null
          variance_amount: number | null
          variance_percent: number | null
          variance_reason: string | null
          variance_request_id: string | null
          variance_requested_at: string | null
          work_can_proceed: boolean | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "ocpa_quote_compliance_status"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_original_quote_id_fkey"
            columns: ["original_quote_id"]
            isOneToOne: false
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "quote_variance_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      rfq_marketplace_analytics: {
        Row: {
          avg_bids_per_rfq: number | null
          avg_hours_to_acceptance: number | null
          avg_workshop_views_per_rfq: number | null
          date: string | null
          rfqs_converted_to_repair: number | null
          rfqs_expired: number | null
          rfqs_with_accepted_bid: number | null
          total_rfqs: number | null
        }
        Relationships: []
      }
      scheduled_anonymizations: {
        Row: {
          anonymization_steps_completed: number | null
          anonymization_steps_pending: number | null
          customer_id: string | null
          days_until_anonymization: number | null
          deletion_processed_at: string | null
          full_anonymization_date: string | null
          retention_schedule: Json | null
        }
        Insert: {
          anonymization_steps_completed?: never
          anonymization_steps_pending?: never
          customer_id?: string | null
          days_until_anonymization?: never
          deletion_processed_at?: string | null
          full_anonymization_date?: string | null
          retention_schedule?: Json | null
        }
        Update: {
          anonymization_steps_completed?: never
          anonymization_steps_pending?: never
          customer_id?: string | null
          days_until_anonymization?: never
          deletion_processed_at?: string | null
          full_anonymization_date?: string | null
          retention_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_consent_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mechanic_analytics"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "account_deletion_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_intake_history: {
        Row: {
          city: string | null
          concern: string | null
          current_mileage: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          intake_created_at: string | null
          intake_files: Json | null
          intake_id: string | null
          intake_odometer: string | null
          intake_plan: string | null
          is_primary: boolean | null
          make: string | null
          model: string | null
          nickname: string | null
          owner_id: string | null
          plate: string | null
          vehicle_id: string | null
          vin: string | null
          year: string | null
        }
        Relationships: []
      }
      vehicle_service_history: {
        Row: {
          concern: string | null
          current_mileage: string | null
          intake_plan: string | null
          is_follow_up: boolean | null
          is_primary: boolean | null
          make: string | null
          mechanic_id: string | null
          mechanic_name: string | null
          model: string | null
          nickname: string | null
          notes: string | null
          owner_id: string | null
          parent_session_id: string | null
          plate: string | null
          record_date: string | null
          record_id: string | null
          record_type: string | null
          request_type: string | null
          service_type: string | null
          status: string | null
          vehicle_id: string | null
          vin: string | null
          year: string | null
        }
        Relationships: []
      }
      vehicle_session_history: {
        Row: {
          accepted_at: string | null
          current_mileage: string | null
          customer_city: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          follow_up_type: string | null
          is_follow_up: boolean | null
          is_primary: boolean | null
          make: string | null
          mechanic_id: string | null
          mechanic_name: string | null
          model: string | null
          nickname: string | null
          owner_id: string | null
          parent_session_id: string | null
          plan_code: string | null
          plate: string | null
          request_type: string | null
          routing_type: string | null
          session_created_at: string | null
          session_request_id: string | null
          session_status: string | null
          session_type: string | null
          vehicle_id: string | null
          vin: string | null
          year: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_compliance_status"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_contractor_compliance"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_referral_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_agreement_status: {
        Row: {
          agreement_id: string | null
          agreement_status: string | null
          agreement_version: string | null
          business_number: string | null
          business_registration_verified: boolean | null
          days_until_insurance_expiry: number | null
          gst_hst_number: string | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_provider: string | null
          insurance_status: string | null
          insurance_verified: boolean | null
          is_compliant: boolean | null
          organization_id: string | null
          organization_name: string | null
          organization_type: string | null
          signed_at: string | null
          signed_by_email: string | null
          signed_by_name: string | null
          wsib_account_number: string | null
          wsib_required: boolean | null
          wsib_verified: boolean | null
        }
        Relationships: []
      }
      workshop_bidding_analytics: {
        Row: {
          avg_bid_amount: number | null
          bids_lost: number | null
          bids_won: number | null
          total_bids_submitted: number | null
          total_won_value: number | null
          win_rate_percent: number | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: []
      }
      workshop_compliance_dashboard: {
        Row: {
          approved_variance_requests: number | null
          compliance_rate: number | null
          compliance_score_out_of_100: number | null
          compliant_quotes: number | null
          contractors: number | null
          contractors_with_gst_hst: number | null
          contractors_with_insurance: number | null
          critical_alerts: number | null
          employees: number | null
          gst_hst_registered: boolean | null
          has_business_number: boolean | null
          has_liability_insurance: boolean | null
          has_wsib_registration: boolean | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_status: string | null
          non_compliant_quotes: number | null
          overall_status: string | null
          pending_quotes: number | null
          pending_variance_requests: number | null
          total_mechanics: number | null
          total_quotes: number | null
          total_repairs: number | null
          total_variance_requests: number | null
          total_warranty_claims: number | null
          unresolved_alerts: number | null
          violations: number | null
          warning_alerts: number | null
          warranty_claim_rate: number | null
          warranty_satisfaction_rate: number | null
          workshop_id: string | null
          workshop_joined_date: string | null
          workshop_name: string | null
          workshop_status: string | null
          wsib_clearance_expiry: string | null
          wsib_status: string | null
        }
        Relationships: []
      }
      workshop_compliance_status: {
        Row: {
          business_registration_compliant: boolean | null
          compliance_warnings: string[] | null
          employee_count: number | null
          insurance_compliant: boolean | null
          overall_compliant: boolean | null
          workshop_id: string | null
          workshop_name: string | null
          wsib_compliant: boolean | null
        }
        Insert: {
          business_registration_compliant?: never
          compliance_warnings?: never
          employee_count?: never
          insurance_compliant?: never
          overall_compliant?: never
          workshop_id?: string | null
          workshop_name?: string | null
          wsib_compliant?: never
        }
        Update: {
          business_registration_compliant?: never
          compliance_warnings?: never
          employee_count?: never
          insurance_compliant?: never
          overall_compliant?: never
          workshop_id?: string | null
          workshop_name?: string | null
          wsib_compliant?: never
        }
        Relationships: []
      }
      workshop_compliance_summary: {
        Row: {
          agreement_id: string | null
          agreement_status: string | null
          agreement_version: string | null
          business_number: string | null
          business_registration_verified: boolean | null
          contact_email: string | null
          contact_phone: string | null
          days_until_insurance_expiry: number | null
          gst_hst_number: string | null
          insurance_coverage_amount: number | null
          insurance_expiry_date: string | null
          insurance_provider: string | null
          insurance_status: string | null
          insurance_verified: boolean | null
          is_compliant: boolean | null
          organization_id: string | null
          organization_name: string | null
          organization_type: string | null
          signed_at: string | null
          workshop_status: string | null
        }
        Relationships: []
      }
      workshop_earnings_summary: {
        Row: {
          avg_platform_fee_percentage: number | null
          first_earning_date: string | null
          last_earning_date: string | null
          paid_out_cents: number | null
          pending_payout_cents: number | null
          total_gross_cents: number | null
          total_net_cents: number | null
          total_platform_fee_cents: number | null
          total_sessions: number | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: []
      }
      workshop_mechanics: {
        Row: {
          account_type: string | null
          application_status: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          workshop_email: string | null
          workshop_id: string | null
          workshop_name: string | null
          workshop_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "expiring_insurance_alerts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "insurance_expiry_upcoming"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_agreement_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_bidding_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_dashboard"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_status"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_compliance_summary"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "mechanics_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops_requiring_attention"
            referencedColumns: ["workshop_id"]
          },
        ]
      }
      workshop_session_analytics: {
        Row: {
          avg_session_rating: number | null
          completed_sessions: number | null
          exclusive_requests: number | null
          preferred_requests: number | null
          total_requests_served: number | null
          total_sessions: number | null
          unique_mechanics_served: number | null
          workshop_id: string | null
          workshop_name: string | null
        }
        Relationships: []
      }
      workshops_requiring_attention: {
        Row: {
          attention_reasons: string[] | null
          compliance_score_out_of_100: number | null
          critical_alerts: number | null
          insurance_expiry_date: string | null
          insurance_status: string | null
          overall_status: string | null
          priority_level: string | null
          violations: number | null
          workshop_id: string | null
          workshop_name: string | null
          workshop_status: string | null
          wsib_clearance_expiry: string | null
          wsib_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _end_session_apply_semantics: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_reason: string
          p_session_id: string
        }
        Returns: Json
      }
      accept_workshop_rfq_bid: {
        Args: { p_bid_id: string; p_customer_id: string; p_rfq_id: string }
        Returns: Json
      }
      activate_workshop: {
        Args: { p_activated_by: string; p_organization_id: string }
        Returns: boolean
      }
      allocate_monthly_credits: {
        Args: {
          p_credit_amount: number
          p_is_rollover?: boolean
          p_subscription_id: string
        }
        Returns: boolean
      }
      anonymize_customer_data: {
        Args: { p_customer_id: string; p_data_type: string }
        Returns: boolean
      }
      approve_quote_variance: {
        Args: {
          p_approval_method: string
          p_customer_id: string
          p_customer_notes?: string
          p_ip_address: unknown
          p_user_agent: string
          p_variance_request_id: string
        }
        Returns: boolean
      }
      auto_expire_rfq_marketplace: { Args: never; Returns: number }
      calculate_mechanic_recommendation_score: {
        Args: { p_customer_id: string; p_mechanic_id: string }
        Returns: number
      }
      calculate_partnership_revenue_split: {
        Args: {
          p_quote_id: string
          p_session_id: string
          p_total_amount: number
        }
        Returns: string
      }
      calculate_referral_commission: {
        Args: { p_bid_amount: number; p_referral_rate?: number }
        Returns: number
      }
      calculate_revenue_split: {
        Args: {
          p_gross_amount_cents: number
          p_mechanic_id?: string
          p_workshop_id: string
        }
        Returns: {
          mechanic_net_cents: number
          platform_fee_cents: number
          platform_fee_percentage: number
          split_type: string
          workshop_fee_cents: number
          workshop_net_cents: number
        }[]
      }
      calculate_session_expiry: {
        Args: { p_session_id: string }
        Returns: string
      }
      can_create_follow_up: {
        Args: { p_customer_id: string; p_parent_session_id: string }
        Returns: boolean
      }
      can_mechanic_accept_assignment: {
        Args: { p_assignment_id: string; p_mechanic_id: string }
        Returns: boolean
      }
      can_proceed_with_cost_increase: {
        Args: { p_original_quote_id: string; p_revised_cost: number }
        Returns: boolean
      }
      check_customer_consent: {
        Args: { p_consent_type: string; p_customer_id: string }
        Returns: boolean
      }
      check_workshop_agreement_compliance: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      claim_session_request: {
        Args: { p_mechanic_id: string; p_request_id: string }
        Returns: Json
      }
      cleanup_customer_no_shows: {
        Args: never
        Returns: {
          action: string
          customer_id: string
          elapsed_minutes: number
          mechanic_id: string
          request_id: string
        }[]
      }
      cleanup_mechanic_no_shows: {
        Args: never
        Returns: {
          action: string
          customer_id: string
          elapsed_minutes: number
          mechanic_id: string
          request_id: string
          session_id: string
        }[]
      }
      cleanup_stuck_live_sessions: {
        Args: never
        Returns: {
          action: string
          customer_id: string
          elapsed_hours: number
          mechanic_id: string
          session_id: string
          status: string
        }[]
      }
      create_follow_up_request: {
        Args: {
          p_customer_id: string
          p_description: string
          p_follow_up_type: string
          p_metadata?: Json
          p_parent_session_id: string
        }
        Returns: string
      }
      create_upsell_recommendation: {
        Args: {
          p_customer_id: string
          p_metadata?: Json
          p_price_cents?: number
          p_recommendation_type: string
          p_service_description?: string
          p_service_title: string
          p_session_id: string
        }
        Returns: string
      }
      decline_quote_variance: {
        Args: {
          p_customer_id: string
          p_customer_notes?: string
          p_variance_request_id: string
        }
        Returns: boolean
      }
      deduct_session_credits: {
        Args: {
          p_credit_cost: number
          p_customer_id: string
          p_is_specialist: boolean
          p_session_id: string
          p_session_type: string
        }
        Returns: boolean
      }
      end_session_with_semantics:
        | {
            Args: {
              p_actor_id: string
              p_actor_role?: string
              p_reason?: string
              p_session_id: string
            }
            Returns: {
              duration_seconds: number
              final_status: string
              message: string
              started: boolean
            }[]
          }
        | {
            Args: {
              p_actor_role: string
              p_reason: string
              p_session_id: string
            }
            Returns: Json
          }
      expire_old_invite_codes: { Args: never; Returns: undefined }
      expire_old_session_requests: {
        Args: never
        Returns: {
          expired_count: number
          expired_request_ids: string[]
        }[]
      }
      expire_old_waitlist_entries: { Args: never; Returns: undefined }
      expire_orphaned_sessions: {
        Args: never
        Returns: {
          expired_count: number
        }[]
      }
      file_warranty_claim: {
        Args: {
          p_claim_type: string
          p_customer_id: string
          p_issue_description: string
          p_issue_discovered_date: string
          p_issue_photos?: Json
          p_quote_id: string
        }
        Returns: string
      }
      find_matching_workshops: {
        Args: {
          p_customer_city: string
          p_service_type: string
          p_urgency: string
        }
        Returns: {
          capacity_score: number
          distance_score: number
          rating_score: number
          total_score: number
          workshop_id: string
          workshop_name: string
        }[]
      }
      find_workshops_for_rfq: {
        Args: { p_rfq_id: string }
        Returns: {
          can_bid: boolean
          distance_km: number
          match_score: number
          workshop_city: string
          workshop_id: string
          workshop_name: string
          workshop_rating: number
        }[]
      }
      generate_organization_slug: {
        Args: { org_name: string }
        Returns: string
      }
      generate_vehicle_recommendations: {
        Args: { p_vehicle_id: string }
        Returns: number
      }
      get_active_repair_jobs: {
        Args: { p_customer_id: string }
        Returns: {
          days_remaining: number
          description: string
          estimated_completion_date: string
          job_id: string
          last_update: string
          last_update_at: string
          status: string
          workshop_name: string
        }[]
      }
      get_active_session_for_customer: {
        Args: { p_customer_id: string }
        Returns: {
          created_at: string
          session_id: string
          session_status: string
          session_type: string
        }[]
      }
      get_authenticated_mechanic_id: { Args: never; Returns: string }
      get_available_workshop_mechanics: {
        Args: { workshop_uuid: string }
        Returns: {
          email: string
          mechanic_id: string
          name: string
          phone: string
        }[]
      }
      get_consent_statistics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          consent_type: string
          granted_count: number
          net_change: number
          opt_in_rate: number
          withdrawn_count: number
        }[]
      }
      get_credit_cost: {
        Args: { p_is_specialist?: boolean; p_session_type: string }
        Returns: number
      }
      get_current_mechanic: {
        Args: never
        Returns: {
          email: string
          id: string
          name: string
          stripe_account_id: string
          stripe_payouts_enabled: boolean
          user_id: string
        }[]
      }
      get_current_mechanic_referral_rate: { Args: never; Returns: number }
      get_current_workshop_escalation_rate: { Args: never; Returns: number }
      get_customer_credit_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_favorite_mechanics: {
        Args: { p_customer_id: string }
        Returns: {
          avg_rating: number
          last_session_date: string
          mechanic_email: string
          mechanic_id: string
          mechanic_name: string
          specialties: string[]
          total_sessions: number
        }[]
      }
      get_customer_offers: {
        Args: { p_customer_id: string; p_status?: string }
        Returns: {
          created_at: string
          offer_id: string
          price_total: number
          rfq_id: string
          source: string
          status: string
          workshop_name: string
        }[]
      }
      get_customer_session_trend: {
        Args: { p_customer_id: string }
        Returns: {
          completed_count: number
          month: string
          session_count: number
        }[]
      }
      get_mechanic_activity_trend: {
        Args: { p_mechanic_id: string }
        Returns: {
          completed_count: number
          month: string
          session_count: number
          unique_customers: number
        }[]
      }
      get_mechanic_referral_fee: {
        Args: { p_mechanic_id: string }
        Returns: number
      }
      get_mechanic_type: { Args: { p_mechanic_id: string }; Returns: string }
      get_mechanics_for_routing: {
        Args: { p_routing_type?: string; p_workshop_id?: string }
        Returns: {
          completed_sessions: number
          email: string
          full_name: string
          is_available: boolean
          mechanic_id: string
          phone: string
          priority_score: number
          rating: number
          workshop_id: string
          workshop_name: string
        }[]
      }
      get_platform_kpis: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          active_mechanics: number
          completed_sessions: number
          completion_rate: number
          new_customers: number
          total_customers: number
          total_sessions: number
        }[]
      }
      get_privacy_compliance_score: { Args: never; Returns: Json }
      get_session_split_percentages: {
        Args: never
        Returns: {
          mechanic_percent: number
          platform_percent: number
        }[]
      }
      get_user_org_role: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: string
      }
      get_workshop_directory: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          available_mechanics: number
          avg_rating: number
          created_at: string
          total_mechanics: number
          total_sessions: number
          workshop_email: string
          workshop_id: string
          workshop_name: string
          workshop_status: string
        }[]
      }
      get_workshop_quote_platform_fee: {
        Args: { p_workshop_id: string }
        Returns: number
      }
      grant_customer_consent: {
        Args: {
          p_consent_method: string
          p_consent_text?: string
          p_consent_type: string
          p_consent_version: string
          p_customer_id: string
          p_ip_address: unknown
          p_user_agent: string
        }
        Returns: string
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_feature_enabled: { Args: { p_flag_key: string }; Returns: boolean }
      is_org_owner_or_admin: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_session_participant: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_slot_available: {
        Args: {
          p_end_time: string
          p_mechanic_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      is_workshop_open: {
        Args: { p_datetime: string; p_workshop_id: string }
        Returns: boolean
      }
      log_privacy_event: {
        Args: {
          p_customer_id: string
          p_data_categories?: string[]
          p_event_details?: Json
          p_event_type: string
          p_ip_address: unknown
          p_legal_basis?: string
          p_performed_by: string
          p_performed_by_type: string
          p_user_agent: string
        }
        Returns: string
      }
      process_account_deletion: {
        Args: { p_deletion_id: string }
        Returns: boolean
      }
      record_quote_acceptance: {
        Args: {
          p_acceptance_method: string
          p_acknowledged_10_percent: boolean
          p_acknowledged_warranty: boolean
          p_confirmed_labor: boolean
          p_confirmed_parts: boolean
          p_customer_id: string
          p_ip_address: unknown
          p_quote_id: string
          p_user_agent: string
        }
        Returns: string
      }
      record_session_earnings: {
        Args: {
          p_amount_cents: number
          p_payment_intent_id: string
          p_session_id: string
        }
        Returns: undefined
      }
      refresh_all_analytics: { Args: never; Returns: undefined }
      refresh_compliance_scores: {
        Args: never
        Returns: {
          new_score: number
          previous_score: number
          score_change: number
          workshop_id: string
          workshop_name: string
        }[]
      }
      refund_session_credits: {
        Args: {
          p_credit_amount: number
          p_customer_id: string
          p_session_id: string
        }
        Returns: boolean
      }
      report_data_breach: {
        Args: {
          p_breach_type: string
          p_customers_affected: number
          p_data_categories: string[]
          p_discovered_by: string
          p_discovery_method: string
          p_estimated_records: number
          p_severity: string
        }
        Returns: string
      }
      request_account_deletion: {
        Args: {
          p_customer_id: string
          p_deletion_reason: string
          p_ip_address: unknown
          p_user_agent: string
        }
        Returns: string
      }
      reset_daily_micro_minutes: { Args: never; Returns: undefined }
      run_scheduled_cleanup: {
        Args: never
        Returns: {
          affected_count: number
          cleanup_type: string
          run_at: string
        }[]
      }
      session_clock_get: {
        Args: { p_session_id: string }
        Returns: {
          duration_minutes: number
          is_paused: boolean
          last_state_change_at: string
          server_now: string
          session_id: string
          started_at: string
          total_paused_ms: number
        }[]
      }
      session_clock_pause: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: {
          is_paused: boolean
          last_state_change_at: string
          message: string
          success: boolean
          total_paused_ms: number
        }[]
      }
      session_clock_resume: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: {
          is_paused: boolean
          last_state_change_at: string
          message: string
          success: boolean
          total_paused_ms: number
        }[]
      }
      sign_workshop_agreement: {
        Args: {
          p_agreement_type: string
          p_agreement_version: string
          p_electronic_signature: string
          p_ip_address: unknown
          p_organization_id: string
          p_sections_accepted: Json
          p_signed_by: string
          p_user_agent: string
        }
        Returns: string
      }
      suspend_workshop: {
        Args: {
          p_organization_id: string
          p_reason: string
          p_suspended_by: string
        }
        Returns: boolean
      }
      track_crm_interaction: {
        Args: {
          p_customer_id: string
          p_interaction_type: string
          p_metadata?: Json
          p_session_id?: string
        }
        Returns: string
      }
      upload_insurance_certificate: {
        Args: {
          p_certificate_url: string
          p_coverage_amount: number
          p_effective_date: string
          p_expiry_date: string
          p_ip_address: unknown
          p_organization_id: string
          p_policy_number: string
          p_provider: string
          p_uploaded_by: string
        }
        Returns: string
      }
      user_has_org_role: {
        Args: { p_organization_id: string; p_role: string; p_user_id: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      user_organizations: {
        Args: { user_id: string }
        Returns: {
          organization_id: string
        }[]
      }
      validate_warranty_claim: {
        Args: { p_claim_id: string }
        Returns: boolean
      }
      verify_insurance_certificate: {
        Args: {
          p_approved: boolean
          p_log_id: string
          p_rejection_reason?: string
          p_verified_by: string
        }
        Returns: boolean
      }
      withdraw_customer_consent: {
        Args: {
          p_consent_type: string
          p_customer_id: string
          p_ip_address: unknown
          p_withdrawal_method?: string
          p_withdrawal_reason?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      invite_status: "pending" | "consumed" | "expired" | "revoked"
      security_event_type:
        | "file_type_mismatch"
        | "file_size_exceeded"
        | "malware_detected"
        | "malware_scan_failed"
        | "unauthorized_access"
        | "token_expired"
        | "invite_code_invalid"
        | "xss_attempt"
      session_participant_role: "customer" | "mechanic"
      session_type: "chat" | "video" | "diagnostic"
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
    Enums: {
      invite_status: ["pending", "consumed", "expired", "revoked"],
      security_event_type: [
        "file_type_mismatch",
        "file_size_exceeded",
        "malware_detected",
        "malware_scan_failed",
        "unauthorized_access",
        "token_expired",
        "invite_code_invalid",
        "xss_attempt",
      ],
      session_participant_role: ["customer", "mechanic"],
      session_type: ["chat", "video", "diagnostic"],
    },
  },
} as const
