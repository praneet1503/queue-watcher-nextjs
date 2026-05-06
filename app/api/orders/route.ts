// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { getLastOrders } from "@/lib/storage";

export async function GET() {
  const { orders, lastChecked, lastCheckedReadable } = await getLastOrders();
  return NextResponse.json({
    orders,
    last_checked: lastChecked,
    last_checked_readable: lastCheckedReadable,
  });
}
