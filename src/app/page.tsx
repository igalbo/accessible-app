import { ScanForm } from "@/components/scan-form";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Make Your Website <span className="text-primary">Accessible</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          AI-powered web accessibility compliance scanner. Get detailed WCAG 2.1
          AA reports and fix suggestions for your website. Start with a free
          scan.
        </p>
      </div>

      {/* Scan Form */}
      <ScanForm />

      {/* Features Section */}
      <div className="max-w-4xl mx-auto mt-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Comprehensive Scanning
            </h3>
            <p className="text-muted-foreground">
              Automated WCAG 2.1 AA compliance testing using industry-standard
              tools
            </p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Detailed Reports</h3>
            <p className="text-muted-foreground">
              Get actionable insights with severity levels and fix suggestions
            </p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast Results</h3>
            <p className="text-muted-foreground">
              Get your accessibility score and issues report in under 60 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
