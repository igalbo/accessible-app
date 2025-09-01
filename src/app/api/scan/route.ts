import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { runAxeOnPage, calculateAccessibilityScore } from "@/lib/axe-core";
import { DatabaseService, ScanResult } from "@/lib/database";

const scanRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = scanRequestSchema.parse(body);

    const scanId = uuidv4();
    const scanResult: ScanResult = {
      id: scanId,
      url,
      status: "pending",
      createdAt: new Date(),
    };

    // Save initial scan result to database
    await DatabaseService.createScan(scanResult);

    // Start scanning in background (don't await)
    performScan(scanId, url).catch(console.error);

    return NextResponse.json({
      scanId,
      status: "pending",
      message: "Scan initiated successfully",
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
      ],
    });

    const context = await browser.newContext({
      // Bypass CSP for accessibility scanning
      bypassCSP: true,
    });
    const page = await context.newPage();

    // Navigate to the page
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Run accessibility checks using the extracted axe-core functionality
    const { violations, passes } = await runAxeOnPage(page, scanId);

    // Calculate score
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get("id");

    if (!scanId) {
      return NextResponse.json(
        { error: "Scan ID is required" },
        { status: 400 }
      );
    }

    const scanResult = await DatabaseService.getScan(scanId);

    if (!scanResult) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Convert Date objects to strings for JSON serialization
    const responseData = {
      ...scanResult,
      createdAt: scanResult.createdAt.toISOString(),
      completedAt: scanResult.completedAt?.toISOString() || null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Get scan error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve scan" },
      { status: 500 }
    );
  }
}
