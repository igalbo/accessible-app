import { Card } from "@/components/ui/card";
import { EmptyScansState } from "./EmptyScansState";
import { ScanHistoryTable } from "./ScanHistoryTable";
import { QuickScanForm } from "./QuickScanForm";
import type { Scan } from "@/types/scan";

interface ScanHistoryProps {
  scans: Scan[];
}

export function ScanHistory({ scans }: ScanHistoryProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold">Scan History</h2>
        <div className="md:flex-1 md:max-w-xl">
          <QuickScanForm />
        </div>
      </div>

      {scans.length === 0 ? (
        <EmptyScansState />
      ) : (
        <ScanHistoryTable scans={scans} />
      )}
    </Card>
  );
}
