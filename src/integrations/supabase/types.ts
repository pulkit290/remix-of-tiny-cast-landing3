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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_type: string
          agent_run_id: string
          description: string | null
          id: string
          input_data: Json | null
          result: string | null
          sequence: number
          target: string | null
          timestamp: string
        }
        Insert: {
          action_type: string
          agent_run_id: string
          description?: string | null
          id?: string
          input_data?: Json | null
          result?: string | null
          sequence: number
          target?: string | null
          timestamp?: string
        }
        Update: {
          action_type?: string
          agent_run_id?: string
          description?: string | null
          id?: string
          input_data?: Json | null
          result?: string | null
          sequence?: number
          target?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          browser_session_id: string | null
          completed_at: string | null
          current_action: string | null
          current_url: string | null
          id: string
          outcome: string | null
          started_at: string | null
          status: string
          test_run_id: string
        }
        Insert: {
          agent_id: string
          browser_session_id?: string | null
          completed_at?: string | null
          current_action?: string | null
          current_url?: string | null
          id?: string
          outcome?: string | null
          started_at?: string | null
          status?: string
          test_run_id: string
        }
        Update: {
          agent_id?: string
          browser_session_id?: string | null
          completed_at?: string | null
          current_action?: string | null
          current_url?: string | null
          id?: string
          outcome?: string | null
          started_at?: string | null
          status?: string
          test_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "test_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          dodo_customer_id: string | null
          dodo_subscription_id: string | null
          period_end: string | null
          plan: string
          run_credits: number
          runs_included: number
          runs_used: number
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          period_end?: string | null
          plan?: string
          run_credits?: number
          runs_included?: number
          runs_used?: number
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          dodo_customer_id?: string | null
          dodo_subscription_id?: string | null
          period_end?: string | null
          plan?: string
          run_credits?: number
          runs_included?: number
          runs_used?: number
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id: string
          payload: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          app_url: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          app_url: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          app_url?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      screenshots: {
        Row: {
          action_id: string | null
          action_sequence: number | null
          agent_run_id: string | null
          created_at: string
          id: string
          storage_path: string | null
          test_run_id: string
          url: string | null
        }
        Insert: {
          action_id?: string | null
          action_sequence?: number | null
          agent_run_id?: string | null
          created_at?: string
          id?: string
          storage_path?: string | null
          test_run_id: string
          url?: string | null
        }
        Update: {
          action_id?: string | null
          action_sequence?: number | null
          agent_run_id?: string | null
          created_at?: string
          id?: string
          storage_path?: string | null
          test_run_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screenshots_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "agent_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshots_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_agents: {
        Row: {
          account_email: string | null
          account_username: string | null
          created_at: string
          goal: string
          id: string
          memory: Json
          name: string
          role: string
          scenario_id: string
          system_instructions: string | null
        }
        Insert: {
          account_email?: string | null
          account_username?: string | null
          created_at?: string
          goal: string
          id?: string
          memory?: Json
          name: string
          role: string
          scenario_id: string
          system_instructions?: string | null
        }
        Update: {
          account_email?: string | null
          account_username?: string | null
          created_at?: string
          goal?: string
          id?: string
          memory?: Json
          name?: string
          role?: string
          scenario_id?: string
          system_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_agents_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      test_issues: {
        Row: {
          created_at: string
          description: string | null
          evidence: Json | null
          id: string
          reproduction_steps: Json | null
          severity: string
          status: string
          test_run_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence?: Json | null
          id?: string
          reproduction_steps?: Json | null
          severity?: string
          status?: string
          test_run_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence?: Json | null
          id?: string
          reproduction_steps?: Json | null
          severity?: string
          status?: string
          test_run_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_issues_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_reports: {
        Row: {
          created_at: string
          id: string
          report: Json
          share_token: string | null
          test_run_id: string
          verdict: string
        }
        Insert: {
          created_at?: string
          id?: string
          report: Json
          share_token?: string | null
          test_run_id: string
          verdict: string
        }
        Update: {
          created_at?: string
          id?: string
          report?: Json
          share_token?: string | null
          test_run_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_reports_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: true
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          failure_reason: string | null
          id: string
          scenario_id: string
          started_at: string | null
          status: string
          summary: string | null
          unlocked_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          failure_reason?: string | null
          id?: string
          scenario_id: string
          started_at?: string | null
          status?: string
          summary?: string | null
          unlocked_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          failure_reason?: string | null
          id?: string
          scenario_id?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "test_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scenarios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_project: { Args: { _project_id: string }; Returns: boolean }
      owns_run: { Args: { _run_id: string }; Returns: boolean }
      owns_scenario: { Args: { _scenario_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
