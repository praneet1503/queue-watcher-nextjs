// lib/scraper.ts

import axios from "axios";
import * as cheerio from "cheerio";
import { extractNumericIds, normalizeText, getNowISO } from "./utils";

const SECTION_TITLE = "Awaiting Periodical";
const REQUEST_TIMEOUT_SECONDS = 10;
const REQUEST_RETRIES = 3;

interface QueueRecord {
  order_id: string;
  queue_age_text: string;
  checked_at: string;
  source_url: string;
}

/**
 * Fetch queue HTML with retries
 */
export async function fetchQueueHtml(queueUrl: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt++) {
    try {
      const response = await axios.get(queueUrl, {
        timeout: REQUEST_TIMEOUT_SECONDS * 1000,
        headers: {
          "User-Agent": "queue-watcher/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      return response.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < REQUEST_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw new Error(`Failed to fetch queue after ${REQUEST_RETRIES} retries: ${lastError?.message}`);
}

/**
 * Extract order IDs from a table row
 */
function findOrderIdInRow($: cheerio.CheerioAPI, row: cheerio.Element): string | null {
  const $row = $(row);

  // Try attributes first (e.g., data-order-id)
  const attrs = $row.attr();
  if (attrs) {
    for (const value of Object.values(attrs)) {
      if (typeof value === "string") {
        const matches = extractNumericIds(value);
        if (matches.length > 0) return matches[0];
      }
    }
  }

  // Try first cell
  const cells = $row.find("td, th");
  if (cells.length > 0) {
    const firstCellText = $(cells[0]).text();
    const matches = extractNumericIds(firstCellText);
    if (matches.length > 0) return matches[0];
  }

  // Try any cell
  for (let i = 0; i < cells.length; i++) {
    const cellText = $(cells[i]).text();
    const matches = extractNumericIds(cellText);
    if (matches.length > 0) return matches[0];
  }

  // Try links
  const links = $row.find("a[href]");
  for (let i = 0; i < links.length; i++) {
    const href = $(links[i]).attr("href") || "";
    const matches = extractNumericIds(href);
    if (matches.length > 0) return matches[0];
  }

  // Fallback to row text
  const rowText = $row.text();
  const matches = extractNumericIds(rowText);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Extract queue records from HTML
 */
export async function extractQueueRecords(
  html: string,
  queueUrl: string
): Promise<QueueRecord[]> {
  try {
    const $ = cheerio.load(html);
    const needle = normalizeText(SECTION_TITLE);

    // Find the section marker
    let marker: cheerio.Element | null = null;
    const allText = $("*").contents();

    for (let i = 0; i < allText.length; i++) {
      const node = allText[i];
      if (node.type === "text") {
        const text = node.data;
        if (text && normalizeText(text).includes(needle)) {
          marker = node.parent;
          break;
        }
      }
    }

    if (!marker) {
      console.warn("Section marker not found");
      return [];
    }

    // Find table after marker
    let $table = $(marker).find("table").first();
    if ($table.length === 0) {
      $table = $(marker).find("table").first();
    }
    if ($table.length === 0) {
      console.warn("Table not found");
      return [];
    }

    const records: QueueRecord[] = [];
    const seen = new Set<string>();
    const checkedAt = getNowISO();

    const rows = $table.find("tr");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const $row = $(row);
      const cells = $row.find("td, th");

      if (cells.length < 2) continue;

      const orderId = findOrderIdInRow($, row);
      if (!orderId) continue;
      if (seen.has(orderId)) continue;

      seen.add(orderId);
      const queueAgeText = $(cells[1]).text();

      records.push({
        order_id: orderId,
        queue_age_text: queueAgeText.trim(),
        checked_at: checkedAt,
        source_url: queueUrl,
      });
    }

    return records;
  } catch (error) {
    console.error("Failed to extract records:", error);
    return [];
  }
}

/**
 * Fetch queue snapshot (HTML parse)
 */
export async function fetchQueueSnapshot(queueUrl: string): Promise<QueueRecord[]> {
  try {
    const html = await fetchQueueHtml(queueUrl);
    return await extractQueueRecords(html, queueUrl);
  } catch (error) {
    console.error("Queue fetch failed:", error);
    return [];
  }
}

/**
 * Fetch just the order IDs
 */
export async function fetchOrderIds(queueUrl: string): Promise<string[]> {
  const records = await fetchQueueSnapshot(queueUrl);
  return records.map((r) => r.order_id);
}
