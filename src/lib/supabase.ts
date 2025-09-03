import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = (() => {
  if (!supabaseServiceRoleKey) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will not work."
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
})();

// Database types
export interface Database {
  public: {
    Tables: {
      scans: {
        Row: {
          id: string;
          user_id: string | null;
          url: string;
          status: "pending" | "completed" | "failed";
          score: number | null;
          result_json: any | null;
          error: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          url: string;
          status?: "pending" | "completed" | "failed";
          score?: number | null;
          result_json?: any | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          url?: string;
          status?: "pending" | "completed" | "failed";
          score?: number | null;
          result_json?: any | null;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
  };
}

export type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
export type ScanInsert = Database["public"]["Tables"]["scans"]["Insert"];
export type ScanUpdate = Database["public"]["Tables"]["scans"]["Update"];
