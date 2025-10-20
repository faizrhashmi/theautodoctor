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
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
        }
        Relationships: []
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
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          email: string
          phone?: string | null
          password_hash: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          email?: string
          phone?: string | null
          password_hash?: string
        }
        Relationships: []
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
