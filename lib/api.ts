const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function buildApiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return new URL(path, API_BASE).toString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path));
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface Summary {
  target_count: number;
  live_count: number;
  delivered_count: number;
  last_checked: string | null;
}

export interface LiveRecord {
  order_id: string;
  queue_age_text: string;
  checked_at: string;
  source_url: string;
}

export interface DeliveryRecord {
  order_id: string;
  status: string;
  notified_at: string;
  last_seen_at?: string;
  last_seen_age?: string;
  queue_checked_at?: string;
  queue_count?: number;
  queue_url?: string;
}

export async function fetchSummary(): Promise<Summary> {
  const data = await fetchJson<{ summary: Summary }>("/api/summary");
  return data.summary;
}

export async function fetchLiveSnapshot(): Promise<LiveRecord[]> {
  const data = await fetchJson<{ live_snapshot: LiveRecord[] }>("/api/live");
  return data.live_snapshot || [];
}

export async function fetchDeliveries(): Promise<DeliveryRecord[]> {
  const data = await fetchJson<{ deliveries: DeliveryRecord[] }>("/api/deliveries");
  return data.deliveries || [];
}
