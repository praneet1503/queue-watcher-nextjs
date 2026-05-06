// app/api/summary/route.ts

import { NextResponse } from "next/server";
import { getSummary } from "@/lib/modal-client";

export async function GET() {
  try {
    const summary = await getSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to get summary:", error);
    return NextResponse.json(
      { error: "Failed to get summary" },
      { status: 500 }
    );
  }
}
