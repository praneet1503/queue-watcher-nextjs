// app/fulfilled/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrders } from "@/lib/api";
import {
  getLikelyFulfilledOrders,
  getPinnedOrders,
  setPinnedOrders,
  updateLikelyFulfilledFromSnapshot,
} from "@/lib/localStorage";

export default function FulfilledPage() {
  const [likelyOrders, setLikelyOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setPinned(getPinnedOrders());
    const cachedLikely = getLikelyFulfilledOrders();
    setLikelyOrders(cachedLikely);
    if (cachedLikely.length > 0) {
      setLoading(false);
    }
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
      setIsRefreshing(true);
      const ordersData = await fetchOrders();
      const updatedLikely = updateLikelyFulfilledFromSnapshot(ordersData.orders);
      setLikelyOrders(updatedLikely);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(false);
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && likelyOrders.length === 0) {
    return (
      <div className="wrap">
        <div className="loading">Loading likely fulfilled orders...</div>
      </div>
    );
  }

  if (error && likelyOrders.length === 0) {
    return (
      <div className="wrap">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const showErrorBanner = error && likelyOrders.length > 0;
  const lastRefreshText = lastRefresh ? lastRefresh.toLocaleTimeString() : "Not refreshed yet";

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const filteredOrders = searchQuery
    ? likelyOrders.filter((orderId) => orderId.includes(searchQuery))
    : likelyOrders;

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aPinned = pinned.includes(a) ? 1 : 0;
    const bPinned = pinned.includes(b) ? 1 : 0;
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

  const orderRows =
    sortedOrders.length > 0
      ? sortedOrders.map((orderId, index) =>
          renderRow(`${orderId}-${index}`, [orderId], orderId)
        )
      : [
          <tr key="empty">
            <td colSpan={2}>No likely fulfilled orders yet.</td>
          </tr>,
        ];

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Fulfilled Orders</h1>
        <div className="sub">
          Orders missing from the live queue and stored locally as likely fulfilled.
        </div>
        <div className="refresh-info">
          Last refreshed: {lastRefreshText}
          <button
            onClick={fetchData}
            className="refresh-btn"
            type="button"
            disabled={isRefreshing}
          >
            ↻ Refresh Now
          </button>
          {isRefreshing && <span style={{ marginLeft: "0.75rem" }}>Updating...</span>}
        </div>
        {showErrorBanner && <div className="error">Error: {error}</div>}
        <div className="actions">
          <div className="search">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              id="fulfilled-order-search"
              name="fulfilled-order-search"
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
          <h2>Likely Fulfilled Orders</h2>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Order ID</th>
              </tr>
            </thead>
            <tbody>{orderRows}</tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
