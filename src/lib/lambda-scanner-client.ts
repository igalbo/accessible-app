/**
 * Client-side Lambda scanner
 * Calls Lambda directly from the browser to bypass Vercel's serverless timeout
 */

import { AxeViolation, AxePass } from "./axe-core";

export interface LambdaScanResults {
  success: boolean;
  url: string;
  violations: AxeViolation[];
  passes: AxePass[];
  timestamp: string;
  error?: string;
}

/**
 * Scans a URL using the Lambda function (client-side)
 */
export async function scanWithLambdaClient(
  url: string
): Promise<LambdaScanResults> {
  const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_SCANNER_URL;

  if (!lambdaUrl) {
    throw new Error(
      "NEXT_PUBLIC_LAMBDA_SCANNER_URL environment variable is not set"
    );
  }

  console.log(`[Lambda Scanner Client] Scanning ${url}`);

  try {
    // Set a timeout of 75 seconds (Lambda timeout is 60s + buffer)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);

    const response = await fetch(lambdaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lambda returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Lambda scan failed");
    }

    console.log(
      `[Lambda Scanner Client] Completed: ${data.violations.length} violations, ${data.passes.length} passes`
    );

    return data;
  } catch (error) {
    console.error("[Lambda Scanner Client] Error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Scan timed out. The website may be too slow to load.");
    }

    throw new Error(
      `Lambda scan failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
