import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export interface PDFGenerationOptions {
  scanId: string;
  baseUrl?: string;
}

interface ViolationNode {
  html?: string;
  target?: string[];
  failureSummary?: string;
}

interface Violation {
  id: string;
  impact?: string;
  description: string;
  help?: string;
  helpUrl?: string;
  nodes?: ViolationNode[];
}

interface Pass {
  id: string;
  description?: string;
}

interface ScanData {
  url: string;
  score: number;
  violations: Violation[];
  passes: Pass[];
  completedAt: string;
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2pt solid #e5e7eb",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#111827",
  },
  url: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 5,
    color: "#4b5563",
  },
  date: {
    fontSize: 10,
    textAlign: "center",
    color: "#6b7280",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#111827",
  },
  summaryBox: {
    backgroundColor: "#f9fafb",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "bold",
    marginRight: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 4,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  violationBox: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  violationTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  violationDescription: {
    fontSize: 10,
    marginBottom: 8,
    color: "#374151",
    lineHeight: 1.5,
  },
  violationHelp: {
    fontSize: 9,
    marginBottom: 5,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  violationMeta: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 5,
  },
  elementBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    border: "1pt solid #e5e7eb",
  },
  elementLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#374151",
  },
  elementCode: {
    fontSize: 8,
    fontFamily: "Courier",
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 2,
    color: "#1f2937",
    marginBottom: 5,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "capitalize",
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "2pt solid #e5e7eb",
    textAlign: "center",
    fontSize: 10,
    color: "#6b7280",
  },
  recommendationBox: {
    backgroundColor: "#eff6ff",
    padding: 15,
    borderRadius: 4,
    borderLeft: "4pt solid #3b82f6",
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e40af",
  },
  bullet: {
    fontSize: 10,
    marginBottom: 5,
    color: "#374151",
    lineHeight: 1.5,
  },
});

// Helper function to get color based on score
const getScoreColor = (score: number): string => {
  if (score >= 90) return "#16a34a";
  if (score >= 70) return "#ca8a04";
  return "#dc2626";
};

// Helper function to get impact colors
const getImpactColors = (impact: string) => {
  const colors = {
    critical: { border: "#dc2626", bg: "#fee2e2" },
    serious: { border: "#f97316", bg: "#ffedd5" },
    moderate: { border: "#eab308", bg: "#fef3c7" },
    minor: { border: "#3b82f6", bg: "#dbeafe" },
  };
  return (
    colors[impact as keyof typeof colors] || {
      border: "#3b82f6",
      bg: "#dbeafe",
    }
  );
};

// Create PDF Document Component
const AccessibilityReportDocument = ({ data }: { data: ScanData }) => {
  const { url, score, violations, passes, completedAt } = data;

  const groupedViolations = violations.reduce((acc, violation) => {
    const impact = violation.impact || "minor";
    if (!acc[impact]) acc[impact] = [];
    acc[impact].push(violation);
    return acc;
  }, {} as Record<string, Violation[]>);

  const impactOrder = ["critical", "serious", "moderate", "minor"];
  const totalIssues = violations.reduce(
    (total, violation) => total + (violation.nodes?.length || 0),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Accessibility Audit Report</Text>
          <Text style={styles.url}>{url}</Text>
          <Text style={styles.date}>
            Generated on {new Date(completedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.scoreContainer}>
              <Text
                style={[styles.scoreNumber, { color: getScoreColor(score) }]}
              >
                {score}
              </Text>
              <Text style={styles.scoreLabel}>Accessibility Score</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: "#dc2626" }]}>
                  {totalIssues}
                </Text>
                <Text style={styles.statLabel}>Issues Found</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: "#16a34a" }]}>
                  {passes.length}
                </Text>
                <Text style={styles.statLabel}>Tests Passed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: "#3b82f6" }]}>
                  {violations.length}
                </Text>
                <Text style={styles.statLabel}>Rule Violations</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Score Interpretation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Interpretation</Text>
          <Text style={styles.bullet}>
            • 90-100: Excellent accessibility - meets most WCAG guidelines
          </Text>
          <Text style={styles.bullet}>
            • 70-89: Good accessibility - some improvements needed
          </Text>
          <Text style={styles.bullet}>
            • 0-69: Poor accessibility - significant improvements required
          </Text>
        </View>
      </Page>

      {/* Detailed Issues - New Page */}
      {violations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Detailed Issues</Text>

          {impactOrder.map((impact) => {
            const impactViolations = groupedViolations[impact];
            if (!impactViolations?.length) return null;

            const colors = getImpactColors(impact);

            return (
              <View key={impact} style={styles.section}>
                <Text style={[styles.impactTitle, { color: colors.border }]}>
                  {impact} Issues ({impactViolations.length})
                </Text>

                {impactViolations.map((violation, index) => (
                  <View
                    key={index}
                    style={[
                      styles.violationBox,
                      {
                        backgroundColor: colors.bg,
                        borderLeftColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.violationTitle}>{violation.id}</Text>
                    <Text style={styles.violationDescription}>
                      {violation.description}
                    </Text>
                    <Text style={styles.violationMeta}>
                      Elements affected: {violation.nodes?.length || 1}
                    </Text>
                    {violation.help && (
                      <Text style={styles.violationHelp}>
                        How to fix: {violation.help}
                      </Text>
                    )}
                    {violation.helpUrl && (
                      <Text style={styles.violationHelp}>
                        Learn more: {violation.helpUrl}
                      </Text>
                    )}

                    {/* Show first 2 affected elements */}
                    {violation.nodes?.slice(0, 2).map((node, nodeIndex) => (
                      <View key={nodeIndex} style={styles.elementBox}>
                        <Text style={styles.elementLabel}>
                          Element {nodeIndex + 1}:
                        </Text>
                        <Text style={styles.elementCode}>
                          {node.html?.substring(0, 150) ||
                            node.target?.[0] ||
                            "Element location not available"}
                          {(node.html?.length || 0) > 150 ? "..." : ""}
                        </Text>
                        {node.failureSummary && (
                          <Text style={styles.violationHelp}>
                            Issue: {node.failureSummary}
                          </Text>
                        )}
                      </View>
                    ))}
                    {(violation.nodes?.length || 0) > 2 && (
                      <Text style={styles.violationMeta}>
                        ... and {violation.nodes!.length - 2} more elements
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </Page>
      )}

      {/* Recommendations - New Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Recommendations</Text>

        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>Priority Actions</Text>
          {score < 70 && (
            <>
              <Text style={styles.bullet}>
                • Focus on critical and serious issues first
              </Text>
              <Text style={styles.bullet}>
                • Implement proper heading structure (h1, h2, h3, etc.)
              </Text>
              <Text style={styles.bullet}>• Add alt text to all images</Text>
              <Text style={styles.bullet}>
                • Ensure sufficient color contrast ratios
              </Text>
            </>
          )}
          {score >= 70 && score < 90 && (
            <>
              <Text style={styles.bullet}>
                • Address remaining moderate and minor issues
              </Text>
              <Text style={styles.bullet}>• Improve keyboard navigation</Text>
              <Text style={styles.bullet}>• Add ARIA labels where needed</Text>
              <Text style={styles.bullet}>• Test with screen readers</Text>
            </>
          )}
          {score >= 90 && (
            <>
              <Text style={styles.bullet}>
                • Maintain current accessibility standards
              </Text>
              <Text style={styles.bullet}>• Regular accessibility audits</Text>
              <Text style={styles.bullet}>
                • User testing with disabled users
              </Text>
              <Text style={styles.bullet}>
                • Stay updated with WCAG guidelines
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text>
            This report was generated by Accessible - Web Accessibility Scanner
          </Text>
          <Text style={{ marginTop: 5 }}>
            For questions about this report, please contact
            support@yourdomain.com
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generatePDF({
  scanId,
}: PDFGenerationOptions): Promise<Buffer> {
  // Import database service to fetch scan data
  const { DatabaseService } = await import("./database");

  console.log(`[PDF Generator] Fetching scan data for: ${scanId}`);

  // Fetch scan data from database
  const scanResult = await DatabaseService.getScan(scanId);

  if (!scanResult) {
    throw new Error(`Scan not found: ${scanId}`);
  }

  if (scanResult.status !== "completed") {
    throw new Error(`Scan not completed: ${scanId}`);
  }

  // Prepare data for PDF
  const data: ScanData = {
    url: scanResult.url,
    score: scanResult.score ?? 0,
    violations: scanResult.violations || [],
    passes: scanResult.passes || [],
    completedAt:
      scanResult.completedAt?.toISOString() || new Date().toISOString(),
  };

  console.log(`[PDF Generator] Generating PDF for ${data.url}...`);

  // Generate PDF
  const pdfDoc = <AccessibilityReportDocument data={data} />;
  const blob = await pdf(pdfDoc).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  console.log(
    `[PDF Generator] PDF generated successfully (${buffer.length} bytes)`
  );

  return buffer;
}

export function generatePDFFilename(url: string, scanId: string): string {
  // Clean up URL for filename
  const cleanUrl = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);

  const timestamp = new Date().toISOString().split("T")[0];
  return `accessibility-report-${cleanUrl}-${timestamp}-${scanId.substring(
    0,
    8
  )}.pdf`;
}
