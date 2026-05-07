const PINNED_ORDERS_KEY = "pinnedOrders";
const LAST_ORDERS_SNAPSHOT_KEY = "lastOrdersSnapshot";
const LIKELY_FULFILLED_KEY = "likelyFulfilledOrders";

const isClient = typeof window !== "undefined";

function readStringArray(key: string): string[] {
  if (!isClient) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]) {
  if (!isClient) return;
  localStorage.setItem(key, JSON.stringify(values));
}

function normalizeOrders(orders: string[]): string[] {
  return orders.map((value) => String(value).trim()).filter((value) => value.length > 0);
}

export function getPinnedOrders(): string[] {
  return readStringArray(PINNED_ORDERS_KEY);
}

export function setPinnedOrders(orders: string[]) {
  writeStringArray(PINNED_ORDERS_KEY, normalizeOrders(orders));
}

export function getLikelyFulfilledOrders(): string[] {
  return readStringArray(LIKELY_FULFILLED_KEY);
}

export function updateLikelyFulfilledFromSnapshot(currentOrders: string[]): string[] {
  const normalizedCurrent = normalizeOrders(currentOrders);
  const previousSnapshot = readStringArray(LAST_ORDERS_SNAPSHOT_KEY);
  let nextLikely = readStringArray(LIKELY_FULFILLED_KEY);

  if (previousSnapshot.length > 0) {
    const currentSet = new Set(normalizedCurrent);
    const missing = previousSnapshot.filter((orderId) => !currentSet.has(orderId));
    if (missing.length > 0) {
      nextLikely = Array.from(new Set([...nextLikely, ...missing]));
      writeStringArray(LIKELY_FULFILLED_KEY, nextLikely);
    }
  }

  writeStringArray(LAST_ORDERS_SNAPSHOT_KEY, normalizedCurrent);
  return nextLikely;
}
