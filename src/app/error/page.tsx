import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-md text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-destructive">
          Authentication Error
        </h1>
        <p className="text-muted-foreground">
          Something went wrong during the authentication process.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm">This could be due to:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Invalid email or password</li>
          <li>• Expired confirmation link</li>
          <li>• Network connectivity issues</li>
        </ul>
      </div>

      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
