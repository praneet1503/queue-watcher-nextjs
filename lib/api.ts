const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function buildApiUrl(path: string): string {
  if (typeof window !== "undefined") {
    return path;
  }
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return new URL(path, API_BASE).toString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    signal: AbortSignal.timeout(5000),
  });
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

export interface OrdersSnapshot {
  orders: string[];
  last_checked: string | null;
}

export async function fetchSummary(): Promise<Summary> {
  const data = await fetchJson<{ summary: Summary }>("/api/summary");
  return data.summary;
}

export async function fetchLiveSnapshot(): Promise<LiveRecord[]> {
  const data = await fetchJson<{ live_snapshot: LiveRecord[] }>("/api/live");
  return data.live_snapshot || [];
}

export async function fetchOrders(): Promise<OrdersSnapshot> {
  const data = await fetchJson<{ orders: string[]; last_checked: string | null }>("/api/orders");
  return {
    orders: data.orders || [],
    last_checked: data.last_checked ?? null,
  };
}
