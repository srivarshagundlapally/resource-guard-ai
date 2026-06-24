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
  public: {
    Tables: {
      anomalies: {
        Row: {
          anomaly_type: string
          building_id: string
          created_at: string | null
          description: string | null
          floor_no: number
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resource_type: string
          room_no: number
          score: number | null
          severity: string
          timestamp: string
        }
        Insert: {
          anomaly_type: string
          building_id: string
          created_at?: string | null
          description?: string | null
          floor_no: number
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resource_type: string
          room_no: number
          score?: number | null
          severity: string
          timestamp: string
        }
        Update: {
          anomaly_type?: string
          building_id?: string
          created_at?: string | null
          description?: string | null
          floor_no?: number
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resource_type?: string
          room_no?: number
          score?: number | null
          severity?: string
          timestamp?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          building_id: string
          created_at: string | null
          id: number
          name: string | null
          total_floors: number | null
        }
        Insert: {
          address?: string | null
          building_id: string
          created_at?: string | null
          id?: number
          name?: string | null
          total_floors?: number | null
        }
        Update: {
          address?: string | null
          building_id?: string
          created_at?: string | null
          id?: number
          name?: string | null
          total_floors?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      electricity_consumption: {
        Row: {
          anomaly_label: string | null
          building_id: string
          created_at: string | null
          electricity_usage_kwh: number
          floor_no: number
          id: number
          room_no: number
          timestamp: string
        }
        Insert: {
          anomaly_label?: string | null
          building_id: string
          created_at?: string | null
          electricity_usage_kwh: number
          floor_no: number
          id?: number
          room_no: number
          timestamp: string
        }
        Update: {
          anomaly_label?: string | null
          building_id?: string
          created_at?: string | null
          electricity_usage_kwh?: number
          floor_no?: number
          id?: number
          room_no?: number
          timestamp?: string
        }
        Relationships: []
      }
      internet_consumption: {
        Row: {
          anomaly_label: string | null
          building_id: string
          created_at: string | null
          floor_no: number
          id: number
          internet_usage_gb: number
          room_no: number
          timestamp: string
        }
        Insert: {
          anomaly_label?: string | null
          building_id: string
          created_at?: string | null
          floor_no: number
          id?: number
          internet_usage_gb: number
          room_no: number
          timestamp: string
        }
        Update: {
          anomaly_label?: string | null
          building_id?: string
          created_at?: string | null
          floor_no?: number
          id?: number
          internet_usage_gb?: number
          room_no?: number
          timestamp?: string
        }
        Relationships: []
      }
      model_registry: {
        Row: {
          artifact_path: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          mae: number | null
          model_name: string
          r2_score: number | null
          resource_type: string
          rmse: number | null
          task: string
          trained_at: string | null
          version: string | null
        }
        Insert: {
          artifact_path?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mae?: number | null
          model_name: string
          r2_score?: number | null
          resource_type: string
          rmse?: number | null
          task: string
          trained_at?: string | null
          version?: string | null
        }
        Update: {
          artifact_path?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          mae?: number | null
          model_name?: string
          r2_score?: number | null
          resource_type?: string
          rmse?: number | null
          task?: string
          trained_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          actual_value: number | null
          building_id: string
          created_at: string | null
          floor_no: number | null
          id: string
          mae: number | null
          model_name: string | null
          predicted_value: number
          r2_score: number | null
          resource_type: string
          rmse: number | null
          room_no: number | null
          timestamp: string
        }
        Insert: {
          actual_value?: number | null
          building_id: string
          created_at?: string | null
          floor_no?: number | null
          id?: string
          mae?: number | null
          model_name?: string | null
          predicted_value: number
          r2_score?: number | null
          resource_type: string
          rmse?: number | null
          room_no?: number | null
          timestamp: string
        }
        Update: {
          actual_value?: number | null
          building_id?: string
          created_at?: string | null
          floor_no?: number | null
          id?: string
          mae?: number | null
          model_name?: string | null
          predicted_value?: number
          r2_score?: number | null
          resource_type?: string
          rmse?: number | null
          room_no?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          action: string
          anomaly_id: string | null
          building_id: string
          created_at: string | null
          estimated_saving: number | null
          floor_no: number | null
          id: string
          priority: number
          resource_type: string
          room_no: number | null
          saving_unit: string | null
          severity: string
          status: string | null
        }
        Insert: {
          action: string
          anomaly_id?: string | null
          building_id: string
          created_at?: string | null
          estimated_saving?: number | null
          floor_no?: number | null
          id?: string
          priority: number
          resource_type: string
          room_no?: number | null
          saving_unit?: string | null
          severity: string
          status?: string | null
        }
        Update: {
          action?: string
          anomaly_id?: string | null
          building_id?: string
          created_at?: string | null
          estimated_saving?: number | null
          floor_no?: number | null
          id?: string
          priority?: number
          resource_type?: string
          room_no?: number | null
          saving_unit?: string | null
          severity?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          resource_type: string | null
          vector_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          resource_type?: string | null
          vector_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          resource_type?: string | null
          vector_id?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          building_id: string | null
          capacity: number | null
          floor_no: number
          id: number
          room_no: number
          room_type: string | null
        }
        Insert: {
          building_id?: string | null
          capacity?: number | null
          floor_no: number
          id?: number
          room_no: number
          room_type?: string | null
        }
        Update: {
          building_id?: string | null
          capacity?: number | null
          floor_no?: number
          id?: number
          room_no?: number
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["building_id"]
          },
        ]
      }
      root_cause_analysis: {
        Row: {
          anomaly_id: string | null
          cause: string
          confidence_score: number
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          anomaly_id?: string | null
          cause: string
          confidence_score: number
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          anomaly_id?: string | null
          cause?: string
          confidence_score?: number
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_analysis_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
        ]
      }
      water_consumption: {
        Row: {
          anomaly_label: string | null
          building_id: string
          created_at: string | null
          floor_no: number
          id: number
          room_no: number
          timestamp: string
          water_usage_liters: number
        }
        Insert: {
          anomaly_label?: string | null
          building_id: string
          created_at?: string | null
          floor_no: number
          id?: number
          room_no: number
          timestamp: string
          water_usage_liters: number
        }
        Update: {
          anomaly_label?: string | null
          building_id?: string
          created_at?: string | null
          floor_no?: number
          id?: number
          room_no?: number
          timestamp?: string
          water_usage_liters?: number
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
  public: {
    Enums: {},
  },
} as const
