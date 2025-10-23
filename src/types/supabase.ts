type JsonPrimitive = string | number | boolean | null
export type Json = JsonPrimitive | { [key: string]: Json } | Json[]

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

export type Database = {
  public: {
    Tables: {
      contact_requests: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          reason: string
          subject: string
          message: string
          attachment_path: string | null
          attachment_url: string | null
          status: string
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          reason: string
          subject: string
          message: string
          attachment_path?: string | null
          attachment_url?: string | null
          status?: string
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          reason?: string
          subject?: string
          message?: string
          attachment_path?: string | null
          attachment_url?: string | null
          status?: string
          metadata?: Json
        }
        Relationships: []
      }
      intakes: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          plan: string | null
          status: IntakeStatus | null
          name: string | null
          email: string | null
          phone: string | null
          city: string | null
          vin: string | null
          year: string | null
          make: string | null
          model: string | null
          vehicle_year: number | null
          vehicle_make: string | null
          vehicle_model: string | null
          odometer: string | null
          plate: string | null
          concern: string | null
          details: string | null
          notes: string | null
          plan_details: Json | null
          files: Json | null
          attachments: Json | null
          media_paths: Json | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          plan?: string | null
          status?: IntakeStatus | null
          name?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          vin?: string | null
          year?: string | null
          make?: string | null
          model?: string | null
          vehicle_year?: number | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          odometer?: string | null
          plate?: string | null
          concern?: string | null
          details?: string | null
          notes?: string | null
          plan_details?: Json | null
          files?: Json | null
          attachments?: Json | null
          media_paths?: Json | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          plan?: string | null
          status?: IntakeStatus | null
          name?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          vin?: string | null
          year?: string | null
          make?: string | null
          model?: string | null
          vehicle_year?: number | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          odometer?: string | null
          plate?: string | null
          concern?: string | null
          details?: string | null
          notes?: string | null
          plan_details?: Json | null
          files?: Json | null
          attachments?: Json | null
          media_paths?: Json | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      intake_deletions: {
        Row: {
          id: string
          deleted_at: string
          intake_id: string
          deleted_by: string | null
          deleted_email: string | null
          reason: string | null
          payload: Json | null
        }
        Insert: {
          id?: string
          deleted_at?: string
          intake_id: string
          deleted_by?: string | null
          deleted_email?: string | null
          reason?: string | null
          payload?: Json | null
        }
        Update: {
          id?: string
          deleted_at?: string
          intake_id?: string
          deleted_by?: string | null
          deleted_email?: string | null
          reason?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          plan: string
          type: SessionType
          status: string | null
          stripe_session_id: string
          intake_id: string | null
          customer_user_id: string | null
          mechanic_id: string | null
          metadata: Json
          scheduled_start: string | null
          scheduled_end: string | null
          scheduled_for: string | null
          started_at: string | null
          ended_at: string | null
          duration_minutes: number | null
          waiver_accepted: boolean | null
          waiver_accepted_at: string | null
          waiver_ip_address: string | null
          vehicle_info: Json | null
          session_notes: string | null
          rating: number | null
          review: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          plan: string
          type: SessionType
          status?: string | null
          stripe_session_id: string
          intake_id?: string | null
          customer_user_id?: string | null
          mechanic_id?: string | null
          metadata?: Json
          scheduled_start?: string | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          waiver_accepted?: boolean | null
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
          vehicle_info?: Json | null
          session_notes?: string | null
          rating?: number | null
          review?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          plan?: string
          type?: SessionType
          status?: string | null
          stripe_session_id?: string
          intake_id?: string | null
          customer_user_id?: string | null
          mechanic_id?: string | null
          metadata?: Json
          scheduled_start?: string | null
          scheduled_end?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          waiver_accepted?: boolean | null
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
          vehicle_info?: Json | null
          session_notes?: string | null
          rating?: number | null
          review?: string | null
        }
        Relationships: []
      }
      session_requests: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          customer_id: string
          mechanic_id: string | null
          session_type: SessionType
          plan_code: string
          status: 'pending' | 'accepted' | 'cancelled' | 'unattended' | 'expired'
          customer_name: string | null
          customer_email: string | null
          notes: string | null
          accepted_at: string | null
          notification_sent_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          customer_id: string
          mechanic_id?: string | null
          session_type: SessionType
          plan_code: string
          status?: 'pending' | 'accepted' | 'cancelled' | 'unattended' | 'expired'
          customer_name?: string | null
          customer_email?: string | null
          notes?: string | null
          accepted_at?: string | null
          notification_sent_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          customer_id?: string
          mechanic_id?: string | null
          session_type?: SessionType
          plan_code?: string
          status?: 'pending' | 'accepted' | 'cancelled' | 'unattended' | 'expired'
          customer_name?: string | null
          customer_email?: string | null
          notes?: string | null
          accepted_at?: string | null
          notification_sent_at?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'session_requests_customer_id_fkey'
            columns: ['customer_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_requests_mechanic_id_fkey'
            columns: ['mechanic_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      session_participants: {
        Row: {
          id: string
          created_at: string
          session_id: string
          user_id: string
          role: SessionParticipantRole
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          user_id: string
          role: SessionParticipantRole
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          user_id?: string
          role?: SessionParticipantRole
          metadata?: Json
        }
        Relationships: []
      }
      session_files: {
        Row: {
          id: string
          created_at: string
          session_id: string
          uploaded_by: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          file_url: string | null
          description: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          uploaded_by: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          file_url?: string | null
          description?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          uploaded_by?: string
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          file_url?: string | null
          description?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'session_files_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey'
            columns: ['uploaded_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          created_at: string
          session_id: string
          sender_id: string
          content: string
          attachments: Json
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          sender_id?: string
          content: string
          attachments?: Json
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          sender_id?: string
          content?: string
          attachments?: Json
        }
        Relationships: []
      }
      mechanics: {
        Row: {
          id: string
          created_at: string
          name: string | null
          email: string
          phone: string | null
          password_hash: string
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          stripe_charges_enabled: boolean | null
          stripe_payouts_enabled: boolean | null
          stripe_details_submitted: boolean | null
          // Personal information
          full_address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          country: string | null
          date_of_birth: string | null
          sin_or_business_number: string | null
          // Credentials
          red_seal_certified: boolean | null
          red_seal_number: string | null
          red_seal_province: string | null
          red_seal_expiry_date: string | null
          certification_documents: string[] | null
          other_certifications: Json | null
          years_of_experience: number | null
          specializations: string[] | null
          // Shop information
          shop_affiliation: string | null
          shop_name: string | null
          shop_address: string | null
          business_license_number: string | null
          business_license_document: string | null
          // Insurance and legal
          liability_insurance: boolean | null
          insurance_policy_number: string | null
          insurance_expiry: string | null
          insurance_document: string | null
          criminal_record_check: boolean | null
          crc_date: string | null
          crc_document: string | null
          // Banking
          banking_info_completed: boolean | null
          // Approval workflow
          application_status: string | null
          background_check_status: string | null
          approval_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          application_submitted_at: string | null
          approved_at: string | null
          application_draft: Json | null
          current_step: number | null
          last_updated: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          email: string
          phone?: string | null
          password_hash: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          full_address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string | null
          date_of_birth?: string | null
          sin_or_business_number?: string | null
          red_seal_certified?: boolean | null
          red_seal_number?: string | null
          red_seal_province?: string | null
          red_seal_expiry_date?: string | null
          certification_documents?: string[] | null
          other_certifications?: Json | null
          years_of_experience?: number | null
          specializations?: string[] | null
          shop_affiliation?: string | null
          shop_name?: string | null
          shop_address?: string | null
          business_license_number?: string | null
          business_license_document?: string | null
          liability_insurance?: boolean | null
          insurance_policy_number?: string | null
          insurance_expiry?: string | null
          insurance_document?: string | null
          criminal_record_check?: boolean | null
          crc_date?: string | null
          crc_document?: string | null
          banking_info_completed?: boolean | null
          application_status?: string | null
          background_check_status?: string | null
          approval_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          application_submitted_at?: string | null
          approved_at?: string | null
          application_draft?: Json | null
          current_step?: number | null
          last_updated?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          email?: string
          phone?: string | null
          password_hash?: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          full_address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string | null
          date_of_birth?: string | null
          sin_or_business_number?: string | null
          red_seal_certified?: boolean | null
          red_seal_number?: string | null
          red_seal_province?: string | null
          red_seal_expiry_date?: string | null
          certification_documents?: string[] | null
          other_certifications?: Json | null
          years_of_experience?: number | null
          specializations?: string[] | null
          shop_affiliation?: string | null
          shop_name?: string | null
          shop_address?: string | null
          business_license_number?: string | null
          business_license_document?: string | null
          liability_insurance?: boolean | null
          insurance_policy_number?: string | null
          insurance_expiry?: string | null
          insurance_document?: string | null
          criminal_record_check?: boolean | null
          crc_date?: string | null
          crc_document?: string | null
          banking_info_completed?: boolean | null
          application_status?: string | null
          background_check_status?: string | null
          approval_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          application_submitted_at?: string | null
          approved_at?: string | null
          application_draft?: Json | null
          current_step?: number | null
          last_updated?: string | null
        }
        Relationships: []
      }
      mechanic_documents: {
        Row: {
          id: string
          created_at: string
          mechanic_id: string
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          storage_url: string | null
          description: string | null
          verified: boolean | null
          verified_by: string | null
          verified_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          mechanic_id: string
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          storage_url?: string | null
          description?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          mechanic_id?: string
          document_type?: string
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          storage_url?: string | null
          description?: string | null
          verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'mechanic_documents_mechanic_id_fkey'
            columns: ['mechanic_id']
            referencedRelation: 'mechanics'
            referencedColumns: ['id']
          }
        ]
      }
      mechanic_admin_actions: {
        Row: {
          id: string
          created_at: string
          mechanic_id: string
          admin_id: string
          action_type: string
          notes: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          mechanic_id: string
          admin_id: string
          action_type: string
          notes?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          mechanic_id?: string
          admin_id?: string
          action_type?: string
          notes?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'mechanic_admin_actions_mechanic_id_fkey'
            columns: ['mechanic_id']
            referencedRelation: 'mechanics'
            referencedColumns: ['id']
          }
        ]
      }
      mechanic_availability: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          mechanic_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          mechanic_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          mechanic_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'mechanic_availability_mechanic_id_fkey'
            columns: ['mechanic_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      mechanic_sessions: {
        Row: {
          id: string
          created_at: string
          expires_at: string
          mechanic_id: string
          token: string
        }
        Insert: {
          id?: string
          created_at?: string
          expires_at: string
          mechanic_id: string
          token: string
        }
        Update: {
          id?: string
          created_at?: string
          expires_at?: string
          mechanic_id?: string
          token?: string
        }
        Relationships: []
      }
      waiver_acceptances: {
        Row: {
          id: string
          created_at: string
          user_id: string
          waiver_version: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          waiver_version?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          waiver_version?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          created_at: string
          user_id: string
          make: string
          model: string
          year: string
          vin: string | null
          color: string | null
          mileage: string | null
          plate: string | null
          is_primary: boolean
          nickname: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          make: string
          model: string
          year: string
          vin?: string | null
          color?: string | null
          mileage?: string | null
          plate?: string | null
          is_primary?: boolean
          nickname?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          make?: string
          model?: string
          year?: string
          vin?: string | null
          color?: string | null
          mileage?: string | null
          plate?: string | null
          is_primary?: boolean
          nickname?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: string | null
          vehicle_info: Json | null
          vehicle_hint: string | null
          is_18_plus: boolean
          waiver_accepted: boolean
          waiver_accepted_at: string | null
          waiver_ip_address: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          email_verified: boolean | null
          account_status: string | null
          preferred_plan: string | null
          last_selected_slot: string | null
          date_of_birth: string | null
          metadata: Json | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          stripe_charges_enabled: boolean | null
          stripe_payouts_enabled: boolean | null
          stripe_details_submitted: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          role?: string | null
          vehicle_info?: Json | null
          vehicle_hint?: string | null
          is_18_plus?: boolean
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          email_verified?: boolean | null
          account_status?: string | null
          preferred_plan?: string | null
          last_selected_slot?: string | null
          date_of_birth?: string | null
          metadata?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          role?: string | null
          vehicle_info?: Json | null
          vehicle_hint?: string | null
          is_18_plus?: boolean
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
          waiver_ip_address?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          email_verified?: boolean | null
          account_status?: string | null
          preferred_plan?: string | null
          last_selected_slot?: string | null
          date_of_birth?: string | null
          metadata?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          stripe_details_submitted?: boolean | null
          created_at?: string
          updated_at?: string
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
      session_type: SessionType
      session_participant_role: SessionParticipantRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  T extends keyof Database['public']['Tables'],
> = Database['public']['Tables'][T]['Row']

export type Intake = Tables<'intakes'>
export type IntakeDeletion = Tables<'intake_deletions'>
export type Session = Tables<'sessions'>
export type SessionParticipant = Tables<'session_participants'>
export type ChatMessage = Tables<'chat_messages'>
export type Profile = Tables<'profiles'>
export type SessionFile = Tables<'session_files'>
export type Vehicle = Tables<'vehicles'>
