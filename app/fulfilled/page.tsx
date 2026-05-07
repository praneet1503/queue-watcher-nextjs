// app/fulfilled/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DeliveryRecord, fetchDeliveries } from "@/lib/api";
import { formatReadableTime } from "@/lib/utils";

function getPinnedOrders(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("pinnedOrders") || "[]");
  } catch {
    return [];
  }
}

function setPinnedOrders(orders: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("pinnedOrders", JSON.stringify(orders));
  }
}

export default function FulfilledPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pinned, setPinned] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setPinned(getPinnedOrders());
  }, []);

  const togglePin = (orderId: string) => {
    setPinned((prev) => {
      const next = prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId];
      setPinnedOrders(next);
      return next;
    });
  };

  const fetchData = async () => {
    try {
      setError(null);
      const deliveriesData = await fetchDeliveries();
      setDeliveries(deliveriesData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="wrap">
        <div className="loading">Loading fulfilled orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const filteredDeliveries = searchQuery
    ? deliveries.filter((item) => item.order_id.includes(searchQuery))
    : deliveries;

  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    const aPinned = pinned.includes(a.order_id) ? 1 : 0;
    const bPinned = pinned.includes(b.order_id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return 0;
  });

  const renderRow = (
    rowKey: string,
    values: (string | number | undefined | null)[],
    pinId?: string
  ) => (
    <tr key={rowKey}>
      {pinId && (
        <td key="pin" style={{ textAlign: "center" }}>
          <button
            aria-label={pinned.includes(pinId) ? "Unpin order" : "Pin order"}
            onClick={() => togglePin(pinId)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: pinned.includes(pinId) ? "#61dafb" : "#888",
              fontSize: "1.2em",
            }}
            type="button"
          >
            {pinned.includes(pinId) ? "★" : "☆"}
          </button>
        </td>
      )}
      {values.map((value, idx) => (
        <td key={idx}>{value ? String(value) : ""}</td>
      ))}
    </tr>
  );

  const formatMaybe = (value?: string) => (value ? formatReadableTime(value) : "-");

  const deliveryRows =
    sortedDeliveries.length > 0
      ? sortedDeliveries.map((item, index) =>
          renderRow(
            `${item.order_id}-${item.notified_at}-${index}`,
            [
              item.order_id,
              item.status,
              formatReadableTime(item.notified_at),
              formatMaybe(item.last_seen_at),
              item.last_seen_age || "-",
              formatMaybe(item.queue_checked_at),
            ],
            item.order_id
          )
        )
      : [
          <tr key="empty">
            <td colSpan={7}>No fulfilled orders yet.</td>
          </tr>,
        ];

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Fulfilled Orders</h1>
        <div className="sub">
          Orders missing from the live queue and marked as likely delivered.
        </div>
        <div className="refresh-info">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
          <button onClick={fetchData} className="refresh-btn" type="button">
            ↻ Refresh Now
          </button>
        </div>
        <div className="actions">
          <div className="search">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search order id"
              aria-label="Search order id"
            />
            <button onClick={applySearch} className="search-btn" type="button">
              Search
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="search-btn"
                type="button"
              >
                Clear
              </button>
            )}
          </div>
          <Link className="action-link" href="/">
            Back to Live Queue
          </Link>
        </div>
      </div>

      <section>
        <header>
          <h2>Likely Delivered Orders</h2>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Order ID</th>
                <th>Status</th>
                <th>Notified at</th>
                <th>Last seen at</th>
                <th>Last seen age</th>
                <th>Queue checked at</th>
              </tr>
            </thead>
            <tbody>{deliveryRows}</tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
