// app/api/deliveries/route.ts

import { NextResponse } from "next/server";
import { getDeliveries } from "@/lib/modal-client";

export async function GET() {
  try {
    const deliveries = await getDeliveries();
    return NextResponse.json({ deliveries });
  } catch (error) {
    console.error("Failed to get deliveries:", error);
    return NextResponse.json(
      { error: "Failed to get deliveries" },
      { status: 500 }
    );
  }
}
