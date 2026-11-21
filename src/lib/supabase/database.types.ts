export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          event_id: string | null
          group_id: string | null
          id: string
          organization_id: string
          published_at: string
          published_by: string
          team_id: string
          title: string
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          organization_id: string
          published_at?: string
          published_by: string
          team_id: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          organization_id?: string
          published_at?: string
          published_by?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "announcements_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "announcements_team_id_group_id_fkey"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          date_of_birth: string | null
          first_name: string
          household_id: string
          id: string
          last_name: string
          organization_id: string
          preferred_name: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          household_id: string
          id?: string
          last_name: string
          organization_id: string
          preferred_name?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          household_id?: string
          id?: string
          last_name?: string
          organization_id?: string
          preferred_name?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "athletes_team_id_household_id_fkey"
            columns: ["team_id", "household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      attendance: {
        Row: {
          athlete_id: string
          id: string
          organization_id: string
          recorded_at: string
          recorded_by: string
          session_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          id?: string
          organization_id: string
          recorded_at?: string
          recorded_by: string
          session_id: string
          status: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          id?: string
          organization_id?: string
          recorded_at?: string
          recorded_by?: string
          session_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_team_id_athlete_id_fkey"
            columns: ["team_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "attendance_team_id_session_id_fkey"
            columns: ["team_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          checked_in_at: string | null
          checkin_method: Database["public"]["Enums"]["checkin_method"]
          created_at: string
          id: string
          notes: string | null
          practice_session_id: string
          recorded_by_user_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          swimmer_id: string
          team_id: string
          updated_at: string
          verified_by_user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checkin_method?: Database["public"]["Enums"]["checkin_method"]
          created_at?: string
          id?: string
          notes?: string | null
          practice_session_id: string
          recorded_by_user_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          swimmer_id: string
          team_id: string
          updated_at?: string
          verified_by_user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checkin_method?: Database["public"]["Enums"]["checkin_method"]
          created_at?: string
          id?: string
          notes?: string | null
          practice_session_id?: string
          recorded_by_user_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          swimmer_id?: string
          team_id?: string
          updated_at?: string
          verified_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_user_id_fkey"
            columns: ["recorded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_team_fk"
            columns: ["team_id", "practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "attendance_records_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_swimmer_team_fk"
            columns: ["team_id", "swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "attendance_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_verified_by_user_id_fkey"
            columns: ["verified_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_sessions: {
        Row: {
          commitment_id: string
          created_at: string
          event_id: string
          event_session_id: string
          team_id: string
        }
        Insert: {
          commitment_id: string
          created_at?: string
          event_id: string
          event_session_id: string
          team_id: string
        }
        Update: {
          commitment_id?: string
          created_at?: string
          event_id?: string
          event_session_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_sessions_team_id_event_id_commitment_id_fkey"
            columns: ["team_id", "event_id", "commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["team_id", "event_id", "id"]
          },
          {
            foreignKeyName: "commitment_sessions_team_id_event_id_event_session_id_fkey"
            columns: ["team_id", "event_id", "event_session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["team_id", "event_id", "id"]
          },
        ]
      }
      commitments: {
        Row: {
          athlete_id: string
          coach_note: string | null
          created_at: string
          event_id: string
          id: string
          org_id: string
          responded_by: string
          response: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_note?: string | null
          created_at?: string
          event_id: string
          id?: string
          org_id: string
          responded_by: string
          response: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_note?: string | null
          created_at?: string
          event_id?: string
          id?: string
          org_id?: string
          responded_by?: string
          response?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_org_id_team_id_fkey"
            columns: ["org_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "commitments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_team_id_athlete_id_fkey"
            columns: ["team_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "commitments_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string
          ends_at: string
          event_id: string
          id: string
          name: string
          org_id: string
          sort_order: number
          starts_at: string
          team_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          event_id: string
          id?: string
          name: string
          org_id: string
          sort_order?: number
          starts_at: string
          team_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          event_id?: string
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          starts_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_org_id_team_id_fkey"
            columns: ["org_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "event_sessions_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      events: {
        Row: {
          commit_deadline: string | null
          created_at: string
          created_by: string | null
          details: string | null
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          org_id: string
          starts_at: string
          status: string
          team_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          commit_deadline?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          org_id: string
          starts_at: string
          status?: string
          team_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          commit_deadline?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          org_id?: string
          starts_at?: string
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_team_id_fkey"
            columns: ["org_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          primary_email: string | null
          primary_phone: string | null
          status: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          primary_email?: string | null
          primary_phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          primary_email?: string | null
          primary_phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      family_contacts: {
        Row: {
          created_at: string
          email: string | null
          family_id: string
          id: string
          name: string
          phone: string | null
          relationship_label: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          family_id: string
          id?: string
          name: string
          phone?: string | null
          relationship_label?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          family_id?: string
          id?: string
          name?: string
          phone?: string | null
          relationship_label?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_contacts_team_id_family_id_fkey"
            columns: ["team_id", "family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      family_guardians: {
        Row: {
          created_at: string
          family_id: string
          membership_id: string
          relationship_label: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          membership_id: string
          relationship_label?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          membership_id?: string
          relationship_label?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_guardians_team_id_family_id_fkey"
            columns: ["team_id", "family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "family_guardians_team_id_membership_id_fkey"
            columns: ["team_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      family_registration_profiles: {
        Row: {
          agreements: Json
          configuration_snapshot: Json
          created_at: string
          custom_answers: Json
          emergency_contacts: Json
          family_id: string
          guardians: Json
          household: Json
          id: string
          registration_request_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          agreements?: Json
          configuration_snapshot: Json
          created_at?: string
          custom_answers?: Json
          emergency_contacts: Json
          family_id: string
          guardians: Json
          household: Json
          id?: string
          registration_request_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          agreements?: Json
          configuration_snapshot?: Json
          created_at?: string
          custom_answers?: Json
          emergency_contacts?: Json
          family_id?: string
          guardians?: Json
          household?: Json
          id?: string
          registration_request_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_registration_profiles_team_id_family_id_fkey"
            columns: ["team_id", "family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "family_registration_profiles_team_id_registration_request__fkey"
            columns: ["team_id", "registration_request_id"]
            isOneToOne: false
            referencedRelation: "parent_registration_requests"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      family_swimmers: {
        Row: {
          created_at: string
          family_id: string
          id: string
          relationship_label: string | null
          swimmer_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          relationship_label?: string | null
          swimmer_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          relationship_label?: string | null
          swimmer_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_swimmers_team_id_family_id_fkey"
            columns: ["team_id", "family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "family_swimmers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_swimmers_team_id_swimmer_id_fkey"
            columns: ["team_id", "swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      group_members: {
        Row: {
          athlete_id: string
          created_at: string
          group_id: string
          id: string
          organization_id: string
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          group_id: string
          id?: string
          organization_id: string
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          group_id?: string
          id?: string
          organization_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "group_members_team_id_athlete_id_fkey"
            columns: ["team_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "group_members_team_id_group_id_fkey"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string
          end_date: string | null
          group_id: string
          id: string
          is_primary: boolean
          start_date: string
          swimmer_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          group_id: string
          id?: string
          is_primary?: boolean
          start_date: string
          swimmer_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          group_id?: string
          id?: string
          is_primary?: boolean
          start_date?: string
          swimmer_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_group_team_fk"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "group_memberships_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_swimmer_team_fk"
            columns: ["team_id", "swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "group_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          household_id: string
          id: string
          last_name: string
          organization_id: string
          phone: string | null
          profile_id: string | null
          relationship: string
          team_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          household_id: string
          id?: string
          last_name: string
          organization_id: string
          phone?: string | null
          profile_id?: string | null
          relationship?: string
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          household_id?: string
          id?: string
          last_name?: string
          organization_id?: string
          phone?: string | null
          profile_id?: string | null
          relationship?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "household_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_team_id_household_id_fkey"
            columns: ["team_id", "household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      job_signups: {
        Row: {
          claimed_at: string
          created_at: string
          household_id: string
          id: string
          membership_id: string
          organization_id: string
          released_at: string | null
          slot_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          household_id: string
          id?: string
          membership_id: string
          organization_id: string
          released_at?: string | null
          slot_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          household_id?: string
          id?: string
          membership_id?: string
          organization_id?: string
          released_at?: string | null
          slot_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_signups_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "job_signups_team_id_household_id_fkey"
            columns: ["team_id", "household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "job_signups_team_id_membership_id_fkey"
            columns: ["team_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "job_signups_team_id_slot_id_fkey"
            columns: ["team_id", "slot_id"]
            isOneToOne: false
            referencedRelation: "job_slots"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      job_slots: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          credit_value: number
          description: string | null
          ends_at: string
          event_id: string
          id: string
          organization_id: string
          signup_deadline: string
          starts_at: string
          team_id: string
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by: string
          credit_value?: number
          description?: string | null
          ends_at: string
          event_id: string
          id?: string
          organization_id: string
          signup_deadline: string
          starts_at: string
          team_id: string
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          credit_value?: number
          description?: string | null
          ends_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          signup_deadline?: string
          starts_at?: string
          team_id?: string
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_slots_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "job_slots_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "job_slots_team_id_template_id_fkey"
            columns: ["team_id", "template_id"]
            isOneToOne: false
            referencedRelation: "job_templates"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      job_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          default_credit: number
          description: string | null
          id: string
          organization_id: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          default_credit?: number
          description?: string | null
          id?: string
          organization_id: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          default_credit?: number
          description?: string | null
          id?: string
          organization_id?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_templates_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      join_requests: {
        Row: {
          athlete_names: Json
          created_at: string
          household_name: string
          id: string
          note: string | null
          organization_id: string
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_names: Json
          created_at?: string
          household_name: string
          id?: string
          note?: string | null
          organization_id: string
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_names?: Json
          created_at?: string
          household_name?: string
          id?: string
          note?: string | null
          organization_id?: string
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "join_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          organization_id: string
          profile_id: string
          role: string
          status: string
          team_id: string
          updated_at: string
          volunteer_quota: number
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          organization_id: string
          profile_id: string
          role: string
          status?: string
          team_id: string
          updated_at?: string
          volunteer_quota?: number
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          organization_id?: string
          profile_id?: string
          role?: string
          status?: string
          team_id?: string
          updated_at?: string
          volunteer_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_team_id_household_id_fkey"
            columns: ["team_id", "household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      messages: {
        Row: {
          announcement_id: string | null
          author_id: string | null
          body: string | null
          channel: string | null
          created_at: string
          delivery_status: string | null
          id: string
          kind: string
          organization_id: string
          recipient_membership_id: string | null
          team_id: string
          thread_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          author_id?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string
          delivery_status?: string | null
          id?: string
          kind: string
          organization_id: string
          recipient_membership_id?: string | null
          team_id: string
          thread_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          author_id?: string | null
          body?: string | null
          channel?: string | null
          created_at?: string
          delivery_status?: string | null
          id?: string
          kind?: string
          organization_id?: string
          recipient_membership_id?: string | null
          team_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "messages_team_id_announcement_id_fkey"
            columns: ["team_id", "announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "messages_team_id_recipient_membership_id_fkey"
            columns: ["team_id", "recipient_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "messages_team_id_thread_id_fkey"
            columns: ["team_id", "thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      mock_checkout_sessions: {
        Row: {
          city: string | null
          club_code: string | null
          club_slug: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          owner_phone: string | null
          plan_id: string
          primary_facility: string | null
          public_plan_key: string | null
          state: string | null
          status: string
          team_id: string | null
          team_name: string
          timezone: string
          user_id: string
        }
        Insert: {
          city?: string | null
          club_code?: string | null
          club_slug?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          owner_phone?: string | null
          plan_id: string
          primary_facility?: string | null
          public_plan_key?: string | null
          state?: string | null
          status?: string
          team_id?: string | null
          team_name: string
          timezone: string
          user_id: string
        }
        Update: {
          city?: string | null
          club_code?: string | null
          club_slug?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          owner_phone?: string | null
          plan_id?: string
          primary_facility?: string | null
          public_plan_key?: string | null
          state?: string | null
          status?: string
          team_id?: string | null
          team_name?: string
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_checkout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_checkout_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_checkout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_announcements: boolean
          last_inbox_seen_at: string
          membership_id: string
          organization_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          email_announcements?: boolean
          last_inbox_seen_at?: string
          membership_id: string
          organization_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          email_announcements?: boolean
          last_inbox_seen_at?: string
          membership_id?: string
          organization_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "notification_preferences_team_id_membership_id_fkey"
            columns: ["team_id", "membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          joining_open: boolean
          name: string
          slug: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          joining_open?: boolean
          name: string
          slug?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          joining_open?: boolean
          name?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      parent_registration_requests: {
        Row: {
          configuration_snapshot: Json | null
          created_at: string
          family_name: string
          id: string
          registration_payload: Json | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          swimmers: Json
          team_id: string
          user_id: string
        }
        Insert: {
          configuration_snapshot?: Json | null
          created_at?: string
          family_name: string
          id?: string
          registration_payload?: Json | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          swimmers: Json
          team_id: string
          user_id: string
        }
        Update: {
          configuration_snapshot?: Json | null
          created_at?: string
          family_name?: string
          id?: string
          registration_payload?: Json | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          swimmers?: Json
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_registration_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_registration_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_registration_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_owners: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_support_sessions: {
        Row: {
          expires_at: string
          id: string
          platform_user_id: string
          reason: string
          started_at: string
          team_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          platform_user_id: string
          reason: string
          started_at?: string
          team_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          platform_user_id?: string
          reason?: string
          started_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_sessions_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_owners"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_support_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_exceptions: {
        Row: {
          cancel_practice: boolean
          created_at: string
          created_by_user_id: string | null
          exception_date: string
          exception_type: string
          group_id: string | null
          id: string
          notes: string | null
          reason: string
          replacement_end_time: string | null
          replacement_start_time: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          cancel_practice?: boolean
          created_at?: string
          created_by_user_id?: string | null
          exception_date: string
          exception_type: string
          group_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          replacement_end_time?: string | null
          replacement_start_time?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          cancel_practice?: boolean
          created_at?: string
          created_by_user_id?: string | null
          exception_date?: string
          exception_type?: string
          group_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          replacement_end_time?: string | null
          replacement_start_time?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_exceptions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_exceptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_exceptions_group_team_fk"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "practice_exceptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          effective_end_date: string | null
          effective_start_date: string
          end_time: string
          group_id: string
          id: string
          start_time: string
          status: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_end_date?: string | null
          effective_start_date: string
          end_time: string
          group_id: string
          id?: string
          start_time: string
          status?: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_end_date?: string | null
          effective_start_date?: string
          end_time?: string
          group_id?: string
          id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_schedules_group_team_fk"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "practice_schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          cancel_reason: string | null
          created_at: string
          end_time: string
          group_id: string
          id: string
          practice_date: string
          schedule_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["practice_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          end_time: string
          group_id: string
          id?: string
          practice_date: string
          schedule_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["practice_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          end_time?: string
          group_id?: string
          id?: string
          practice_date?: string
          schedule_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["practice_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_group_team_fk"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "swim_groups"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "practice_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "practice_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_schedule_team_group_fk"
            columns: ["team_id", "group_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "practice_schedules"
            referencedColumns: ["team_id", "group_id", "id"]
          },
          {
            foreignKeyName: "practice_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_maintenance_settings: {
        Row: {
          singleton: boolean
          supabase_project_ref: string
          test_project: boolean
          updated_at: string
        }
        Insert: {
          singleton?: boolean
          supabase_project_ref: string
          test_project?: boolean
          updated_at?: string
        }
        Update: {
          singleton?: boolean
          supabase_project_ref?: string
          test_project?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: number
          severity: string
          team_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: never
          severity: string
          team_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
          severity?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      self_checkin_tokens: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string
          id: string
          practice_session_id: string
          team_id: string
          token: string
          valid_from: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at: string
          id?: string
          practice_session_id: string
          team_id: string
          token: string
          valid_from: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          practice_session_id?: string
          team_id?: string
          token?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_checkin_tokens_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_checkin_tokens_session_team_fk"
            columns: ["team_id", "practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "self_checkin_tokens_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rsvps: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          organization_id: string
          responded_by: string
          response: string
          session_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          organization_id: string
          responded_by: string
          response: string
          session_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          responded_by?: string
          response?: string
          session_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rsvps_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "session_rsvps_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_rsvps_team_id_athlete_id_fkey"
            columns: ["team_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "session_rsvps_team_id_session_id_fkey"
            columns: ["team_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          group_id: string
          id: string
          kind: string
          location_id: string | null
          organization_id: string
          series_id: string | null
          starts_at: string
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          group_id: string
          id?: string
          kind?: string
          location_id?: string | null
          organization_id: string
          series_id?: string | null
          starts_at: string
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          group_id?: string
          id?: string
          kind?: string
          location_id?: string | null
          organization_id?: string
          series_id?: string | null
          starts_at?: string
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "sessions_team_id_group_id_fkey"
            columns: ["team_id", "group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "sessions_team_id_location_id_fkey"
            columns: ["team_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      site_action_limits: {
        Row: {
          action: string
          count: number
          team_id: string
          user_id: string
          window_at: string
        }
        Insert: {
          action: string
          count: number
          team_id: string
          user_id: string
          window_at: string
        }
        Update: {
          action?: string
          count?: number
          team_id?: string
          user_id?: string
          window_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_action_limits_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      site_assets: {
        Row: {
          bytes: number
          created_at: string
          height: number | null
          id: string
          mime_type: string
          object_path: string
          site_id: string
          state: string
          team_id: string
          width: number | null
        }
        Insert: {
          bytes: number
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          object_path: string
          site_id: string
          state?: string
          team_id: string
          width?: number | null
        }
        Update: {
          bytes?: number
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          site_id?: string
          state?: string
          team_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_assets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_assets_team_id_site_id_fkey"
            columns: ["team_id", "site_id"]
            isOneToOne: false
            referencedRelation: "team_sites"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      site_catalog_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_catalog_audit_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_catalog_writers: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_catalog_writers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "platform_owners"
            referencedColumns: ["user_id"]
          },
        ]
      }
      site_domains: {
        Row: {
          active: boolean
          created_at: string
          detached_at: string | null
          display_hostname: string
          hostname: string
          id: string
          is_primary: boolean
          last_checked_at: string | null
          last_error: string | null
          provider_status: string
          site_id: string
          team_id: string
          token_expires_at: string
          type: string
          updated_at: string
          verification_status: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          detached_at?: string | null
          display_hostname: string
          hostname: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          provider_status?: string
          site_id: string
          team_id: string
          token_expires_at?: string
          type?: string
          updated_at?: string
          verification_status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          detached_at?: string | null
          display_hostname?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          provider_status?: string
          site_id?: string
          team_id?: string
          token_expires_at?: string
          type?: string
          updated_at?: string
          verification_status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_domains_team_id_site_id_fkey"
            columns: ["team_id", "site_id"]
            isOneToOne: false
            referencedRelation: "team_sites"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      site_pages: {
        Row: {
          id: string
          nav_order: number
          sections: Json
          seo_description: string
          site_id: string
          slug: string
          team_id: string
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          nav_order?: number
          sections?: Json
          seo_description?: string
          site_id: string
          slug: string
          team_id: string
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          nav_order?: number
          sections?: Json
          seo_description?: string
          site_id?: string
          slug?: string
          team_id?: string
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_team_id_site_id_fkey"
            columns: ["team_id", "site_id"]
            isOneToOne: false
            referencedRelation: "team_sites"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      site_publications: {
        Row: {
          id: string
          published_at: string
          published_by: string | null
          site_id: string
          snapshot: Json
          source_revision: number | null
          team_id: string
          version: number
        }
        Insert: {
          id?: string
          published_at?: string
          published_by?: string | null
          site_id: string
          snapshot: Json
          source_revision?: number | null
          team_id: string
          version: number
        }
        Update: {
          id?: string
          published_at?: string
          published_by?: string | null
          site_id?: string
          snapshot?: Json
          source_revision?: number | null
          team_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_publications_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_publications_team_id_site_id_fkey"
            columns: ["team_id", "site_id"]
            isOneToOne: false
            referencedRelation: "team_sites"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      site_templates: {
        Row: {
          created_at: string
          default_theme: Json
          id: string
          layout_key: string
          name: string
          starter_pages: Json
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          default_theme?: Json
          id?: string
          layout_key: string
          name: string
          starter_pages?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          default_theme?: Json
          id?: string
          layout_key?: string
          name?: string
          starter_pages?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string
          display_order: number
          id: string
          module_keys: string[]
          monthly_price_cents: number
          name: string
          public_key: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          display_order?: number
          id: string
          module_keys: string[]
          monthly_price_cents: number
          name: string
          public_key?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          module_keys?: string[]
          monthly_price_cents?: number
          name?: string
          public_key?: string | null
        }
        Relationships: []
      }
      swim_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swim_groups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      swimmer_registration_profiles: {
        Row: {
          created_at: string
          id: string
          profile: Json
          registration_request_id: string
          swimmer_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile: Json
          registration_request_id: string
          swimmer_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile?: Json
          registration_request_id?: string
          swimmer_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swimmer_registration_profiles_team_id_registration_request_fkey"
            columns: ["team_id", "registration_request_id"]
            isOneToOne: false
            referencedRelation: "parent_registration_requests"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "swimmer_registration_profiles_team_id_swimmer_id_fkey"
            columns: ["team_id", "swimmer_id"]
            isOneToOne: true
            referencedRelation: "swimmers"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      swimmers: {
        Row: {
          created_at: string
          date_of_birth: string | null
          external_id: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          preferred_name: string | null
          status: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          external_id?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          external_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swimmers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_module_permissions: {
        Row: {
          access_level: string
          granted_at: string
          membership_id: string
          module_key: string
          team_id: string
        }
        Insert: {
          access_level: string
          granted_at?: string
          membership_id: string
          module_key: string
          team_id: string
        }
        Update: {
          access_level?: string
          granted_at?: string
          membership_id?: string
          module_key?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_module_permissions_team_id_membership_id_fkey"
            columns: ["team_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          can_assign_access: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_assign_access?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["record_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_assign_access?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_module_entitlements: {
        Row: {
          created_at: string
          ends_at: string | null
          module_key: string
          starts_at: string
          team_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          module_key: string
          starts_at?: string
          team_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          module_key?: string
          starts_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_module_entitlements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_registration_settings: {
        Row: {
          registration_configuration: Json
          registration_open: boolean
          slug: string
          team_id: string
          updated_at: string
        }
        Insert: {
          registration_configuration?: Json
          registration_open?: boolean
          slug: string
          team_id: string
          updated_at?: string
        }
        Update: {
          registration_configuration?: Json
          registration_open?: boolean
          slug?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_registration_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          checkin_close_minutes: number
          checkin_open_minutes: number
          count_excused_against_attendance: boolean
          count_late_as_present: boolean
          require_coach_confirmation: boolean
          self_checkin_mode: string
          team_id: string
          updated_at: string
        }
        Insert: {
          checkin_close_minutes?: number
          checkin_open_minutes?: number
          count_excused_against_attendance?: boolean
          count_late_as_present?: boolean
          require_coach_confirmation?: boolean
          self_checkin_mode?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          checkin_close_minutes?: number
          checkin_open_minutes?: number
          count_excused_against_attendance?: boolean
          count_late_as_present?: boolean
          require_coach_confirmation?: boolean
          self_checkin_mode?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_sites: {
        Row: {
          created_at: string
          draft_revision: number
          enabled: boolean
          id: string
          layout_key: string
          logo_path: string | null
          published_version: number | null
          settings: Json
          site_name: string
          slug: string
          team_id: string
          template_id: string | null
          theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_revision?: number
          enabled?: boolean
          id?: string
          layout_key: string
          logo_path?: string | null
          published_version?: number | null
          settings?: Json
          site_name: string
          slug: string
          team_id: string
          template_id?: string | null
          theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_revision?: number
          enabled?: boolean
          id?: string
          layout_key?: string
          logo_path?: string | null
          published_version?: number | null
          settings?: Json
          site_name?: string
          slug?: string
          team_id?: string
          template_id?: string | null
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_sites_publication_fk"
            columns: ["team_id", "id", "published_version"]
            isOneToOne: false
            referencedRelation: "site_publications"
            referencedColumns: ["team_id", "site_id", "version"]
          },
          {
            foreignKeyName: "team_sites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_sites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
        Row: {
          billing_mode: string
          cancelled_at: string | null
          created_at: string
          id: string
          plan_id: string
          starts_at: string
          status: string
          team_id: string
          trial_ends_at: string | null
        }
        Insert: {
          billing_mode?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
          starts_at?: string
          status: string
          team_id: string
          trial_ends_at?: string | null
        }
        Update: {
          billing_mode?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          team_id?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          city: string
          club_code: string | null
          created_at: string
          id: string
          is_test_team: boolean
          logo_url: string | null
          name: string
          organization_id: string
          owner_phone: string
          primary_facility: string | null
          season_type: string | null
          slug: string
          state: string
          status: Database["public"]["Enums"]["record_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city: string
          club_code?: string | null
          created_at?: string
          id?: string
          is_test_team?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          owner_phone: string
          primary_facility?: string | null
          season_type?: string | null
          slug: string
          state: string
          status?: Database["public"]["Enums"]["record_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city?: string
          club_code?: string | null
          created_at?: string
          id?: string
          is_test_team?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          owner_phone?: string
          primary_facility?: string | null
          season_type?: string | null
          slug?: string
          state?: string
          status?: Database["public"]["Enums"]["record_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          event_id: string
          id: string
          organization_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "threads_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      volunteer_ledger: {
        Row: {
          created_at: string
          created_by: string
          credit: number
          household_id: string
          id: string
          membership_id: string
          note: string | null
          organization_id: string
          season_year: number
          signup_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          credit: number
          household_id: string
          id?: string
          membership_id: string
          note?: string | null
          organization_id: string
          season_year: number
          signup_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          credit?: number
          household_id?: string
          id?: string
          membership_id?: string
          note?: string | null
          organization_id?: string
          season_year?: number
          signup_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_ledger_organization_id_team_id_fkey"
            columns: ["organization_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "volunteer_ledger_team_id_household_id_fkey"
            columns: ["team_id", "household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "volunteer_ledger_team_id_membership_id_fkey"
            columns: ["team_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "volunteer_ledger_team_id_signup_id_fkey"
            columns: ["team_id", "signup_id"]
            isOneToOne: true
            referencedRelation: "job_signups"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
    }
    Views: {
      vw_public_upcoming_events: {
        Row: {
          id: string | null
          location: string | null
          org_id: string | null
          org_slug: string | null
          starts_at: string | null
          title: string | null
          visibility: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_team_account: {
        Args: { expected_team_name: string; target_team_id: string }
        Returns: undefined
      }
      begin_mock_checkout: {
        Args: {
          requested_city: string
          requested_club_code: string
          requested_owner_phone: string
          requested_primary_facility: string
          requested_public_plan: string
          requested_slug: string
          requested_state: string
          requested_team_name: string
          requested_timezone: string
        }
        Returns: string
      }
      can_access_team_module: {
        Args: {
          required_level?: string
          target_module: string
          target_team_id: string
        }
        Returns: boolean
      }
      can_assign_team_access: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      can_manage_athlete: {
        Args: { target_athlete_id: string; target_team_id: string }
        Returns: boolean
      }
      can_manage_omnisite: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      can_read_household: {
        Args: { target_household_id: string; target_team_id: string }
        Returns: boolean
      }
      can_review_family_registration: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      can_view_omnisite: { Args: { target_team_id: string }; Returns: boolean }
      can_write_site_catalog: { Args: never; Returns: boolean }
      claim_job_slot: {
        Args: { target_slot_id: string; target_team_id: string }
        Returns: string
      }
      clear_team_records: {
        Args: { include_account_access: boolean; target_team_id: string }
        Returns: undefined
      }
      club_slug_base: { Args: { value: string }; Returns: string }
      complete_mock_checkout: {
        Args: { target_checkout_id: string }
        Returns: string
      }
      configure_team_registration: {
        Args: {
          open_registration: boolean
          registration_config?: Json
          target_slug: string
          target_team_id: string
        }
        Returns: undefined
      }
      create_platform_omnisite_team: {
        Args: { requested_team_name: string; requested_timezone?: string }
        Returns: string
      }
      create_practice_sessions: {
        Args: {
          first_end: string
          first_start: string
          practice_title: string
          repeat_weekly?: boolean
          target_group_id: string
          target_location_id: string
          target_team_id: string
        }
        Returns: string[]
      }
      create_team_site: {
        Args: {
          requested_name: string
          requested_slug: string
          selected_template_id: string
          target_team_id: string
        }
        Returns: string
      }
      dearmor: { Args: { "": string }; Returns: string }
      delete_team_and_data: {
        Args: {
          actor_user_id: string
          expected_team_name: string
          target_team_id: string
        }
        Returns: undefined
      }
      find_joinable_organization: {
        Args: { target_slug: string }
        Returns: {
          organization_id: string
          organization_name: string
          team_id: string
        }[]
      }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      get_family_registration: {
        Args: { target_slug: string }
        Returns: {
          available_groups: Json
          registration_configuration: Json
          registration_open: boolean
          team_id: string
        }[]
      }
      get_public_site: { Args: { requested_slug: string }; Returns: Json }
      get_public_upcoming_events: {
        Args: never
        Returns: {
          id: string
          location: string
          org_id: string
          org_slug: string
          starts_at: string
          title: string
          visibility: string
        }[]
      }
      get_team_setup_checklist: {
        Args: { target_team_id: string }
        Returns: Json
      }
      has_omniconnect: { Args: { target_team_id: string }; Returns: boolean }
      has_omnivolunteer: { Args: { target_team_id: string }; Returns: boolean }
      has_team_module: {
        Args: { target_module: string; target_team_id: string }
        Returns: boolean
      }
      internal_plan_id: { Args: { public_plan: string }; Returns: string }
      is_active_omniathlete_member: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_active_team_member: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_connect_admin: { Args: { target_team_id: string }; Returns: boolean }
      is_family_guardian: {
        Args: { target_family_id: string; target_team_id: string }
        Returns: boolean
      }
      is_omniathlete_admin: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_omniathlete_coach: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_platform_owner: { Args: never; Returns: boolean }
      is_platform_owner_identity: { Args: never; Returns: boolean }
      is_platform_supporting_team: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      is_public_omnisite: { Args: { target_team_id: string }; Returns: boolean }
      is_swimmer_guardian: {
        Args: { target_swimmer_id: string; target_team_id: string }
        Returns: boolean
      }
      is_verified_user: { Args: never; Returns: boolean }
      is_volunteer_admin: { Args: { target_team_id: string }; Returns: boolean }
      list_platform_team_modules: {
        Args: never
        Returns: {
          enabled: boolean
          module_key: string
          team_id: string
        }[]
      }
      list_platform_team_overview: {
        Args: never
        Returns: {
          billing_mode: string
          created_at: string
          is_test_team: boolean
          plan_id: string
          plan_name: string
          subscription_status: string
          team_id: string
          team_name: string
          team_status: Database["public"]["Enums"]["record_status"]
        }[]
      }
      list_platform_team_usable_links: {
        Args: never
        Returns: {
          primary_domain_type: string
          primary_hostname: string
          registration_open: boolean
          registration_slug: string
          site_available: boolean
          site_enabled: boolean
          site_published: boolean
          site_slug: string
          team_id: string
        }[]
      }
      list_platform_teams: {
        Args: never
        Returns: {
          team_id: string
          team_name: string
        }[]
      }
      meet_commitment_counts: {
        Args: { target_event_id: string; target_team_id: string }
        Returns: {
          committed: number
          declined: number
          group_id: string
          group_name: string
          undeclared: number
        }[]
      }
      omnisite_asset_reconciliation_candidates: {
        Args: { older_than?: string }
        Returns: {
          created_at: string
          id: string
          object_path: string
          site_id: string
          state: string
          team_id: string
        }[]
      }
      omnisite_domain_review_candidates: {
        Args: { review_after?: string }
        Returns: {
          hostname: string
          id: string
          last_checked_at: string
          verification_token: string
        }[]
      }
      os_actor_manage: { Args: { actor: string; t: string }; Returns: boolean }
      os_assert_assets: { Args: { v: Json }; Returns: undefined }
      os_asset_operation: {
        Args: {
          actor: string
          asset_bytes?: number
          asset_height?: number
          asset_id: string
          asset_width?: number
          operation: string
          s: string
          t: string
        }
        Returns: string
      }
      os_domain_operation: {
        Args: {
          actor: string
          display_host?: string
          domain_id?: string
          operation: string
          proof_token?: string
          provider_ready?: boolean
          requested_host?: string
          s: string
          t: string
        }
        Returns: string
      }
      os_draft: { Args: { s: string; t: string }; Returns: Json }
      os_paths: { Args: { v: Json }; Returns: string[] }
      os_public_media_path: {
        Args: { handle: string; requested_slug: string }
        Returns: string
      }
      os_public_snapshot: { Args: { v: Json }; Returns: Json }
      os_safe_link: { Args: { link: string }; Returns: boolean }
      os_safe_slug: { Args: { s: string }; Returns: boolean }
      os_stale_assets: {
        Args: { actor: string; s: string; t: string }
        Returns: {
          id: string
          object_path: string
        }[]
      }
      os_supported_snapshot: { Args: { v: Json }; Returns: boolean }
      os_take_limit: {
        Args: { action_name: string; target_team_id: string }
        Returns: boolean
      }
      os_valid_snapshot: { Args: { value: Json }; Returns: boolean }
      os_valid_template: { Args: { value: Json }; Returns: boolean }
      os_validate_content: { Args: { v: Json }; Returns: undefined }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      platform_set_team_module: {
        Args: {
          enable_module: boolean
          target_module: string
          target_team_id: string
        }
        Returns: undefined
      }
      platform_set_team_plan: {
        Args: { target_plan_id: string; target_team_id: string }
        Returns: undefined
      }
      platform_set_team_status: {
        Args: { activate: boolean; target_team_id: string }
        Returns: undefined
      }
      post_announcement: {
        Args: {
          announcement_body: string
          announcement_title: string
          target_audience: string
          target_id?: string
          target_team_id: string
        }
        Returns: string
      }
      post_event_message: {
        Args: {
          message_body: string
          target_event_id: string
          target_team_id: string
        }
        Returns: string
      }
      preview_team_hard_delete: {
        Args: { target_team_id: string }
        Returns: Json
      }
      preview_test_project_reset: {
        Args: { expected_project_ref: string }
        Returns: {
          asset_count: number
          non_test_team_count: number
          site_count: number
          team_count: number
        }[]
      }
      production_security_snapshot: { Args: never; Returns: Json }
      public_site_primary: { Args: { requested_slug: string }; Returns: string }
      publish_meet: {
        Args: {
          deadline: string
          meet_location: string
          meet_title: string
          sessions: Json
          target_team_id: string
        }
        Returns: string
      }
      publish_site_revision: {
        Args: {
          expected_revision: number
          expected_version: number
          source_version?: number
          target_site_id: string
          target_team_id: string
        }
        Returns: number
      }
      purge_all_test_project_data: {
        Args: { confirmation: string; expected_project_ref: string }
        Returns: number
      }
      purge_test_team_data: {
        Args: { expected_team_name: string; target_team_id: string }
        Returns: undefined
      }
      record_omnisite_domain_review: {
        Args: { ownership_confirmed: boolean; target_domain_id: string }
        Returns: undefined
      }
      record_security_event: {
        Args: {
          requested_actor_user_id?: string
          requested_details?: Json
          requested_event_type: string
          requested_severity: string
          requested_team_id?: string
        }
        Returns: number
      }
      registration_answer_valid: {
        Args: { answer: Json; question: Json }
        Returns: boolean
      }
      registration_valid_calendar_date: {
        Args: { value: string }
        Returns: boolean
      }
      registration_valid_email: { Args: { value: string }; Returns: boolean }
      registration_valid_phone: { Args: { value: string }; Returns: boolean }
      release_job_signup: {
        Args: { target_signup_id: string; target_team_id: string }
        Returns: undefined
      }
      reset_all_test_client_data: {
        Args: { confirmation: string; expected_project_ref: string }
        Returns: number
      }
      resolve_site_hostname: {
        Args: { requested_host: string }
        Returns: string
      }
      review_parent_registration: {
        Args: {
          approve: boolean
          target_request_id: string
          target_team_id: string
        }
        Returns: undefined
      }
      save_household_commitments: {
        Args: { choices: Json; target_event_id: string; target_team_id: string }
        Returns: undefined
      }
      save_site_draft: {
        Args: {
          content: Json
          expected_revision: number
          target_site_id: string
          target_team_id: string
        }
        Returns: number
      }
      save_site_template: {
        Args: { content: Json; expected_version: number; template_id: string }
        Returns: string
      }
      set_site_enabled: {
        Args: {
          active: boolean
          target_site_id: string
          target_team_id: string
        }
        Returns: undefined
      }
      set_team_member_module_permission: {
        Args: {
          target_level: string
          target_membership_id: string
          target_module: string
          target_team_id: string
        }
        Returns: undefined
      }
      set_team_member_role: {
        Args: {
          allow_access_assignment?: boolean
          target_membership_id: string
          target_role: Database["public"]["Enums"]["membership_role"]
          target_team_id: string
        }
        Returns: undefined
      }
      start_platform_support_session: {
        Args: { support_reason: string; target_team_id: string }
        Returns: string
      }
      submit_family_registration: {
        Args: { registration_payload: Json; target_team_id: string }
        Returns: string
      }
      update_club_profile: {
        Args: {
          requested_city: string
          requested_club_code: string
          requested_logo_url: string
          requested_name: string
          requested_owner_phone: string
          requested_primary_facility: string
          requested_season_type: string
          requested_slug: string
          requested_state: string
          requested_timezone: string
          target_team_id: string
        }
        Returns: {
          archived_at: string | null
          city: string
          club_code: string | null
          created_at: string
          id: string
          is_test_team: boolean
          logo_url: string | null
          name: string
          organization_id: string
          owner_phone: string
          primary_facility: string | null
          season_type: string | null
          slug: string
          state: string
          status: Database["public"]["Enums"]["record_status"]
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_profile_names: {
        Args: { requested_first_name: string; requested_last_name: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status:
        | "PRESENT"
        | "ABSENT"
        | "EXCUSED"
        | "LATE"
        | "LEFT_EARLY"
        | "NOT_SCHEDULED"
      checkin_method: "COACH" | "SELF" | "PARENT" | "ADMIN" | "IMPORT"
      membership_role: "OWNER" | "ADMIN" | "COACH" | "PARENT"
      practice_status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      record_status: "ACTIVE" | "INACTIVE"
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
      attendance_status: [
        "PRESENT",
        "ABSENT",
        "EXCUSED",
        "LATE",
        "LEFT_EARLY",
        "NOT_SCHEDULED",
      ],
      checkin_method: ["COACH", "SELF", "PARENT", "ADMIN", "IMPORT"],
      membership_role: ["OWNER", "ADMIN", "COACH", "PARENT"],
      practice_status: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      record_status: ["ACTIVE", "INACTIVE"],
    },
  },
} as const
