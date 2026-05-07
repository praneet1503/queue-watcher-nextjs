// components/Dashboard.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLiveSnapshot, fetchOrders, fetchSummary, LiveRecord, Summary } from "@/lib/api";
import {
  getLikelyFulfilledOrders,
  getPinnedOrders,
  setPinnedOrders,
  updateLikelyFulfilledFromSnapshot,
} from "@/lib/localStorage";
import { formatReadableTime } from "@/lib/utils";

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [liveRecords, setLiveRecords] = useState<LiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pinned, setPinned] = useState<string[]>([]);
  const [likelyFulfilledCount, setLikelyFulfilledCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setPinned(getPinnedOrders());
    setLikelyFulfilledCount(getLikelyFulfilledOrders().length);
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
      const [summaryData, liveData] = await Promise.all([
        fetchSummary(),
        fetchLiveSnapshot(),
      ]);

      setSummary(summaryData);
      setLiveRecords(liveData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }

    try {
      const ordersData = await fetchOrders();
      const updatedLikely = updateLikelyFulfilledFromSnapshot(ordersData.orders);
      setLikelyFulfilledCount(updatedLikely.length);
    } catch {
      setLikelyFulfilledCount(getLikelyFulfilledOrders().length);
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
        <div className="loading">Loading dashboard...</div>
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

  const filteredLiveRecords = searchQuery
    ? liveRecords.filter((item) => item.order_id.includes(searchQuery))
    : liveRecords;

  const sortedLiveRecords = [...filteredLiveRecords].sort((a, b) => {
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

  const liveRows =
    sortedLiveRecords.length > 0
      ? sortedLiveRecords.map((item, index) =>
          renderRow(
            `${item.order_id}-${item.checked_at}-${index}`,
            [
              item.order_id,
              item.queue_age_text,
              formatReadableTime(item.checked_at),
            ],
            item.order_id
          )
        )
      : [
          <tr key="empty">
            <td colSpan={4}>No live snapshot yet.</td>
          </tr>,
        ];

  const lastCheckedText = summary?.last_checked
    ? formatReadableTime(summary.last_checked)
    : "never";

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Queue Watcher Dashboard</h1>
        <div className="sub">
          Live queue snapshots and stats. Open the Fulfilled Orders page to review missing orders.
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
              id="order-search"
              name="order-search"
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
          <Link className="action-link" href="/fulfilled">
            View Fulfilled Orders
          </Link>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Targets</div>
          <div className="value">{summary?.target_count ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Live queue rows</div>
          <div className="value">{summary?.live_count ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Likely fulfilled</div>
          <div className="value">{likelyFulfilledCount}</div>
        </div>
        <div className="card">
          <div className="label">Last checked</div>
          <div className="value" style={{ fontSize: "1rem" }}>
            {lastCheckedText}
          </div>
        </div>
      </div>

      <section>
        <header>
          <h2>Live Queue Snapshot</h2>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Order ID</th>
                <th>Queue age text</th>
                <th>Checked at</th>
              </tr>
            </thead>
            <tbody>{liveRows}</tbody>
          </table>
        </div>
      </section>

      <div className="footer">
        API endpoints: <code>/api/health</code>, <code>/api/orders</code>, <code>/api/summary</code>,
        <code>/api/live</code>, <code>/api/deliveries</code>
      </div>
    </div>
  );
}
