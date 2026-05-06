// lib/storage.ts

import { kv } from "@vercel/kv";
import { formatReadableTime, getNowISO } from "./utils";

export interface DeliveryEvent {
  order_id: string;
  status: string;
  notified_at: string;
  last_seen_at?: string;
  last_seen_age?: string;
  queue_checked_at?: string;
  queue_count?: number;
  queue_url?: string;
}

export interface QueueRecord {
  order_id: string;
  queue_age_text: string;
  checked_at: string;
  source_url: string;
}

const MAX_DELIVERY_EVENTS = 200;
const DELIVERY_HISTORY_KEY = "delivery_events";
const LAST_ORDERS_KEY = "last_orders_json";
const LAST_CHECKED_KEY = "last_checked_iso";
const QUEUE_SNAPSHOT_KEY = "last_queue_snapshot";

/**
 * Load delivery events from storage
 */
export async function loadDeliveryEvents(): Promise<DeliveryEvent[]> {
  try {
    const events = await kv.get<DeliveryEvent[]>(DELIVERY_HISTORY_KEY);
    return events || [];
  } catch (error) {
    console.error("Failed to load delivery events:", error);
    return [];
  }
}

/**
 * Save delivery events to storage (no source field)
 */
export async function saveDeliveryEvents(events: DeliveryEvent[]): Promise<void> {
  try {
    const trimmed = events.slice(-MAX_DELIVERY_EVENTS);
    await kv.set(DELIVERY_HISTORY_KEY, trimmed);
  } catch (error) {
    console.error("Failed to save delivery events:", error);
  }
}

/**
 * Append a delivery event to history
 */
export async function appendDeliveryEvent(event: DeliveryEvent): Promise<void> {
  const events = await loadDeliveryEvents();
  events.push(event);
  events.sort((a, b) => {
    const timeA = new Date(a.notified_at).getTime();
    const timeB = new Date(b.notified_at).getTime();
    return timeB - timeA; // Newest first
  });
  await saveDeliveryEvents(events);
}

/**
 * Record a fetch with order IDs and timestamp
 */
export async function recordFetch(
  orderIds: string[],
  checkedAt: string,
  records: QueueRecord[]
): Promise<void> {
  try {
    await kv.set(LAST_ORDERS_KEY, JSON.stringify(orderIds));
    await kv.set(QUEUE_SNAPSHOT_KEY, JSON.stringify(records));
    await kv.set(LAST_CHECKED_KEY, checkedAt);
  } catch (error) {
    console.error("Failed to record fetch:", error);
  }
}

/**
 * Get last recorded orders and timestamp
 */
export async function getLastOrders(): Promise<{
  orders: string[];
  lastChecked: string | null;
  lastCheckedReadable: string;
}> {
  try {
    const ordersJson = await kv.get<string>(LAST_ORDERS_KEY);
    const lastChecked = await kv.get<string>(LAST_CHECKED_KEY);

    const orders = ordersJson ? JSON.parse(ordersJson) : [];
    return {
      orders,
      lastChecked,
      lastCheckedReadable: formatReadableTime(lastChecked),
    };
  } catch (error) {
    console.error("Failed to get last orders:", error);
    return {
      orders: [],
      lastChecked: null,
      lastCheckedReadable: "Unknown",
    };
  }
}

/**
 * Get last queue snapshot
 */
export async function getLastQueueSnapshot(): Promise<QueueRecord[]> {
  try {
    const json = await kv.get<string>(QUEUE_SNAPSHOT_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Failed to get queue snapshot:", error);
    return [];
  }
}

/**
 * Mark an order as notified
 */
export async function markOrderNotified(orderId: string): Promise<void> {
  try {
    const key = `notified:${orderId}`;
    await kv.set(key, "true");
    await kv.set(`notified_at:${orderId}`, getNowISO());
  } catch (error) {
    console.error("Failed to mark order notified:", error);
  }
}

/**
 * Check if order was already notified
 */
export async function isOrderNotified(orderId: string): Promise<boolean> {
  try {
    const key = `notified:${orderId}`;
    const value = await kv.get<string>(key);
    return value === "true";
  } catch (error) {
    console.error("Failed to check if order notified:", error);
    return false;
  }
}

/**
 * Update order seen info
 */
export async function updateOrderSeen(
  orderId: string,
  checkedAt: string,
  queueAgeText: string
): Promise<void> {
  try {
    await kv.set(`last_seen_at:${orderId}`, checkedAt);
    await kv.set(`last_seen_age:${orderId}`, queueAgeText);

    // Set first seen if not exists
    const firstSeenKey = `first_seen_at:${orderId}`;
    const firstSeen = await kv.get<string>(firstSeenKey);
    if (!firstSeen) {
      await kv.set(firstSeenKey, checkedAt);
    }
  } catch (error) {
    console.error("Failed to update order seen:", error);
  }
}

/**
 * Get order seen info
 */
export async function getOrderSeenInfo(orderId: string): Promise<{
  lastSeenAt: string | null;
  lastSeenAge: string | null;
}> {
  try {
    const lastSeenAt = await kv.get<string>(`last_seen_at:${orderId}`);
    const lastSeenAge = await kv.get<string>(`last_seen_age:${orderId}`);
    return { lastSeenAt, lastSeenAge };
  } catch (error) {
    console.error("Failed to get order seen info:", error);
    return { lastSeenAt: null, lastSeenAge: null };
  }
}
