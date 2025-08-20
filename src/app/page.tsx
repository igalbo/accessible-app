export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Make Your Website <span className="text-primary">Accessible</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          AI-powered web accessibility compliance scanner. Get detailed WCAG 2.1
          AA reports and fix suggestions for your website. Start with a free
          scan.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer">
            Start Free Scan
          </button>
          <button className="inline-flex items-center justify-center rounded-md border border-border px-8 py-3 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
