// app/api/cron/check-queue/route.ts

import { NextResponse } from "next/server";
import { fetchQueueSnapshot } from "@/lib/scraper";
import {
  recordFetch,
  getLastQueueSnapshot,
  loadDeliveryEvents,
  appendDeliveryEvent,
  markOrderNotified,
  isOrderNotified,
  updateOrderSeen,
  getOrderSeenInfo,
} from "@/lib/storage";
import { sendTelegramNotification } from "@/lib/notifier";
import { getNowISO, formatReadableTime } from "@/lib/utils";

// Vercel cron signature verification
function isValidCronRequest(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  // Verify request is from Vercel Cron
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queueUrl = process.env.QUEUE_URL || "https://flavortown.hackclub.com/queue";
    const targetIdsStr = process.env.TARGET_ORDER_IDS || "";
    const botToken = process.env.BOT_TOKEN || "";
    const chatId = process.env.CHAT_ID || "";

    console.log("Checking queue...");

    const targetIds = targetIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (targetIds.length === 0) {
      console.warn("TARGET_ORDER_IDS not configured");
      return NextResponse.json({ status: "skipped", reason: "no_targets" });
    }

    // Fetch current queue
    const currentSnapshot = await fetchQueueSnapshot(queueUrl);

    if (currentSnapshot.length === 0) {
      console.warn("Parsed 0 orders; skipping to avoid false positives");
      return NextResponse.json({ status: "skipped", reason: "empty_queue" });
    }

    const currentOrders = currentSnapshot.map((r) => r.order_id);
    const snapshotById = Object.fromEntries(currentSnapshot.map((r) => [r.order_id, r]));

    console.log(`Orders found: ${currentOrders.length}`);

    // Record this fetch
    const checkedAt = getNowISO();
    await recordFetch(currentOrders, checkedAt, currentSnapshot);

    // Check each target order
    let notifiedCount = 0;

    for (const targetId of targetIds) {
      if (targetId in snapshotById) {
        // Order still in queue
        const record = snapshotById[targetId];
        await updateOrderSeen(targetId, record.checked_at, record.queue_age_text);
        console.log(`Order ${targetId} still in queue`);
        continue;
      }

      // Order missing - check if already notified
      const alreadyNotified = await isOrderNotified(targetId);
      if (alreadyNotified) {
        console.log(`Order ${targetId} removed; already notified`);
        continue;
      }

      // Send notification
      const success = await sendTelegramNotification(targetId, botToken, chatId);

      if (success) {
        await markOrderNotified(targetId);
        const notifiedAt = getNowISO();

        const seenInfo = await getOrderSeenInfo(targetId);

        // Append delivery event WITHOUT source field
        await appendDeliveryEvent({
          order_id: targetId,
          status: "likely_delivered",
          notified_at: notifiedAt,
          last_seen_at: seenInfo.lastSeenAt || undefined,
          last_seen_age: seenInfo.lastSeenAge || undefined,
          queue_checked_at: checkedAt,
          queue_count: currentOrders.length,
          queue_url: queueUrl,
        });

        console.log(`Order ${targetId} removed → notification sent`);
        notifiedCount++;
      } else {
        console.error(`Failed to notify for order ${targetId}`);
      }
    }

    return NextResponse.json({
      status: "ok",
      orders_checked: currentOrders.length,
      targets_monitored: targetIds.length,
      notifications_sent: notifiedCount,
      timestamp: formatReadableTime(checkedAt),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}
