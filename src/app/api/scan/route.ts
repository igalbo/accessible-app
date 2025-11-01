import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService, ScanResult } from "@/lib/database";
import { createClient } from "@/utils/supabase/server";

const scanRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = scanRequestSchema.parse(body);

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check for recent scan within 15 minutes
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);

    const { data: recentScanData, error: recentScanError } = await supabase
      .from("scans")
      .select(
        "id, url, status, score, result_json, created_at, completed_at, error"
      )
      .eq("url", url)
      .eq("status", "completed")
      .gte("completed_at", cutoffTime.toISOString())
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (recentScanData && !recentScanError) {
      const recentScan = {
        id: recentScanData.id,
        url: recentScanData.url,
        status: recentScanData.status,
        score: recentScanData.score ?? 0,
        violations: recentScanData.result_json?.violations,
        passes: recentScanData.result_json?.passes,
        createdAt: recentScanData.created_at,
        completedAt: recentScanData.completed_at,
        error: recentScanData.error,
      };

      return NextResponse.json({
        scanId: recentScan.id,
        status: "completed",
        message: "Returning cached scan result",
        cached: true,
        lastScanned: recentScan.completedAt,
      });
    }

    const scanId = uuidv4();
    const scanResult: ScanResult = {
      id: scanId,
      url,
      status: "pending",
      createdAt: new Date(),
      userId: user?.id || null,
    };

    // Save initial scan result to database
    await DatabaseService.createScan(scanResult);

    // Return scan ID - frontend will call Lambda directly
    return NextResponse.json({
      scanId,
      status: "pending",
      message: "Scan record created - frontend will perform scan",
      cached: false,
    });
  } catch (error) {
    console.error("Scan initiation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate scan" },
      { status: 500 }
    );
  }
}
