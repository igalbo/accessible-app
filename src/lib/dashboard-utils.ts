import type { Scan } from "@/types/scan";

export interface DashboardStats {
  totalScans: number;
  completedScans: number;
  averageScore: number;
  pendingScans: number;
}

export function calculateDashboardStats(scans: Scan[]): DashboardStats {
  const totalScans = scans.length;
  const completedScans = scans.filter((scan) => scan.status === "completed");
  const averageScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, scan) => sum + (scan.score || 0), 0) /
            completedScans.length
        )
      : 0;
  const pendingScans = scans.filter((scan) => scan.status === "pending").length;

  return {
    totalScans,
    completedScans: completedScans.length,
    averageScore,
    pendingScans,
  };
}
