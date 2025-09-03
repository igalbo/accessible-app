import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface Scan {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score: number | null;
  created_at: string;
  completed_at: string | null;
}

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
  const totalScans = userScans.length;
  const completedScans = userScans.filter(
    (scan) => scan.status === "completed"
  );
  const averageScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, scan) => sum + (scan.score || 0), 0) /
            completedScans.length
        )
      : 0;
  const pendingScans = userScans.filter(
    (scan) => scan.status === "pending"
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-2xl font-bold text-primary">{totalScans}</div>
          <div className="text-sm text-muted-foreground">Total Scans</div>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">
            {completedScans.length}
          </div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-blue-600">
            {averageScore}%
          </div>
          <div className="text-sm text-muted-foreground">Avg Score</div>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-orange-600">
            {pendingScans}
          </div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
      </div>

      {/* Scan History */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Scan History</h2>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            New Scan
          </Link>
        </div>

        {userScans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No scans yet</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Run Your First Scan
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">URL</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Score</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userScans.map((scan) => (
                  <tr key={scan.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="max-w-xs truncate" title={scan.url}>
                        {scan.url}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scan.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : scan.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {scan.score !== null ? `${scan.score}%` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(scan.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {scan.status === "completed" && (
                        <Link
                          href={`/scans/${scan.id}`}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          View Results
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
