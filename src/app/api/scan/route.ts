import { NextRequest, NextResponse } from "next/server";
import { chromium, Page } from "playwright";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { runAxeOnPage, calculateAccessibilityScore } from "@/lib/axe-core";
import { DatabaseService, ScanResult } from "@/lib/database";
import { createClient } from "@/utils/supabase/server";

const scanRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

/**
 * Navigate to a page with fallback strategy to handle timeout issues
 * First tries networkidle, then falls back to domcontentloaded
 */
async function navigateWithFallback(page: Page, url: string): Promise<void> {
  console.log(`Attempting to navigate to: ${url}`);

  try {
    // First attempt: networkidle (fastest when it works)
    console.log("Trying networkidle strategy...");
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    console.log("Successfully loaded with networkidle");
    return;
  } catch {
    console.log("Networkidle failed, trying domcontentloaded fallback...");

    try {
      // Second attempt: domcontentloaded (more reliable)
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      console.log("Successfully loaded with domcontentloaded");

      // Give a bit more time for dynamic content to load
      await page.waitForTimeout(2000);
      return;
    } catch (fallbackError) {
      console.error("Both navigation strategies failed:", fallbackError);
      throw new Error(
        `Failed to load page: ${
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown error"
        }`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = scanRequestSchema.parse(body);

    // Check if user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check for recent scan within 15 minutes that the current user can access
    // Use the user's authenticated client to respect RLS policies
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
      // Found a recent scan that the user can access
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
      userId: user?.id || null, // Associate with user if authenticated
    };

    // Save initial scan result to database
    await DatabaseService.createScan(scanResult);

    // Start scanning in background (don't await)
    performScan(scanId, url).catch(console.error);

    return NextResponse.json({
      scanId,
      status: "pending",
      message: "Scan initiated successfully",
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

async function performScan(scanId: string, url: string) {
  let browser;

  try {
    // Launch browser with disabled web security to bypass CSP restrictions
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });

    const context = await browser.newContext({
      // Bypass CSP for accessibility scanning
      bypassCSP: true,
    });
    const page = await context.newPage();

    // Navigate to the page with fallback strategy
    await navigateWithFallback(page, url);

    // Run accessibility checks using the extracted axe-core functionality
    const { violations, passes } = await runAxeOnPage(page, scanId);

    // Calculate score
    console.log("Calculating score");
    const score = calculateAccessibilityScore(violations, passes);

    // Update scan result
    await DatabaseService.updateScan(scanId, {
      status: "completed",
      score,
      violations,
      passes,
      completedAt: new Date(),
    });
  } catch (error) {
    console.error("Scan error:", error);

    // Save error result
    await DatabaseService.updateScan(scanId, {
      status: "failed",
      completedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
