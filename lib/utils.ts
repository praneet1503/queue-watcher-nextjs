// lib/utils.ts

/**
 * Format ISO timestamp to readable format
 * e.g., "2025-05-06T14:30:45.000Z" → "May 06, 2025 14:30 UTC"
 */
export function formatReadableTime(isoString: string | null | undefined): string {
  if (!isoString) return "Unknown";

  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  } catch {
    return isoString;
  }
}

/**
 * Get current timestamp in ISO format
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Normalize text for comparison
 */
export function normalizeText(text: string): string {
  return text.split(/\s+/).join(" ").trim().toLowerCase();
}

/**
 * Extract numeric IDs (3+ digits) from text
 */
export function extractNumericIds(text: string): string[] {
  const matches = text.match(/\b\d{3,}\b/g);
  return matches || [];
}
