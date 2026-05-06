// app/api/summary/route.ts

import { NextResponse } from "next/server";
import { getLastOrders, getLastQueueSnapshot, loadDeliveryEvents } from "@/lib/storage";

export async function GET() {
  try {
    const { orders, lastChecked, lastCheckedReadable } = await getLastOrders();
    const snapshot = await getLastQueueSnapshot();
    const events = await loadDeliveryEvents();

    const deliveredCount = events.filter((e) => e.status === "likely_delivered").length;

    return NextResponse.json({
      summary: {
        target_count: (process.env.TARGET_ORDER_IDS || "").split(",").filter((s) => s.trim()).length,
        live_count: snapshot.length,
        delivered_count: deliveredCount,
        last_checked: lastChecked,
        last_checked_readable: lastCheckedReadable,
      },
    });
  } catch (error) {
    console.error("Failed to get summary:", error);
    return NextResponse.json(
      { error: "Failed to get summary" },
      { status: 500 }
    );
  }
}
