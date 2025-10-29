import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generatePDF, generatePDFFilename } from "@/lib/pdf-generator";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 email requests per hour per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`email-${clientIP}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many email requests. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const { email, scanId } = await request.json();

    if (!email || !scanId) {
      return NextResponse.json(
        { error: "Email and scan ID are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch scan data to verify it exists and is completed
    const { data: scanData, error } = await supabase
      .from("scans")
      .select("id, url, status, score, result_json, created_at, completed_at")
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

    // Store email subscriber
    const { error: subscribeError } = await supabase
      .from("email_subscribers")
      .insert({
        email,
        scan_id: scanId,
        source: "report_download",
      });

    if (subscribeError && subscribeError.code !== "23505") {
      // Ignore unique constraint violations (duplicate email+scan_id)
      console.error("Failed to store email subscriber:", subscribeError);
    }

    // Generate PDF
    const pdfBuffer = await generatePDF({ scanId });
    const filename = generatePDFFilename(scanData.url, scanId);

    // Calculate summary stats
    const violations = scanData.result_json?.violations || [];
    const totalIssues = violations.reduce(
      (total: number, violation: any) => total + (violation.nodes?.length || 0),
      0
    );

    // Send email with PDF attachment
    const emailResult = await resend.emails.send({
      from: process.env.FROM_EMAIL || "reports@yourdomain.com",
      to: [email],
      replyTo: process.env.REPLY_TO_EMAIL || "support@yourdomain.com",
      subject: `Accessibility Report for ${scanData.url}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Accessibility Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 15px;">
            <h1 style="margin: 0; font-size: 28px;">Your Accessibility Report is Ready!</h1>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 16px; color: #333;">Comprehensive analysis for</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600; color: #000;">${
              scanData.url
            }</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0; text-align: center;">Scan Summary</h2>
            <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 30px;">
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 32px; font-weight: bold; color: ${
                  scanData.score >= 90
                    ? "#27ae60"
                    : scanData.score >= 70
                    ? "#f39c12"
                    : "#e74c3c"
                };">${scanData.score || 0}</div>
                <div style="font-size: 14px; color: #7f8c8d;">Accessibility Score</div>
              </div>
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 32px; font-weight: bold; color: #e74c3c;">${totalIssues}</div>
                <div style="font-size: 14px; color: #7f8c8d;">Issues Found</div>
              </div>
              <div style="text-align: center; flex: 1; min-width: 120px;">
                <div style="font-size: 32px; font-weight: bold; color: #27ae60;">${
                  scanData.result_json?.passes?.length || 0
                }</div>
                <div style="font-size: 14px; color: #7f8c8d;">Tests Passed</div>
              </div>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <h2 style="color: #856404; margin-top: 0; margin-bottom: 10px;">📎 Your PDF Report is Attached</h2>
            <p style="color: #856404; margin: 0; font-size: 14px;">Look for the PDF file attached to this email for your complete accessibility analysis.</p>
          </div>
          
          <div style="background: white; border: 1px solid #e1e8ed; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #2c3e50; margin-top: 0;">What's in Your Report</h2>
            <ul style="padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Executive summary with accessibility score</li>
              <li style="margin-bottom: 8px;">Detailed breakdown of all issues by severity</li>
              <li style="margin-bottom: 8px;">Actionable recommendations for improvements</li>
              <li style="margin-bottom: 8px;">Professional formatting perfect for sharing</li>
            </ul>
          </div>
          
          ${
            scanData.score < 90
              ? `
          <div style="background: #e8f5e8; border-left: 4px solid #27ae60; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
            <h3 style="color: #27ae60; margin-top: 0;">Need Help Fixing These Issues?</h3>
            <p style="margin-bottom: 15px;">Consider using an automated accessibility solution that can resolve many issues instantly:</p>
            <div style="text-align: center;">
              <a href="${
                process.env.ACCESSIBE_LINK || "https://www.accessibe.com"
              }" 
                 style="display: inline-block; background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Learn About AccessiBe →
              </a>
            </div>
          </div>
          `
              : ""
          }
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e1e8ed; margin-top: 30px; color: #7f8c8d;">
            <p style="margin: 0; font-size: 14px;">This report was generated by <strong>Accessible</strong> - Web Accessibility Scanner</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
              Questions? Contact us at <a href="mailto:${
                process.env.REPLY_TO_EMAIL || "support@yourdomain.com"
              }" style="color: #667eea;">${
        process.env.REPLY_TO_EMAIL || "support@yourdomain.com"
      }</a>
            </p>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (emailResult.error) {
      console.error("Email sending failed:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
      emailId: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Failed to send report" },
      { status: 500 }
    );
  }
}
