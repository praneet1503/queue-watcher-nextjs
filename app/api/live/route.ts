// app/api/live/route.ts

import { NextResponse } from "next/server";
import { getLastQueueSnapshot } from "@/lib/storage";
import { formatReadableTime } from "@/lib/utils";

export async function GET() {
  try {
    const snapshot = await getLastQueueSnapshot();

    // Format timestamps for readability
    const formattedSnapshot = snapshot.map((record) => ({
      ...record,
      checked_at_readable: formatReadableTime(record.checked_at),
    }));

    return NextResponse.json({
      live_snapshot: formattedSnapshot,
      live_targets: formattedSnapshot,
    });
  } catch (error) {
    console.error("Failed to get live snapshot:", error);
    return NextResponse.json(
      { error: "Failed to get live snapshot" },
      { status: 500 }
    );
  }
}
