// app/api/live/route.ts

import { NextResponse } from "next/server";
import { getLiveSnapshot } from "@/lib/modal-client";

export async function GET() {
  try {
    const snapshot = await getLiveSnapshot();
    return NextResponse.json({
      live_snapshot: snapshot,
      live_targets: snapshot,
    });
  } catch (error) {
    console.error("Failed to get live snapshot:", error);
    return NextResponse.json(
      { error: "Failed to get live snapshot" },
      { status: 500 }
    );
  }
}
