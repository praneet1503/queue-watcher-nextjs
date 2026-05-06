// app/api/health/route.ts

import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/modal-client";

export async function GET() {
  const healthy = await checkHealth();
  return NextResponse.json({ status: healthy ? "ok" : "degraded" });
}
