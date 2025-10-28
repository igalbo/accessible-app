import { Card } from "@/components/ui/card";

interface DashboardStatsProps {
  totalScans: number;
  completedScans: number;
  averageScore: number;
  pendingScans: number;
}

export function DashboardStats({
  totalScans,
  completedScans,
  averageScore,
  pendingScans,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
      <Card className="p-6">
        <div className="text-2xl font-bold text-primary">{totalScans}</div>
        <div className="text-sm text-muted-foreground">Total Scans</div>
      </Card>

      <Card className="p-6">
        <div className="text-2xl font-bold text-green-600">
          {completedScans}
        </div>
        <div className="text-sm text-muted-foreground">Completed</div>
      </Card>

      <Card className="p-6">
        <div className="text-2xl font-bold text-blue-600">{averageScore}%</div>
        <div className="text-sm text-muted-foreground">Avg Score</div>
      </Card>

      <Card className="p-6">
        <div className="text-2xl font-bold text-orange-600">{pendingScans}</div>
        <div className="text-sm text-muted-foreground">Pending</div>
      </Card>
    </div>
  );
}
