import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateAccessibilityScore } from "@/lib/axe-core";
import { DatabaseService } from "@/lib/database";

const saveResultsSchema = z.object({
  scanId: z.string().uuid(),
  violations: z.array(z.any()),
  passes: z.array(z.any()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId, violations, passes } = saveResultsSchema.parse(body);

    console.log(`[Save Results] Saving scan results for ${scanId}`);

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
