export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string;
          event_data: Json;
          event_type: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_data?: Json;
          event_type: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_data?: Json;
          event_type?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      generation_error_logs: {
        Row: {
          created_at: string;
          error_message: string;
          error_stack: string | null;
          error_type: string;
          generation_id: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error_message: string;
          error_stack?: string | null;
          error_type: string;
          generation_id?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error_message?: string;
          error_stack?: string | null;
          error_type?: string;
          generation_id?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_error_logs_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
        ];
      };
      generations: {
        Row: {
          created_at: string;
          duration_ms: number;
          id: string;
          model: string;
          prompt_data: Json | null;
          response_data: Json | null;
          session_id: string | null;
          status: Database["public"]["Enums"]["generation_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_ms: number;
          id?: string;
          model: string;
          prompt_data?: Json | null;
          response_data?: Json | null;
          session_id?: string | null;
          status: Database["public"]["Enums"]["generation_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number;
          id?: string;
          model?: string;
          prompt_data?: Json | null;
          response_data?: Json | null;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["generation_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          ai_comment: string | null;
          created_at: string;
          id: string;
          is_ai_generated: boolean;
          is_modified: boolean;
          rpe: number | null;
          session_date: string;
          set_1: number | null;
          set_2: number | null;
          set_3: number | null;
          set_4: number | null;
          set_5: number | null;
          status: Database["public"]["Enums"]["session_status"];
          total_reps: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_comment?: string | null;
          created_at?: string;
          id?: string;
          is_ai_generated?: boolean;
          is_modified?: boolean;
          rpe?: number | null;
          session_date?: string;
          set_1?: number | null;
          set_2?: number | null;
          set_3?: number | null;
          set_4?: number | null;
          set_5?: number | null;
          status?: Database["public"]["Enums"]["session_status"];
          total_reps?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_comment?: string | null;
          created_at?: string;
          id?: string;
          is_ai_generated?: boolean;
          is_modified?: boolean;
          rpe?: number | null;
          session_date?: string;
          set_1?: number | null;
          set_2?: number | null;
          set_3?: number | null;
          set_4?: number | null;
          set_5?: number | null;
          status?: Database["public"]["Enums"]["session_status"];
          total_reps?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      generation_status: "success" | "timeout" | "error";
      session_status: "planned" | "in_progress" | "completed" | "failed";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      generation_status: ["success", "timeout", "error"],
      session_status: ["planned", "in_progress", "completed", "failed"],
    },
  },
} as const;
