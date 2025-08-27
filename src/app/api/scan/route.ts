import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { runAxeOnPage, calculateAccessibilityScore } from "@/lib/axe-core";

const scanRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

interface ScanResult {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score?: number;
  violations?: any[];
  passes?: any[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Simple file-based storage for now
const SCANS_DIR = path.join(process.cwd(), "data", "scans");

async function ensureScansDir() {
  try {
    await fs.mkdir(SCANS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function saveScanResult(scanResult: ScanResult) {
  await ensureScansDir();
  const filePath = path.join(SCANS_DIR, `${scanResult.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(scanResult, null, 2));
}

async function loadScanResult(id: string): Promise<ScanResult | null> {
  try {
    const filePath = path.join(SCANS_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

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

    // Save initial scan result
    await saveScanResult(scanResult);

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
    const scanResult: ScanResult = {
      id: scanId,
      url,
      status: "completed",
      score,
      violations,
      passes,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    await saveScanResult(scanResult);
  } catch (error) {
    console.error("Scan error:", error);

    // Save error result
    const scanResult: ScanResult = {
      id: scanId,
      url,
      status: "failed",
      createdAt: new Date(),
      completedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    await saveScanResult(scanResult);
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

    const scanResult = await loadScanResult(scanId);

    if (!scanResult) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json(scanResult);
  } catch (error) {
    console.error("Get scan error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve scan" },
      { status: 500 }
    );
  }
}
