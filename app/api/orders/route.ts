// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { getOrders } from "@/lib/modal-client";

export async function GET() {
  const data = await getOrders();
  return NextResponse.json({
    orders: data.orders,
    last_checked: data.last_checked,
  });
}
