import { supabaseAdmin } from "./supabase";
import { ScanRow, ScanInsert, ScanUpdate } from "./supabase";

export interface ScanResult {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score?: number;
  violations?: any[];
  passes?: any[];
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
    violations: row.result_json?.violations,
    passes: row.result_json?.passes,
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

  // Get scans for a user (for future dashboard functionality)
  static async getUserScans(userId: string, limit = 50): Promise<ScanResult[]> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching user scans:", error);
      throw new Error(`Failed to fetch user scans: ${error.message}`);
    }

    return data.map(mapScanRowToResult);
  }

  // Get recent scans (for admin/analytics)
  static async getRecentScans(limit = 100): Promise<ScanResult[]> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent scans:", error);
      throw new Error(`Failed to fetch recent scans: ${error.message}`);
    }

    return data.map(mapScanRowToResult);
  }

  // Delete a scan (for cleanup/admin)
  static async deleteScan(id: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const { error } = await supabaseAdmin.from("scans").delete().eq("id", id);

    if (error) {
      console.error("Error deleting scan:", error);
      throw new Error(`Failed to delete scan: ${error.message}`);
    }
  }

  // Get scan statistics
  static async getScanStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    averageScore: number;
  }> {
    if (!supabaseAdmin) {
      throw new Error(
        "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("status, score");

    if (error) {
      console.error("Error fetching scan stats:", error);
      throw new Error(`Failed to fetch scan stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      pending: data.filter((s) => s.status === "pending").length,
      completed: data.filter((s) => s.status === "completed").length,
      failed: data.filter((s) => s.status === "failed").length,
      averageScore: 0,
    };

    const completedWithScores = data.filter(
      (s) => s.status === "completed" && s.score !== null
    );
    if (completedWithScores.length > 0) {
      stats.averageScore = Math.round(
        completedWithScores.reduce((sum, s) => sum + (s.score || 0), 0) /
          completedWithScores.length
      );
    }

    return stats;
  }
}
