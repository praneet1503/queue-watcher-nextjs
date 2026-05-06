// lib/modal-client.ts

import axios from "axios";

const MODAL_API_URL = process.env.MODAL_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: MODAL_API_URL,
  timeout: 10000,
});

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

export interface Summary {
  target_count: number;
  live_count: number;
  delivered_count: number;
  last_checked: string | null;
}

/**
 * Fetch summary from Modal API
 */
export async function getSummary(): Promise<Summary> {
  try {
    const response = await client.get("/api/summary");
    return response.data.summary;
  } catch (error) {
    console.error("Failed to get summary from Modal:", error);
    return {
      target_count: 0,
      live_count: 0,
      delivered_count: 0,
      last_checked: null,
    };
  }
}

/**
 * Fetch live queue snapshot from Modal API
 */
export async function getLiveSnapshot(): Promise<QueueRecord[]> {
  try {
    const response = await client.get("/api/live");
    return response.data.live_snapshot || [];
  } catch (error) {
    console.error("Failed to get live snapshot from Modal:", error);
    return [];
  }
}

/**
 * Fetch delivery events from Modal API
 */
export async function getDeliveries(): Promise<DeliveryEvent[]> {
  try {
    const response = await client.get("/api/deliveries");
    return response.data.deliveries || [];
  } catch (error) {
    console.error("Failed to get deliveries from Modal:", error);
    return [];
  }
}

/**
 * Fetch orders from Modal API
 */
export async function getOrders(): Promise<{
  orders: string[];
  last_checked: string | null;
}> {
  try {
    const response = await client.get("/api/orders");
    return {
      orders: response.data.orders || [],
      last_checked: response.data.last_checked || null,
    };
  } catch (error) {
    console.error("Failed to get orders from Modal:", error);
    return {
      orders: [],
      last_checked: null,
    };
  }
}

/**
 * Check health of Modal API
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await client.get("/health");
    return response.data.status === "ok";
  } catch (error) {
    console.error("Modal API health check failed:", error);
    return false;
  }
}
