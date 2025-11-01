/**
 * AWS Lambda scanner client
 * Calls the Lambda function for axe-core scanning
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
 * Scans a URL using the Lambda function
 */
export async function scanWithLambda(url: string): Promise<LambdaScanResults> {
  const lambdaUrl = process.env.LAMBDA_SCANNER_URL;

  if (!lambdaUrl) {
    throw new Error("LAMBDA_SCANNER_URL environment variable is not set");
  }

  console.log(`[Lambda Scanner] Scanning ${url}`);

  try {
    const response = await fetch(lambdaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lambda returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Lambda scan failed");
    }

    console.log(
      `[Lambda Scanner] Completed: ${data.violations.length} violations, ${data.passes.length} passes`
    );

    return data;
  } catch (error) {
    console.error("[Lambda Scanner] Error:", error);
    throw new Error(
      `Lambda scan failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
