/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database type placeholder.
 * Replace with generated types from: supabase gen types typescript
 */
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
    };
    Views: {
      [key: string]: {
        Row: any;
      };
    };
    Functions: {
      [key: string]: {
        Args: any;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: string;
    };
    CompositeTypes: {
      [key: string]: unknown;
    };
  };
}
