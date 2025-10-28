import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a URL by adding https:// protocol if not present
 * @param inputUrl - The URL to normalize
 * @returns The normalized URL with protocol
 */
export function normalizeUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  // If no protocol specified, add https://
  if (!trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Validates if a string is a valid URL
 * @param inputUrl - The URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(inputUrl: string): boolean {
  if (!inputUrl.trim()) return false;
  try {
    // Normalize URL before validation
    const normalized = normalizeUrl(inputUrl);
    const urlObj = new URL(normalized);

    // Require a valid domain structure (must have at least one dot for TLD)
    const hostname = urlObj.hostname;
    if (!hostname.includes(".")) {
      return false;
    }

    // Reject if hostname ends with a dot
    if (hostname.endsWith(".")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
