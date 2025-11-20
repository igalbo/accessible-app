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
  Download,
  FileText,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { EmailCaptureModal } from "@/components/email-capture-modal";
import Image from "next/image";

interface ViolationNode {
  html?: string;
  target?: string[];
  failureSummary?: string;
  screenshot?: string;
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

interface ScanResult {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score?: number;
  violations?: Violation[];
  passes?: Pass[];
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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

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
    const supabase = createClient();
    let pollInterval: NodeJS.Timeout | null = null;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Get user authentication state
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch scan from database
    const fetchScan = async () => {
      try {
        const { data: scanData, error: fetchError } = await supabase
          .from("scans")
          .select(
            "id, url, status, score, result_json, created_at, completed_at, error"
          )
          .eq("id", scanId)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw new Error("Scan not found");
          }
          throw new Error(fetchError.message || "Failed to fetch scan result");
        }

        const scanResult: ScanResult = {
          id: scanData.id,
          url: scanData.url,
          status: scanData.status,
          score: scanData.score,
          violations: scanData.result_json?.violations,
          passes: scanData.result_json?.passes,
          createdAt: scanData.created_at,
          completedAt: scanData.completed_at,
          error: scanData.error,
        };

        setResult(scanResult);

        // If scan is complete or failed, stop polling and unsubscribe
        if (scanResult.status !== "pending") {
          setLoading(false);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          if (realtimeChannel) {
            realtimeChannel.unsubscribe();
            realtimeChannel = null;
          }
        }

        // Check if scan is stale (older than 2 minutes and still pending)
        const scanAge = Date.now() - new Date(scanResult.createdAt).getTime();
        if (scanResult.status === "pending" && scanAge > 120000) {
          setError("Scan appears to be stuck. Please try again.");
          setLoading(false);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          if (realtimeChannel) {
            realtimeChannel.unsubscribe();
            realtimeChannel = null;
          }
        }
      } catch (err) {
        console.error("[Client] Fetch error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        if (realtimeChannel) {
          realtimeChannel.unsubscribe();
          realtimeChannel = null;
        }
      }
    };

    // Initial fetch
    fetchScan();

    // Set up Supabase Realtime subscription for instant updates
    realtimeChannel = supabase
      .channel(`scan:${scanId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scans",
          filter: `id=eq.${scanId}`,
        },
        (payload) => {
          console.log("[Realtime] Scan updated:", payload);
          // Refetch to get the updated data
          fetchScan();
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    // Fallback: Poll every 3 seconds while loading, max 40 times (2 minutes)
    // This serves as a backup in case Realtime doesn't work
    let pollCount = 0;
    const maxPolls = 40;
    pollInterval = setInterval(() => {
      pollCount++;

      if (pollCount >= maxPolls) {
        setError("Scan timed out. Please try again.");
        setLoading(false);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        return;
      }

      // Only poll if still pending
      if (result?.status === "pending" || !result) {
        fetchScan();
      } else {
        // Stop polling if scan is complete
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }, 3000);

    // Cleanup function
    return () => {
      authSubscription.unsubscribe();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [scanId, result]);

  const handleDownloadReport = async () => {
    if (!result) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/reports/download?scanId=${scanId}`);

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `accessibility-report-${result.url.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGetReport = () => {
    if (user) {
      // User is logged in - direct download
      handleDownloadReport();
    } else {
      // User is not logged in - show email modal
      setIsEmailModalOpen(true);
    }
  };

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

  const groupViolationsByImpact = (violations: Violation[]) => {
    return violations.reduce((acc, violation) => {
      const impact = violation.impact || "minor";
      if (!acc[impact]) acc[impact] = [];
      acc[impact].push(violation);
      return acc;
    }, {} as Record<string, Violation[]>);
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
          <CardDescription className="flex flex-col items-center justify-center gap-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:underline text-blue-600 dark:text-blue-400"
            >
              <ExternalLink className="h-4 w-4" />
              {result.url}
            </a>
            {result.completedAt && (
              <div className="text-xs text-muted-foreground">
                Last scanned: {new Date(result.completedAt).toLocaleString()}
              </div>
            )}
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
                {violations.reduce(
                  (total, violation) => total + (violation.nodes?.length || 0),
                  0
                )}
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

          {violations.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <a
                  href="https://www.accessibe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  Resolve Issues
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                * We may earn a commission from purchases made through this link
              </p>
            </div>
          )}
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
                      .slice(0, user ? impactViolations.length : 3)
                      .map((violation: Violation, index: number) => {
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
                            {user && violation.help && (
                              <div className="text-sm text-muted-foreground dark:text-gray-400 mt-2">
                                <strong>How to fix:</strong> {violation.help}
                              </div>
                            )}
                            {user && violation.helpUrl && (
                              <div className="text-sm mt-1">
                                <a
                                  href={violation.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  Learn more
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
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
                              <div className="mt-2 pl-4 border-l-2 border-muted space-y-3">
                                {violation.nodes
                                  .slice(0, user ? violation.nodes.length : 5)
                                  .map(
                                    (
                                      node: ViolationNode,
                                      nodeIndex: number
                                    ) => (
                                      <div key={nodeIndex} className="text-xs">
                                        <div className="font-mono text-muted-foreground dark:text-gray-400 bg-muted/50 dark:bg-muted/20 p-2 rounded text-wrap break-all">
                                          {node.html ||
                                            node.target?.[0] ||
                                            "Element location not available"}
                                        </div>
                                        {node.failureSummary && (
                                          <div className="text-muted-foreground dark:text-gray-400 mt-1">
                                            <strong>Issue:</strong>{" "}
                                            {node.failureSummary}
                                          </div>
                                        )}
                                        {user &&
                                          node.target &&
                                          node.target[0] && (
                                            <div className="text-muted-foreground dark:text-gray-400 mt-1">
                                              <strong>Selector:</strong>{" "}
                                              <code className="text-xs bg-muted/50 dark:bg-muted/20 px-1 py-0.5 rounded">
                                                {node.target[0]}
                                              </code>
                                            </div>
                                          )}
                                        {node.screenshot && (
                                          <div className="mt-2">
                                            <div className="text-muted-foreground dark:text-gray-400 mb-1">
                                              Element Screenshot:
                                            </div>
                                            <div
                                              className="relative max-w-full"
                                              style={{ maxHeight: "200px" }}
                                            >
                                              <Image
                                                src={node.screenshot}
                                                alt={`Screenshot of element with ${violation.id} violation`}
                                                width={800}
                                                height={200}
                                                className="max-w-full h-auto border border-muted rounded shadow-sm"
                                                style={{
                                                  maxHeight: "200px",
                                                  width: "auto",
                                                }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                {!user && violation.nodes.length > 5 && (
                                  <button
                                    onClick={() => setIsEmailModalOpen(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    +{violation.nodes.length - 5} more elements
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {!user && impactViolations.length > 3 && (
                      <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        +{impactViolations.length - 3} more issues
                      </button>
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
            <Button
              onClick={handleGetReport}
              disabled={isDownloading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : user ? (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Report
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Get Detailed Report
                </>
              )}
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Professional PDF report with detailed analysis and recommendations
          </p>
        </CardContent>
      </Card>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        scanId={scanId}
        scanUrl={result.url}
      />
    </div>
  );
}
