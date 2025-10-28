export interface Scan {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score: number | null;
  created_at: string;
  completed_at: string | null;
}
