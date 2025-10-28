import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ReportTemplate } from "@/components/report-template";

interface ReportPageProps {
  params: Promise<{ scanId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { scanId } = await params;

  // Use service role client to bypass RLS for PDF generation
  // This is safe because the report page is only used for server-side PDF generation
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Fetch scan data
  const { data: scanData, error } = await supabase
    .from("scans")
    .select(
      "id, url, status, score, result_json, created_at, completed_at, error"
    )
    .eq("id", scanId)
    .single();

  if (error || !scanData || scanData.status !== "completed") {
    console.error("Report page error:", error);
    notFound();
  }

  // Convert database row to our expected format
  const scanResult = {
    id: scanData.id,
    url: scanData.url,
    status: scanData.status,
    score: scanData.score,
    violations: scanData.result_json?.violations || [],
    passes: scanData.result_json?.passes || [],
    createdAt: scanData.created_at,
    completedAt: scanData.completed_at,
    error: scanData.error,
  };

  return (
    <ReportTemplate
      scanResult={scanResult}
      accessibeLink={process.env.ACCESSIBE_LINK || "https://www.accessibe.com"}
    />
  );
}
