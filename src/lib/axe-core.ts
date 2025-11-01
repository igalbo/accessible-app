/**
 * Axe-core accessibility utilities
 * Score calculation for accessibility results
 */

export interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
    screenshot?: string;
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
