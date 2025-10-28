import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ScanHistory } from "@/components/dashboard/ScanHistory";
import { calculateDashboardStats } from "@/lib/dashboard-utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch user's scans directly using server client (no need for API call)
  const { data: scans, error: scansError } = await supabase
    .from("scans")
    .select("id, url, status, score, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (scansError) {
    console.error("Error fetching scans:", scansError);
  }

  const userScans = scans || [];

  // Calculate stats
  const stats = calculateDashboardStats(userScans);

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader userEmail={user.email || ""} />

      <DashboardStats
        totalScans={stats.totalScans}
        completedScans={stats.completedScans}
        averageScore={stats.averageScore}
        pendingScans={stats.pendingScans}
      />

      <ScanHistory scans={userScans} />
    </div>
  );
}
