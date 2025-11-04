import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateAccessibilityScore } from "@/lib/axe-core";
import { DatabaseService } from "@/lib/database";

const saveResultsSchema = z.object({
  scanId: z.string().uuid(),
  status: z.enum(["completed", "failed"]).optional(),
  violations: z.array(z.any()).optional(),
  passes: z.array(z.any()).optional(),
  error: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId, status, violations, passes, error } =
      saveResultsSchema.parse(body);

    console.log(`[Save Results] Saving scan results for ${scanId}`);

    // If status is explicitly failed, update with error
    if (status === "failed") {
      await DatabaseService.updateScan(scanId, {
        status: "failed",
        error: error || "Scan failed",
        completedAt: new Date(),
      });

      console.log(`[Save Results] Marked scan as failed: ${error}`);

      return NextResponse.json({
        success: true,
        status: "failed",
      });
    }

    // Otherwise, process as successful scan
    if (!violations || !passes) {
      throw new Error("Violations and passes are required for completed scans");
    }

    // Calculate score
    const score = calculateAccessibilityScore(violations, passes);

    // Update scan result in database
    await DatabaseService.updateScan(scanId, {
      status: "completed",
      score,
      violations,
      passes,
      completedAt: new Date(),
    });

    console.log(
      `[Save Results] Saved: ${violations.length} violations, score: ${score}`
    );

    return NextResponse.json({
      success: true,
      score,
      status: "completed",
    });
  } catch (error) {
    console.error("[Save Results] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save scan results" },
      { status: 500 }
    );
  }
}
