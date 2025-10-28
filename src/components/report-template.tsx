import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  ExternalLink,
  Calendar,
  Globe,
  TrendingUp,
} from "lucide-react";

interface ScanResult {
  id: string;
  url: string;
  status: string;
  score?: number;
  violations?: any[];
  passes?: any[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ReportTemplateProps {
  scanResult: ScanResult;
  accessibeLink?: string;
}

export function ReportTemplate({
  scanResult,
  accessibeLink,
}: ReportTemplateProps) {
  const violations = scanResult.violations || [];
  const passes = scanResult.passes || [];
  const score = scanResult.score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90)
      return <CheckCircle className="h-12 w-12 text-green-600" />;
    if (score >= 70)
      return <AlertTriangle className="h-12 w-12 text-yellow-600" />;
    return <XCircle className="h-12 w-12 text-red-600" />;
  };

  const groupViolationsByImpact = (violations: any[]) => {
    return violations.reduce((acc, violation) => {
      const impact = violation.impact || "minor";
      if (!acc[impact]) acc[impact] = [];
      acc[impact].push(violation);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const groupedViolations = groupViolationsByImpact(violations);
  const impactOrder = ["critical", "serious", "moderate", "minor"];

  const totalIssues = violations.reduce(
    (total, violation) => total + (violation.nodes?.length || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body {
              margin: 0;
            }
            .page-break {
              page-break-before: always;
            }
            .no-print {
              display: none;
            }
          }
        `,
        }}
      />

      {/* Header */}
      <div className="text-center mb-12 border-b-2 border-gray-200 pb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 mr-3 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Accessibility Audit Report
          </h1>
        </div>
        <div className="flex items-center justify-center text-gray-600 mb-2">
          <Globe className="h-4 w-4 mr-2" />
          <span className="text-lg">{scanResult.url}</span>
        </div>
        <div className="flex items-center justify-center text-gray-500">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            Generated on{" "}
            {new Date(
              scanResult.completedAt || scanResult.createdAt
            ).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Executive Summary
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-center mb-6">
            {getScoreIcon(score)}
            <div className="ml-4">
              <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className="text-lg text-gray-600">Accessibility Score</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-red-600">
                {totalIssues}
              </div>
              <div className="text-sm text-gray-600">Issues Found</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {passes.length}
              </div>
              <div className="text-sm text-gray-600">Tests Passed</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {violations.length}
              </div>
              <div className="text-sm text-gray-600">Rule Violations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Interpretation */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Score Interpretation
        </h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded mr-3"></div>
            <span>
              <strong>90-100:</strong> Excellent accessibility - meets most WCAG
              guidelines
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-600 rounded mr-3"></div>
            <span>
              <strong>70-89:</strong> Good accessibility - some improvements
              needed
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded mr-3"></div>
            <span>
              <strong>0-69:</strong> Poor accessibility - significant
              improvements required
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Issues */}
      {violations.length > 0 && (
        <div className="page-break">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Detailed Issues
          </h2>
          {impactOrder.map((impact) => {
            const impactViolations = groupedViolations[impact];
            if (!impactViolations?.length) return null;

            const impactColors = {
              critical: "border-red-500 bg-red-50",
              serious: "border-orange-500 bg-orange-50",
              moderate: "border-yellow-500 bg-yellow-50",
              minor: "border-blue-500 bg-blue-50",
            };

            return (
              <div key={impact} className="mb-8">
                <h3 className="text-xl font-semibold mb-4 capitalize text-gray-800">
                  {impact} Issues ({impactViolations.length})
                </h3>
                <div className="space-y-4">
                  {impactViolations.map((violation: any, index: number) => {
                    const nodeCount = violation.nodes?.length || 1;
                    return (
                      <div
                        key={index}
                        className={`border-l-4 p-4 rounded ${
                          impactColors[impact as keyof typeof impactColors]
                        }`}
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {violation.id}
                        </h4>
                        <p className="text-gray-700 mb-2">
                          {violation.description}
                        </p>
                        <div className="text-sm text-gray-600">
                          <strong>Elements affected:</strong> {nodeCount}
                        </div>
                        {violation.help && (
                          <div className="text-sm text-gray-600 mt-2">
                            <strong>How to fix:</strong> {violation.help}
                          </div>
                        )}
                        {violation.helpUrl && (
                          <div className="text-sm text-blue-600 mt-2">
                            <a
                              href={violation.helpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Learn more →
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      <div className="page-break">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Recommendations
        </h2>
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">
              <TrendingUp className="inline h-5 w-5 mr-2" />
              Priority Actions
            </h3>
            <ul className="space-y-2 text-gray-700">
              {score < 70 && (
                <>
                  <li>• Focus on critical and serious issues first</li>
                  <li>
                    • Implement proper heading structure (h1, h2, h3, etc.)
                  </li>
                  <li>• Add alt text to all images</li>
                  <li>• Ensure sufficient color contrast ratios</li>
                </>
              )}
              {score >= 70 && score < 90 && (
                <>
                  <li>• Address remaining moderate and minor issues</li>
                  <li>• Improve keyboard navigation</li>
                  <li>• Add ARIA labels where needed</li>
                  <li>• Test with screen readers</li>
                </>
              )}
              {score >= 90 && (
                <>
                  <li>• Maintain current accessibility standards</li>
                  <li>• Regular accessibility audits</li>
                  <li>• User testing with disabled users</li>
                  <li>• Stay updated with WCAG guidelines</li>
                </>
              )}
            </ul>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold mb-3 text-green-900">
              Get Professional Help
            </h3>
            <p className="text-gray-700 mb-4">
              Need help implementing these fixes? Consider using an automated
              accessibility solution that can resolve many of these issues
              instantly.
            </p>
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">AccessiBe</h4>
                  <p className="text-sm text-gray-600">
                    AI-powered accessibility solution that automatically fixes
                    issues
                  </p>
                </div>
                <a
                  href={accessibeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Learn More
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t-2 border-gray-200 text-center text-gray-500">
        <p className="mb-2">
          This report was generated by Accessible - Web Accessibility Scanner
        </p>
        <p className="text-sm">
          For questions about this report, please contact support@yourdomain.com
        </p>
      </div>
    </div>
  );
}
