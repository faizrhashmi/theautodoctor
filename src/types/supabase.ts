import type { SessionStatus } from '@/types/session'

// ============================================================================
// CUSTOM TYPES (maintained manually)
// ============================================================================

export type IntakeStatus =
  | 'new'
  | 'pending'
  | 'in_review'
  | 'in_progress'
  | 'awaiting_customer'
  | 'resolved'
  | 'cancelled'

export type SessionType = 'chat' | 'video' | 'diagnostic'
export type SessionParticipantRole = 'customer' | 'mechanic'

// ============================================================================
// AUTO-GENERATED TYPES FROM DATABASE
// Generated with: npx supabase gen types typescript --linked
// Last synced: 2025-10-28
// ============================================================================

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
            foreignKeyName: "bay_bookings_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "partnership_agreements"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          sender_id: string
          session_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          sender_id?: string
          session_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          vin?: string | null
          year?: string | null
        }
        Relationships: []
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "mechanic_earnings_summary"
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
      mechanic_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_activity: string | null
          mechanic_id: string
          refresh_expires_at: string | null
          refresh_token: string | null
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_activity?: string | null
          mechanic_id: string
          refresh_expires_at?: string | null
          refresh_token?: string | null
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_activity?: string | null
          mechanic_id?: string
          refresh_expires_at?: string | null
          refresh_token?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "mechanic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanic_sessions_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
      mechanics: {
        Row: {
          account_type: string | null
          application_draft: Json | null
          application_status: string | null
          application_submitted_at: string | null
          approval_notes: string | null
          approved_at: string | null
          auto_approved: boolean | null
          background_check_status: string | null
          banking_info_completed: boolean | null
          brand_specializations: string[] | null
          business_license_document: string | null
          business_license_number: string | null
          can_accept_sessions: boolean | null
          can_perform_physical_work: boolean | null
          certification_documents: string[] | null
          /** Primary certification type: red_seal | provincial | ase | cpa_quebec | manufacturer | other */
          certification_type: 'red_seal' | 'provincial' | 'ase' | 'cpa_quebec' | 'manufacturer' | 'other' | null
          /** Certification/license number (e.g., RS-ON-12345, ASE A1) */
          certification_number: string | null
          /** Issuing authority (e.g., "Red Seal Program", "Ontario College of Trades") */
          certification_authority: string | null
          /** Province/state of certification (e.g., "ON", "QC", "BC", "CA" for interprovincial) */
          certification_region: string | null
          /** Expiry date of primary certification (NULL if no expiry) */
          certification_expiry_date: string | null
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
          email: string
          full_address: string | null
          id: string
          insurance_document: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          invite_accepted_at: string | null
          invited_by: string | null
          is_available: boolean | null
          is_brand_specialist: boolean | null
          last_clock_in: string | null
          last_clock_out: string | null
          last_micro_reset_date: string | null
          last_updated: string | null
          liability_insurance: boolean | null
          mobile_license_expiry: string | null
          mobile_license_number: string | null
          mobile_license_province: string | null
          name: string | null
          other_certifications: Json | null
          participation_mode: string | null
          partnership_terms: Json | null
          partnership_type: string | null
          password_hash: string
          phone: string | null
          postal_code: string | null
          prefers_physical: boolean | null
          prefers_virtual: boolean | null
          profile_completion_score: number | null
          province: string | null
          rating: number | null
          /** @deprecated Use certification_type instead */
          red_seal_certified: boolean | null
          /** @deprecated Use certification_expiry_date instead */
          red_seal_expiry_date: string | null
          /** @deprecated Use certification_number instead */
          red_seal_number: string | null
          /** @deprecated Use certification_region instead */
          red_seal_province: string | null
          requires_sin_collection: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_keywords: string[] | null
          service_tier: string | null
          shop_address: string | null
          shop_affiliation: string | null
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
          timezone: string | null
          workshop_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          account_type?: string | null
          application_draft?: Json | null
          application_status?: string | null
          application_submitted_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          background_check_status?: string | null
          banking_info_completed?: boolean | null
          brand_specializations?: string[] | null
          business_license_document?: string | null
          business_license_number?: string | null
          can_accept_sessions?: boolean | null
          can_perform_physical_work?: boolean | null
          certification_documents?: string[] | null
          certification_type?: 'red_seal' | 'provincial' | 'ase' | 'cpa_quebec' | 'manufacturer' | 'other' | null
          certification_number?: string | null
          certification_authority?: string | null
          certification_region?: string | null
          certification_expiry_date?: string | null
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
          email: string
          full_address?: string | null
          id?: string
          insurance_document?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          invite_accepted_at?: string | null
          invited_by?: string | null
          is_available?: boolean | null
          is_brand_specialist?: boolean | null
          last_clock_in?: string | null
          last_clock_out?: string | null
          last_micro_reset_date?: string | null
          last_updated?: string | null
          liability_insurance?: boolean | null
          mobile_license_expiry?: string | null
          mobile_license_number?: string | null
          mobile_license_province?: string | null
          name?: string | null
          other_certifications?: Json | null
          participation_mode?: string | null
          partnership_terms?: Json | null
          partnership_type?: string | null
          password_hash: string
          phone?: string | null
          postal_code?: string | null
          prefers_physical?: boolean | null
          prefers_virtual?: boolean | null
          profile_completion_score?: number | null
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
          shop_address?: string | null
          shop_affiliation?: string | null
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
          timezone?: string | null
          workshop_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          account_type?: string | null
          application_draft?: Json | null
          application_status?: string | null
          application_submitted_at?: string | null
          approval_notes?: string | null
          approved_at?: string | null
          auto_approved?: boolean | null
          background_check_status?: string | null
          banking_info_completed?: boolean | null
          brand_specializations?: string[] | null
          business_license_document?: string | null
          business_license_number?: string | null
          can_accept_sessions?: boolean | null
          can_perform_physical_work?: boolean | null
          certification_documents?: string[] | null
          certification_type?: 'red_seal' | 'provincial' | 'ase' | 'cpa_quebec' | 'manufacturer' | 'other' | null
          certification_number?: string | null
          certification_authority?: string | null
          certification_region?: string | null
          certification_expiry_date?: string | null
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
          email?: string
          full_address?: string | null
          id?: string
          insurance_document?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          invite_accepted_at?: string | null
          invited_by?: string | null
          is_available?: boolean | null
          is_brand_specialist?: boolean | null
          last_clock_in?: string | null
          last_clock_out?: string | null
          last_micro_reset_date?: string | null
          last_updated?: string | null
          liability_insurance?: boolean | null
          mobile_license_expiry?: string | null
          mobile_license_number?: string | null
          mobile_license_province?: string | null
          name?: string | null
          other_certifications?: Json | null
          participation_mode?: string | null
          partnership_terms?: Json | null
          partnership_type?: string | null
          password_hash?: string
          phone?: string | null
          postal_code?: string | null
          prefers_physical?: boolean | null
          prefers_virtual?: boolean | null
          profile_completion_score?: number | null
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
          shop_address?: string | null
          shop_affiliation?: string | null
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
          timezone?: string | null
          workshop_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        ]
      }
      organizations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_registration_number: string | null
          city: string | null
          commission_rate: number | null
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
          logo_url: string | null
          mechanic_capacity: number | null
          metadata: Json | null
          name: string
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
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_registration_number?: string | null
          city?: string | null
          commission_rate?: number | null
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
          logo_url?: string | null
          mechanic_capacity?: number | null
          metadata?: Json | null
          name: string
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
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_registration_number?: string | null
          city?: string | null
          commission_rate?: number | null
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
          logo_url?: string | null
          mechanic_capacity?: number | null
          metadata?: Json | null
          name?: string
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
        }
        Relationships: []
      }
      partnership_agreements: {
        Row: {
          agreement_document_url: string | null
          agreement_type: string
          application_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          mechanic_id: string
          mechanic_signature: string | null
          mechanic_signed_at: string | null
          program_id: string
          start_date: string
          terminated_at: string | null
          terminated_by: string | null
          termination_reason: string | null
          terms: Json
          updated_at: string | null
          workshop_id: string
          workshop_signature: string | null
          workshop_signed_at: string | null
          workshop_signed_by: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_type: string
          application_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mechanic_id: string
          mechanic_signature?: string | null
          mechanic_signed_at?: string | null
          program_id: string
          start_date: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          terms: Json
          updated_at?: string | null
          workshop_id: string
          workshop_signature?: string | null
          workshop_signed_at?: string | null
          workshop_signed_by?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_type?: string
          application_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          mechanic_id?: string
          mechanic_signature?: string | null
          mechanic_signed_at?: string | null
          program_id?: string
          start_date?: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          terms?: Json
          updated_at?: string | null
          workshop_id?: string
          workshop_signature?: string | null
          workshop_signed_at?: string | null
          workshop_signed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_agreements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partnership_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_agreements_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workshop_partnership_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_agreements_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_agreements_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_agreements_workshop_signed_by_fkey"
            columns: ["workshop_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_applications: {
        Row: {
          approved_terms: Json | null
          created_at: string | null
          expected_days_per_month: number | null
          expires_at: string | null
          id: string
          mechanic_id: string
          message: string | null
          program_id: string
          proposed_start_date: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specializations: string[] | null
          status: string | null
          tools_owned: string[] | null
          updated_at: string | null
          workshop_id: string
          workshop_response: string | null
          years_experience: number | null
        }
        Insert: {
          approved_terms?: Json | null
          created_at?: string | null
          expected_days_per_month?: number | null
          expires_at?: string | null
          id?: string
          mechanic_id: string
          message?: string | null
          program_id: string
          proposed_start_date?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specializations?: string[] | null
          status?: string | null
          tools_owned?: string[] | null
          updated_at?: string | null
          workshop_id: string
          workshop_response?: string | null
          years_experience?: number | null
        }
        Update: {
          approved_terms?: Json | null
          created_at?: string | null
          expected_days_per_month?: number | null
          expires_at?: string | null
          id?: string
          mechanic_id?: string
          message?: string | null
          program_id?: string
          proposed_start_date?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specializations?: string[] | null
          status?: string | null
          tools_owned?: string[] | null
          updated_at?: string | null
          workshop_id?: string
          workshop_response?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_applications_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanic_earnings_summary"
            referencedColumns: ["mechanic_id"]
          },
          {
            foreignKeyName: "partnership_applications_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_applications_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: false
            referencedRelation: "workshop_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workshop_partnership_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_applications_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_applications_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "partnership_applications_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
            referencedColumns: ["workshop_id"]
          },
        ]
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
            foreignKeyName: "partnership_revenue_splits_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "partnership_agreements"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      profiles: {
        Row: {
          account_status: string | null
          account_type: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          communication_preferences: Json | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
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
          organization_id: string | null
          phone: string | null
          postal_zip_code: string | null
          preferred_language: string | null
          preferred_plan: string | null
          profile_completed: boolean | null
          profile_completed_at: string | null
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
          city?: string | null
          communication_preferences?: Json | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
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
          organization_id?: string | null
          phone?: string | null
          postal_zip_code?: string | null
          preferred_language?: string | null
          preferred_plan?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
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
          city?: string | null
          communication_preferences?: Json | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
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
          organization_id?: string | null
          phone?: string | null
          postal_zip_code?: string | null
          preferred_language?: string | null
          preferred_plan?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
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
        ]
      }
      repair_quotes: {
        Row: {
          created_at: string | null
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
          quoting_user_id: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          updated_at: string | null
          vehicle_id: string | null
          viewed_at: string | null
          warranty_days: number | null
          warranty_expires_at: string | null
          work_completed_at: string | null
          work_started_at: string | null
          workshop_id: string | null
        }
        Insert: {
          created_at?: string | null
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
          quoting_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          updated_at?: string | null
          vehicle_id?: string | null
          viewed_at?: string | null
          warranty_days?: number | null
          warranty_expires_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          created_at?: string | null
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
          quoting_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          updated_at?: string | null
          vehicle_id?: string | null
          viewed_at?: string | null
          warranty_days?: number | null
          warranty_expires_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          created_at: string
          description: string
          display_order: number
          duration_minutes: number
          features: Json
          id: string
          is_active: boolean
          name: string
          perks: Json
          plan_category: string | null
          price: number
          recommended_for: string | null
          requires_certification: boolean | null
          restricted_brands: string[] | null
          routing_preference: string | null
          slug: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          duration_minutes: number
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          perks?: Json
          plan_category?: string | null
          price?: number
          recommended_for?: string | null
          requires_certification?: boolean | null
          restricted_brands?: string[] | null
          routing_preference?: string | null
          slug: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          duration_minutes?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          perks?: Json
          plan_category?: string | null
          price?: number
          recommended_for?: string | null
          requires_certification?: boolean | null
          restricted_brands?: string[] | null
          routing_preference?: string | null
          slug?: string
          stripe_price_id?: string | null
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
          file_name: string
          file_size: number
          file_type: string
          file_url: string | null
          id: string
          metadata: Json | null
          session_id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number
          file_type?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          storage_path?: string
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
          expires_at: string | null
          extracted_keywords: string[] | null
          follow_up_type: string | null
          id: string
          is_follow_up: boolean | null
          matching_score: Json | null
          mechanic_id: string | null
          parent_session_id: string | null
          plan_code: string | null
          prefer_local_mechanic: boolean | null
          preferred_workshop_id: string | null
          request_type: string | null
          requested_brand: string | null
          routing_type: string | null
          session_type: string
          status: string
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
          expires_at?: string | null
          extracted_keywords?: string[] | null
          follow_up_type?: string | null
          id?: string
          is_follow_up?: boolean | null
          matching_score?: Json | null
          mechanic_id?: string | null
          parent_session_id?: string | null
          plan_code?: string | null
          prefer_local_mechanic?: boolean | null
          preferred_workshop_id?: string | null
          request_type?: string | null
          requested_brand?: string | null
          routing_type?: string | null
          session_type: string
          status?: string
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
          expires_at?: string | null
          extracted_keywords?: string[] | null
          follow_up_type?: string | null
          id?: string
          is_follow_up?: boolean | null
          matching_score?: Json | null
          mechanic_id?: string | null
          parent_session_id?: string | null
          plan_code?: string | null
          prefer_local_mechanic?: boolean | null
          preferred_workshop_id?: string | null
          request_type?: string | null
          requested_brand?: string | null
          routing_type?: string | null
          session_type?: string
          status?: string
          workshop_id?: string | null
        }
        Relationships: [
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
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_user_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          expires_at: string | null
          id: string
          intake_id: string | null
          is_follow_up: boolean | null
          mechanic_id: string | null
          metadata: Json | null
          parent_session_id: string | null
          plan: string
          preferred_workshop_id: string | null
          rating: number | null
          rating_comment: string | null
          scheduled_end: string | null
          scheduled_for: string | null
          scheduled_start: string | null
          started_at: string | null
          status: string | null
          stripe_session_id: string
          summary_data: Json | null
          summary_submitted_at: string | null
          type: Database["public"]["Enums"]["session_type"] | null
          updated_at: string | null
          workshop_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_user_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          is_follow_up?: boolean | null
          mechanic_id?: string | null
          metadata?: Json | null
          parent_session_id?: string | null
          plan: string
          preferred_workshop_id?: string | null
          rating?: number | null
          rating_comment?: string | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          scheduled_start?: string | null
          started_at?: string | null
          status?: string | null
          stripe_session_id: string
          summary_data?: Json | null
          summary_submitted_at?: string | null
          type?: Database["public"]["Enums"]["session_type"] | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_user_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          is_follow_up?: boolean | null
          mechanic_id?: string | null
          metadata?: Json | null
          parent_session_id?: string | null
          plan?: string
          preferred_workshop_id?: string | null
          rating?: number | null
          rating_comment?: string | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          scheduled_start?: string | null
          started_at?: string | null
          status?: string | null
          stripe_session_id?: string
          summary_data?: Json | null
          summary_submitted_at?: string | null
          type?: Database["public"]["Enums"]["session_type"] | null
          updated_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "waiver_signatures_user_id_fkey"
            columns: ["user_id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          customer_id: string
          declined_at: string | null
          declined_reason: string | null
          diagnosis_summary: string | null
          diagnostic_photos: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id: string
          id: string
          issue_summary: string | null
          mechanic_notes: string | null
          priority: string | null
          quote_created_at: string | null
          quote_id: string | null
          recommended_services: string[] | null
          referral_fee_amount: number | null
          referral_fee_percent: number | null
          referral_paid: boolean | null
          referral_paid_at: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
          vehicle_info: Json | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to_advisor_id?: string | null
          assigned_workshop_id?: string | null
          assignment_method?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_id: string
          declined_at?: string | null
          declined_reason?: string | null
          diagnosis_summary?: string | null
          diagnostic_photos?: Json | null
          diagnostic_session_id: string
          escalating_mechanic_id: string
          id?: string
          issue_summary?: string | null
          mechanic_notes?: string | null
          priority?: string | null
          quote_created_at?: string | null
          quote_id?: string | null
          recommended_services?: string[] | null
          referral_fee_amount?: number | null
          referral_fee_percent?: number | null
          referral_paid?: boolean | null
          referral_paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to_advisor_id?: string | null
          assigned_workshop_id?: string | null
          assignment_method?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_id?: string
          declined_at?: string | null
          declined_reason?: string | null
          diagnosis_summary?: string | null
          diagnostic_photos?: Json | null
          diagnostic_session_id?: string
          escalating_mechanic_id?: string
          id?: string
          issue_summary?: string | null
          mechanic_notes?: string | null
          priority?: string | null
          quote_created_at?: string | null
          quote_id?: string | null
          recommended_services?: string[] | null
          referral_fee_amount?: number | null
          referral_fee_percent?: number | null
          referral_paid?: boolean | null
          referral_paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "repair_quotes"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      workshop_partnership_programs: {
        Row: {
          additional_day_rate: number | null
          available_bays: number | null
          benefits: string[] | null
          created_at: string | null
          current_partners: number | null
          daily_rate: number | null
          description: string | null
          equipment_list: string[] | null
          hourly_rate: number | null
          id: string
          included_days_per_month: number | null
          is_active: boolean | null
          max_partners: number | null
          mechanic_percentage: number | null
          membership_revenue_share_mechanic: number | null
          membership_revenue_share_workshop: number | null
          min_commitment_months: number | null
          monthly_fee: number | null
          program_name: string
          program_type: string
          requirements: string[] | null
          tools_provided: boolean | null
          updated_at: string | null
          workshop_id: string
          workshop_percentage: number | null
        }
        Insert: {
          additional_day_rate?: number | null
          available_bays?: number | null
          benefits?: string[] | null
          created_at?: string | null
          current_partners?: number | null
          daily_rate?: number | null
          description?: string | null
          equipment_list?: string[] | null
          hourly_rate?: number | null
          id?: string
          included_days_per_month?: number | null
          is_active?: boolean | null
          max_partners?: number | null
          mechanic_percentage?: number | null
          membership_revenue_share_mechanic?: number | null
          membership_revenue_share_workshop?: number | null
          min_commitment_months?: number | null
          monthly_fee?: number | null
          program_name: string
          program_type: string
          requirements?: string[] | null
          tools_provided?: boolean | null
          updated_at?: string | null
          workshop_id: string
          workshop_percentage?: number | null
        }
        Update: {
          additional_day_rate?: number | null
          available_bays?: number | null
          benefits?: string[] | null
          created_at?: string | null
          current_partners?: number | null
          daily_rate?: number | null
          description?: string | null
          equipment_list?: string[] | null
          hourly_rate?: number | null
          id?: string
          included_days_per_month?: number | null
          is_active?: boolean | null
          max_partners?: number | null
          mechanic_percentage?: number | null
          membership_revenue_share_mechanic?: number | null
          membership_revenue_share_workshop?: number | null
          min_commitment_months?: number | null
          monthly_fee?: number | null
          program_name?: string
          program_type?: string
          requirements?: string[] | null
          tools_provided?: boolean | null
          updated_at?: string | null
          workshop_id?: string
          workshop_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_partnership_programs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_partnership_programs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_earnings_summary"
            referencedColumns: ["workshop_id"]
          },
          {
            foreignKeyName: "workshop_partnership_programs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop_session_analytics"
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
            referencedRelation: "mechanic_earnings_summary"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        ]
      }
    }
    Views: {
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        ]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
    }
    Functions: {
      calculate_partnership_revenue_split: {
        Args: {
          p_quote_id: string
          p_session_id: string
          p_total_amount: number
        }
        Returns: string
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
      expire_old_session_requests: {
        Args: never
        Returns: {
          expired_count: number
          expired_request_ids: string[]
        }[]
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
      generate_organization_slug: {
        Args: { org_name: string }
        Returns: string
      }
      get_available_workshop_mechanics: {
        Args: { workshop_uuid: string }
        Returns: {
          email: string
          mechanic_id: string
          name: string
          phone: string
        }[]
      }
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
      is_session_participant: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      record_session_earnings: {
        Args: {
          p_amount_cents: number
          p_payment_intent_id: string
          p_session_id: string
        }
        Returns: undefined
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
      track_crm_interaction: {
        Args: {
          p_customer_id: string
          p_interaction_type: string
          p_metadata?: Json
          p_session_id?: string
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
    }
    Enums: {
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
      session_participant_role: ["customer", "mechanic"],
      session_type: ["chat", "video", "diagnostic"],
    },
  },
} as const

// Convenience type exports for common table types
// Note: After running migrations that add vehicle_id to session_requests and intakes,
// regenerate this file with: npx supabase gen types typescript --local > src/types/supabase.ts
export type Vehicle = Tables<'vehicles'>
export type VehicleInsert = TablesInsert<'vehicles'>
export type VehicleUpdate = TablesUpdate<'vehicles'>

export type Intake = Tables<'intakes'>
export type IntakeInsert = TablesInsert<'intakes'>
export type IntakeUpdate = TablesUpdate<'intakes'>

export type SessionRequestDB = Tables<'session_requests'>
export type SessionRequestInsert = TablesInsert<'session_requests'>
export type SessionRequestUpdate = TablesUpdate<'session_requests'>

export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
A new version of Supabase CLI is available: v2.54.10 (currently installed v2.53.6)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
