"use client";

import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { ScanResults } from "@/components/scan-results";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { use, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface ScanPageProps {
  params: Promise<{
    scanId: string;
  }>;
}

export default function ScanPage({ params }: ScanPageProps) {
  const router = useRouter();
  const { scanId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Check user authentication status
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Validate scanId format (UUID v4)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(scanId)) {
    notFound();
  }

  // Determine navigation based on user status
  const navHref = user ? "/dashboard" : "/";
  const navText = user ? "Dashboard" : "Home";
  const newScanRedirect = user ? "/dashboard" : "/";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link href={navHref}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {navText}
          </Button>
        </Link>
      </div>

      {/* Scan Results */}
      <ScanResults
        scanId={scanId}
        onNewScan={() => router.push(newScanRedirect)}
      />
    </div>
  );
}
