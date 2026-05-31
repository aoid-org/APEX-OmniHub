/**
 * Supabase database types — manually maintained until `supabase gen types typescript` is wired to CI.
 * To regenerate: npx supabase gen types typescript --project-id rtopreovkywofgwgmozi > src/integrations/supabase/types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      physiomni_telemetry: {
        Row: {
          id: string;
          tenant_id: string;
          device_serial: string;
          vibration_x: number;
          vibration_y: number;
          vibration_z: number;
          temperature_c: number;
          captured_at: string;
          received_at: string;
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['physiomni_telemetry']['Row'], 'id' | 'received_at'> & {
          id?: string;
          received_at?: string;
        };
        Update: Partial<Database['public']['Tables']['physiomni_telemetry']['Insert']>;
      };
      omnihub_audit_log: {
        Row: {
          id: string;
          action: string;
          tenant_id: string;
          actor_id: string;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['omnihub_audit_log']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['omnihub_audit_log']['Insert']>;
      };
      physiomni_devices: {
        Row: {
          id: string;
          tenant_id: string;
          device_serial: string;
          device_name: string | null;
          firmware_version: string | null;
          location_tag: string | null;
          metadata: Json;
          is_active: boolean;
          registered_at: string;
          last_seen_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['physiomni_devices']['Row'], 'id' | 'registered_at'> & {
          id?: string;
          registered_at?: string;
        };
        Update: Partial<Database['public']['Tables']['physiomni_devices']['Insert']>;
      };
      physiomni_device_commands: {
        Row: {
          id: string;
          device_id: string;
          tenant_id: string;
          command: string;
          status: string;
          approved_by: string | null;
          bypass_policy: string | null;
          queued_at: string;
          acknowledged_at: string | null;
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['physiomni_device_commands']['Row'], 'id' | 'queued_at'> & {
          id?: string;
          queued_at?: string;
        };
        Update: Partial<Database['public']['Tables']['physiomni_device_commands']['Insert']>;
      };
      omnihub_model_registry: {
        Row: {
          id: string;
          tenant_id: string;
          provider_id: string;
          provider_type: string;
          allowed_models: string[];
          max_cost_usd: number;
          max_latency_ms: number;
          retention_mode: string;
          pii_policy: string;
          tool_use_permissions: string[];
          auth_secret_ref: string;
          endpoint: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['omnihub_model_registry']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['omnihub_model_registry']['Insert']>;
      };
      ingress_buffer: {
        Row: {
          id: string;
          correlation_id: string;
          raw_input: Json;
          error_reason: string;
          status: string;
          risk_score: number;
          created_at: string;
          retry_count: number;
          last_retry_at: string | null;
          source_type: string | null;
          user_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['ingress_buffer']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ingress_buffer']['Insert']>;
      };
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
