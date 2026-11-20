// Generated from the tracked Supabase schema after 202611190001.
// Regenerate with `supabase gen types typescript --local` when local Supabase is available.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string | null; status: Database["public"]["Enums"]["record_status"]; joining_open: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug?: string | null; status?: Database["public"]["Enums"]["record_status"]; joining_open?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; slug?: string | null; status?: Database["public"]["Enums"]["record_status"]; joining_open?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      teams: {
        Row: { id: string; organization_id: string; name: string; slug: string; club_code: string | null; city: string; state: string; timezone: string; owner_phone: string; primary_facility: string | null; season_type: string | null; logo_url: string | null; status: Database["public"]["Enums"]["record_status"]; is_test_team: boolean; archived_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; name: string; slug?: string; club_code?: string | null; city?: string; state?: string; timezone?: string; owner_phone?: string; primary_facility?: string | null; season_type?: string | null; logo_url?: string | null; status?: Database["public"]["Enums"]["record_status"]; is_test_team?: boolean; archived_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; organization_id?: string; name?: string; slug?: string; club_code?: string | null; city?: string; state?: string; timezone?: string; owner_phone?: string; primary_facility?: string | null; season_type?: string | null; logo_url?: string | null; status?: Database["public"]["Enums"]["record_status"]; is_test_team?: boolean; archived_at?: string | null; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "teams_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }];
      };
      profiles: {
        Row: { id: string; first_name: string; last_name: string; email: string; created_at: string; updated_at: string };
        Insert: { id: string; first_name: string; last_name: string; email: string; created_at?: string; updated_at?: string };
        Update: { id?: string; first_name?: string; last_name?: string; email?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      team_memberships: {
        Row: { id: string; team_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; status: Database["public"]["Enums"]["record_status"]; can_assign_access: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; status?: Database["public"]["Enums"]["record_status"]; can_assign_access?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; team_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; status?: Database["public"]["Enums"]["record_status"]; can_assign_access?: boolean; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "team_memberships_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }, { foreignKeyName: "team_memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      subscription_plans: {
        Row: { id: string; public_key: string | null; name: string; description: string; monthly_price_cents: number; module_keys: string[]; active: boolean; display_order: number; created_at: string };
        Insert: { id: string; public_key?: string | null; name: string; description: string; monthly_price_cents: number; module_keys: string[]; active?: boolean; display_order?: number; created_at?: string };
        Update: { id?: string; public_key?: string | null; name?: string; description?: string; monthly_price_cents?: number; module_keys?: string[]; active?: boolean; display_order?: number; created_at?: string };
        Relationships: [];
      };
      team_subscriptions: {
        Row: { id: string; team_id: string; plan_id: string; status: string; billing_mode: string; starts_at: string; trial_ends_at: string | null; cancelled_at: string | null; created_at: string };
        Insert: { id?: string; team_id: string; plan_id: string; status: string; billing_mode?: string; starts_at?: string; trial_ends_at?: string | null; cancelled_at?: string | null; created_at?: string };
        Update: { id?: string; team_id?: string; plan_id?: string; status?: string; billing_mode?: string; starts_at?: string; trial_ends_at?: string | null; cancelled_at?: string | null; created_at?: string };
        Relationships: [{ foreignKeyName: "team_subscriptions_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }, { foreignKeyName: "team_subscriptions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "subscription_plans"; referencedColumns: ["id"] }];
      };
      mock_checkout_sessions: {
        Row: { id: string; user_id: string; plan_id: string; public_plan_key: string | null; team_name: string; club_slug: string | null; club_code: string | null; city: string | null; state: string | null; timezone: string; owner_phone: string | null; primary_facility: string | null; status: string; team_id: string | null; created_at: string; completed_at: string | null; expires_at: string };
        Insert: { id?: string; user_id: string; plan_id: string; public_plan_key?: string | null; team_name: string; club_slug?: string | null; club_code?: string | null; city?: string | null; state?: string | null; timezone: string; owner_phone?: string | null; primary_facility?: string | null; status?: string; team_id?: string | null; created_at?: string; completed_at?: string | null; expires_at?: string };
        Update: { id?: string; user_id?: string; plan_id?: string; public_plan_key?: string | null; team_name?: string; club_slug?: string | null; club_code?: string | null; city?: string | null; state?: string | null; timezone?: string; owner_phone?: string | null; primary_facility?: string | null; status?: string; team_id?: string | null; created_at?: string; completed_at?: string | null; expires_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      begin_mock_checkout: { Args: { requested_public_plan: string; requested_team_name: string; requested_slug: string; requested_club_code: string | null; requested_city: string; requested_state: string; requested_timezone: string; requested_owner_phone: string; requested_primary_facility: string | null }; Returns: string };
      complete_mock_checkout: { Args: { target_checkout_id: string }; Returns: string };
      internal_plan_id: { Args: { public_plan: string }; Returns: string };
      update_club_profile: { Args: { target_team_id: string; requested_name: string; requested_slug: string; requested_club_code: string | null; requested_city: string; requested_state: string; requested_timezone: string; requested_owner_phone: string; requested_primary_facility: string | null; requested_season_type: string | null; requested_logo_url: string | null }; Returns: Database["public"]["Tables"]["teams"]["Row"] };
      get_team_setup_checklist: { Args: { target_team_id: string }; Returns: Json };
      update_own_profile_names: { Args: { requested_first_name: string; requested_last_name: string }; Returns: undefined };
    };
    Enums: {
      record_status: "ACTIVE" | "INACTIVE";
      membership_role: "OWNER" | "ADMIN" | "COACH" | "PARENT";
      practice_status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      attendance_status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEFT_EARLY" | "NOT_SCHEDULED";
      checkin_method: "COACH" | "SELF" | "PARENT" | "ADMIN" | "IMPORT";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
