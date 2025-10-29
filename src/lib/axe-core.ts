/**
 * Axe-core accessibility testing utilities
 * This module handles loading and running axe-core for accessibility scanning
 */

import { Page } from "playwright";
import axeCore from "axe-core";
import { readFileSync } from "fs";
import { join } from "path";

export interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
    screenshot?: string; // Path to screenshot file
  }>;
}

export interface AxePass {
  id: string;
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: AxePass[];
}

/**
 * Gets the latest axe-core version from CDN API
 */
async function getLatestAxeVersion(): Promise<string | null> {
  try {
    const response = await fetch("https://api.cdnjs.com/libraries/axe-core");
    if (response.ok) {
      const data = await response.json();
      return data.version;
    }
  } catch (error) {
    console.warn("Failed to fetch latest axe-core version:", error);
  }
  return null;
}

/**
 * Gets the axe-core script from CDN
 */
async function getAxeCoreScriptFromCDN(
  version: string
): Promise<string | null> {
  try {
    const url = `https://cdnjs.cloudflare.com/ajax/libs/axe-core/${version}/axe.min.js`;
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Downloaded axe-core v${version} from CDN`);
      return await response.text();
    }
  } catch (error) {
    console.warn(`Failed to fetch axe-core v${version} from CDN:`, error);
  }
  return null;
}

/**
 * Captures screenshots of elements with violations
 */
async function captureViolationScreenshots(
  page: Page,
  violations: AxeViolation[],
  scanId: string
): Promise<AxeViolation[]> {
  const screenshotDir = join(process.cwd(), "public", "screenshots");
  const capturedElements = new Set<string>(); // Track elements to avoid duplicates

  const violationsWithScreenshots = await Promise.all(
    violations.map(async (violation) => {
      const nodesWithScreenshots = await Promise.all(
        violation.nodes.map(async (node) => {
          // Create a unique identifier for the element to avoid duplicates
          const elementId = node.target.join(",");

          if (capturedElements.has(elementId)) {
            // Element already captured, skip screenshot but still include the node
            return node;
          }

          try {
            // Try to find and screenshot the element
            const element = await page.locator(node.target[0]).first();

            if (await element.isVisible()) {
              const screenshotFilename = `${scanId}-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}.png`;
              const screenshotPath = join(screenshotDir, screenshotFilename);

              // Take screenshot of the element
              await element.screenshot({ path: screenshotPath });

              // Mark this element as captured
              capturedElements.add(elementId);

              return {
                ...node,
                screenshot: `/screenshots/${screenshotFilename}`,
              };
            }
          } catch (error) {
            console.warn(
              `Failed to screenshot element ${node.target[0]}:`,
              error
            );
          }

          return node;
        })
      );

      return {
        ...violation,
        nodes: nodesWithScreenshots,
      };
    })
  );

  return violationsWithScreenshots;
}

/**
 * Runs axe-core accessibility checks on a Playwright page
 * Uses axe.run() directly - checks version and uses latest if needed
 */
export async function runAxeOnPage(
  page: Page,
  scanId?: string
): Promise<AxeResults> {
  const installedVersion = axeCore.version;
  const latestVersion = await getLatestAxeVersion();

  console.log(`Installed axe-core version: ${installedVersion}`);
  console.log(`Latest axe-core version: ${latestVersion}`);

  // Determine which version to use
  let axeCoreScript: string | null = null;

  // If versions don't match, download the latest
  if (installedVersion === latestVersion || !latestVersion) {
    console.log("Versions match. Using installed version");
    const axeCorePath = join(
      process.cwd(),
      "node_modules",
      "axe-core",
      "axe.min.js"
    );
    axeCoreScript = readFileSync(axeCorePath, "utf8");
  } else {
    console.log(
      `Version mismatch. Downloading latest version: ${latestVersion}`
    );
    axeCoreScript = await getAxeCoreScriptFromCDN(latestVersion);
  }

  if (!axeCoreScript) {
    throw new Error("Failed to load axe-core from any source");
  }

  await page.addScriptTag({ content: axeCoreScript });

  const results = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      // @ts-expect-error - axe is injected globally
      if (typeof axe === "undefined") {
        reject(new Error("axe-core not loaded"));
        return;
      }

      // @ts-expect-error - axe is injected globally
      axe.run(
        (
          err: Error | null,
          results: { violations: unknown[]; passes: unknown[] }
        ) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  });

  let violations =
    (results as { violations: AxeViolation[]; passes: AxePass[] }).violations ||
    [];
  const passes =
    (results as { violations: AxeViolation[]; passes: AxePass[] }).passes || [];

  // Capture screenshots if enabled via environment variable, scanId is provided, and there are violations
  const screenshotsEnabled = process.env.ENABLE_SCREENSHOTS === "true";
  if (screenshotsEnabled && scanId && violations.length > 0) {
    console.log(`Capturing screenshots for ${violations.length} violations...`);
    violations = await captureViolationScreenshots(page, violations, scanId);
  }

  return {
    violations,
    passes,
  };
}

/**
 * Calculates accessibility score based on violations and passes
 */
export function calculateAccessibilityScore(
  violations: AxeViolation[],
  passes: AxePass[]
): number {
  if (!violations || !passes) return 0;

  // Simple scoring algorithm
  const totalChecks = violations.length + passes.length;
  if (totalChecks === 0) return 100;

  // Weight violations by impact
  const weightedViolations = violations.reduce((sum, violation) => {
    const weight =
      violation.impact === "critical"
        ? 4
        : violation.impact === "serious"
        ? 3
        : violation.impact === "moderate"
        ? 2
        : 1;
    return sum + (violation.nodes?.length || 1) * weight;
  }, 0);

  const maxPossibleScore = totalChecks * 4; // Assuming all could be critical
  const score = Math.max(
    0,
    Math.round(100 - (weightedViolations / maxPossibleScore) * 100)
  );

  return Math.min(100, score);
}
