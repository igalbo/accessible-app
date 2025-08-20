import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Accessible - Web Accessibility Compliance Scanner",
  description:
    "AI-powered web accessibility compliance scanner. Get detailed WCAG 2.1 AA reports and fix suggestions for your website. Start with a free scan.",
  keywords: [
    "accessibility",
    "WCAG",
    "ADA compliance",
    "web accessibility",
    "accessibility scanner",
  ],
  authors: [{ name: "Accessible" }],
  creator: "Accessible",
  publisher: "Accessible",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://accessible.app",
    title: "Accessible - Web Accessibility Compliance Scanner",
    description:
      "AI-powered web accessibility compliance scanner. Get detailed WCAG 2.1 AA reports and fix suggestions for your website.",
    siteName: "Accessible",
  },
  twitter: {
    card: "summary_large_image",
    title: "Accessible - Web Accessibility Compliance Scanner",
    description:
      "AI-powered web accessibility compliance scanner. Get detailed WCAG 2.1 AA reports and fix suggestions for your website.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider defaultTheme="system">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
