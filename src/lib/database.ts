import { supabaseAdmin } from "./supabase";
import { ScanRow, ScanInsert, ScanUpdate } from "./supabase";

interface ViolationNode {
  html?: string;
  target?: string[];
  failureSummary?: string;
}

interface Violation {
  id: string;
  impact?: string;
  description: string;
  help?: string;
  helpUrl?: string;
  nodes?: ViolationNode[];
}

interface Pass {
  id: string;
  description?: string;
}

export interface ScanResult {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score?: number;
  violations?: Violation[];
  passes?: Pass[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  userId?: string | null;
}

// Convert Supabase row to our ScanResult interface
function mapScanRowToResult(row: ScanRow): ScanResult {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    score: row.score || undefined,
    violations: row.result_json?.violations as Violation[] | undefined,
    passes: row.result_json?.passes as Pass[] | undefined,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error || undefined,
    userId: row.user_id,
  };
}

// Convert our ScanResult to Supabase insert format
function mapResultToScanInsert(result: ScanResult): ScanInsert {
  return {
    id: result.id,
    user_id: result.userId || null,
    url: result.url,
    status: result.status,
    score: result.score || null,
    result_json:
      result.violations || result.passes
        ? {
            violations: result.violations || [],
            passes: result.passes || [],
          }
        : null,
    error: result.error || null,
    created_at: result.createdAt.toISOString(),
    completed_at: result.completedAt?.toISOString() || null,
  };
}

// Convert our ScanResult to Supabase update format
function mapResultToScanUpdate(result: Partial<ScanResult>): ScanUpdate {
  const update: ScanUpdate = {};

  if (result.status !== undefined) update.status = result.status;
  if (result.score !== undefined) update.score = result.score;
  if (result.error !== undefined) update.error = result.error;
  if (result.completedAt !== undefined) {
    update.completed_at = result.completedAt?.toISOString() || null;
  }
  if (result.violations !== undefined || result.passes !== undefined) {
    update.result_json = {
      violations: result.violations || [],
      passes: result.passes || [],
    };
  }

  return update;
}

export class DatabaseService {
  // Create a new scan
  static async createScan(scanResult: ScanResult): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const insertData = mapResultToScanInsert(scanResult);

    const { error } = await supabaseAdmin.from("scans").insert(insertData);

    if (error) {
      console.error("Error creating scan:", error);
      throw new Error(`Failed to create scan: ${error.message}`);
    }
  }

  // Get a scan by ID
  static async getScan(id: string): Promise<ScanResult | null> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching scan:", error);
      throw new Error(`Failed to fetch scan: ${error.message}`);
    }

    return mapScanRowToResult(data);
  }

  // Update a scan
  static async updateScan(
    id: string,
    updates: Partial<ScanResult>
  ): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const updateData = mapResultToScanUpdate(updates);

    const { error } = await supabaseAdmin
      .from("scans")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating scan:", error);
      throw new Error(`Failed to update scan: ${error.message}`);
    }
  }
}
