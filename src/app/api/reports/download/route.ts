import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generatePDF, generatePDFFilename } from "@/lib/pdf-generator";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 5 PDF downloads per hour per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`download-${clientIP}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many download requests. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get("scanId");

    if (!scanId) {
      return NextResponse.json(
        { error: "Scan ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch scan data to verify it exists and is completed
    const { data: scanData, error } = await supabase
      .from("scans")
      .select("id, url, status, user_id")
      .eq("id", scanId)
      .single();

    if (error || !scanData) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scanData.status !== "completed") {
      return NextResponse.json(
        { error: "Scan is not completed yet" },
        { status: 400 }
      );
    }

    // Check if user is authenticated and owns the scan
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Allow access if:
    // 1. Scan has no user_id (anonymous scan)
    // 2. User is authenticated and owns the scan
    if (scanData.user_id && (!user || user.id !== scanData.user_id)) {
      return NextResponse.json(
        { error: "Unauthorized access to this scan" },
        { status: 403 }
      );
    }
    // Generate PDF
    const pdfBuffer = await generatePDF({ scanId });
    const filename = generatePDFFilename(scanData.url, scanId);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF download error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}
