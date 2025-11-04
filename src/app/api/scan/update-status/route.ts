import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseService } from "@/lib/database";

const updateStatusSchema = z.object({
  scanId: z.string().uuid(),
  status: z.enum(["pending", "completed", "failed"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanId, status } = updateStatusSchema.parse(body);

    console.log(`[Update Status] Updating scan ${scanId} to status: ${status}`);

    await DatabaseService.updateScan(scanId, {
      status,
    });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("[Update Status] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update scan status" },
      { status: 500 }
    );
  }
}
