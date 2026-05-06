// app/api/deliveries/route.ts

import { NextResponse } from "next/server";
import { loadDeliveryEvents } from "@/lib/storage";
import { formatReadableTime } from "@/lib/utils";

export async function GET() {
  try {
    const events = await loadDeliveryEvents();

    // Format timestamps for readability and exclude source field
    const formattedEvents = events.map((event) => ({
      order_id: event.order_id,
      status: event.status,
      notified_at: event.notified_at,
      notified_at_readable: formatReadableTime(event.notified_at),
      last_seen_at: event.last_seen_at,
      last_seen_at_readable: formatReadableTime(event.last_seen_at),
      last_seen_age: event.last_seen_age,
      queue_checked_at: event.queue_checked_at,
      queue_checked_at_readable: formatReadableTime(event.queue_checked_at),
      queue_count: event.queue_count,
      queue_url: event.queue_url,
      // Note: source field is intentionally excluded
    }));

    return NextResponse.json({
      deliveries: formattedEvents,
    });
  } catch (error) {
    console.error("Failed to get deliveries:", error);
    return NextResponse.json(
      { error: "Failed to get deliveries" },
      { status: 500 }
    );
  }
}
