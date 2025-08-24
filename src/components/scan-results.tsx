"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ScanResult {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score?: number;
  violations?: any[];
  passes?: any[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ScanResultsProps {
  scanId: string;
  onNewScan?: () => void;
}

export function ScanResults({ scanId, onNewScan }: ScanResultsProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(
    new Set()
  );

  const toggleViolationExpansion = (violationKey: string) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(violationKey)) {
      newExpanded.delete(violationKey);
    } else {
      newExpanded.add(violationKey);
    }
    setExpandedViolations(newExpanded);
  };

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/scan?id=${scanId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch scan result");
        }

        setResult(data);

        // If still pending, poll again
        if (data.status === "pending") {
          setTimeout(fetchResult, 2000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchResult();
  }, [scanId]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-8 w-8 text-green-600" />;
    if (score >= 70)
      return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    return <XCircle className="h-8 w-8 text-red-600" />;
  };

  const groupViolationsByImpact = (violations: any[]) => {
    return violations.reduce((acc, violation) => {
      const impact = violation.impact || "minor";
      if (!acc[impact]) acc[impact] = [];
      acc[impact].push(violation);
      return acc;
    }, {} as Record<string, any[]>);
  };

  if (loading || result?.status === "pending") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 animate-pulse" />
            Scanning in Progress
          </CardTitle>
          <CardDescription>
            Analyzing {result?.url || "your website"} for accessibility
            issues...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            This usually takes 30-60 seconds
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error || result?.status === "failed") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            Scan Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {error || result?.error || "An unexpected error occurred"}
          </p>
          <Button onClick={onNewScan}>Try Another Scan</Button>
        </CardContent>
      </Card>
    );
  }

  if (!result || result.status !== "completed") {
    return null;
  }

  const violations = result.violations || [];
  const groupedViolations = groupViolationsByImpact(violations);
  const impactOrder = ["critical", "serious", "moderate", "minor"];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            Accessibility Scan Results
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <ExternalLink className="h-4 w-4" />
            {result.url}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            {getScoreIcon(result.score || 0)}
            <div>
              <div
                className={`text-4xl font-bold ${getScoreColor(
                  result.score || 0
                )}`}
              >
                {result.score || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Accessibility Score
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-red-600">
                {violations.length}
              </div>
              <div className="text-sm text-muted-foreground">Issues Found</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-green-600">
                {result.passes?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Tests Passed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violations by Impact */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Issues</CardTitle>
            <CardDescription>
              Issues found grouped by severity level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {impactOrder.map((impact) => {
              const impactViolations = groupedViolations[impact];
              if (!impactViolations?.length) return null;

              const impactColors = {
                critical:
                  "border-red-500 bg-red-50 dark:bg-red-950/40 dark:border-red-400",
                serious:
                  "border-orange-500 bg-orange-50 dark:bg-orange-950/40 dark:border-orange-400",
                moderate:
                  "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 dark:border-yellow-400",
                minor:
                  "border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-400",
              };

              return (
                <div
                  key={impact}
                  className={`border-l-4 p-4 rounded ${
                    impactColors[impact as keyof typeof impactColors]
                  }`}
                >
                  <h3 className="font-semibold capitalize mb-2 text-foreground">
                    {impact} Issues ({impactViolations.length})
                  </h3>
                  <div className="space-y-2">
                    {impactViolations
                      .slice(0, 3)
                      .map((violation: any, index: number) => {
                        const violationKey = `${impact}-${index}`;
                        const isExpanded = expandedViolations.has(violationKey);
                        const nodeCount = violation.nodes?.length || 1;

                        return (
                          <div key={index} className="text-sm">
                            <div className="font-medium text-foreground">
                              {violation.id}
                            </div>
                            <div className="text-muted-foreground dark:text-gray-300">
                              {violation.description}
                            </div>
                            <button
                              onClick={() =>
                                toggleViolationExpansion(violationKey)
                              }
                              className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-400 hover:text-foreground transition-colors cursor-pointer mt-1"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {nodeCount} element(s) affected
                            </button>
                            {isExpanded && violation.nodes && (
                              <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                                {violation.nodes
                                  .slice(0, 5)
                                  .map((node: any, nodeIndex: number) => (
                                    <div key={nodeIndex} className="text-xs">
                                      <div className="font-mono text-muted-foreground dark:text-gray-400 bg-muted/50 dark:bg-muted/20 p-2 rounded text-wrap break-all">
                                        {node.html ||
                                          node.target?.[0] ||
                                          "Element location not available"}
                                      </div>
                                      {node.failureSummary && (
                                        <div className="text-muted-foreground dark:text-gray-400 mt-1">
                                          {node.failureSummary}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                {violation.nodes.length > 5 && (
                                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                                    +{violation.nodes.length - 5} more elements
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {impactViolations.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{impactViolations.length - 3} more issues
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onNewScan} variant="outline">
              Scan Another Website
            </Button>
            <Button>
              Get Detailed Report
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Want more detailed reports and fix suggestions?{" "}
            <span className="text-primary font-medium">Upgrade to Pro</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
