import Link from "next/link";
import type { Scan } from "@/types/scan";

interface ScanHistoryTableProps {
  scans: Scan[];
}

export function ScanHistoryTable({ scans }: ScanHistoryTableProps) {
  return (
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
          {scans.map((scan) => (
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
  );
}
