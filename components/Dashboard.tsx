// components/Dashboard.tsx

"use client";

import { useEffect, useState } from "react";
import { formatReadableTime } from "@/lib/utils";

interface Summary {
  target_count: number;
  live_count: number;
  delivered_count: number;
  last_checked: string | null;
  last_checked_readable: string;
}

interface LiveRecord {
  order_id: string;
  queue_age_text: string;
  checked_at: string;
  checked_at_readable: string;
  source_url: string;
}

interface DeliveryRecord {
  order_id: string;
  status: string;
  notified_at: string;
  notified_at_readable: string;
  last_seen_at?: string;
  last_seen_at_readable?: string;
  last_seen_age?: string;
  queue_checked_at?: string;
  queue_checked_at_readable?: string;
  queue_count?: number;
  queue_url?: string;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [liveRecords, setLiveRecords] = useState<LiveRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setError(null);
      const [summaryRes, liveRes, deliveriesRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/live"),
        fetch("/api/deliveries"),
      ]);

      if (!summaryRes.ok || !liveRes.ok || !deliveriesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const summaryData = await summaryRes.json();
      const liveData = await liveRes.json();
      const deliveriesData = await deliveriesRes.json();

      setSummary(summaryData.summary);
      setLiveRecords(liveData.live_snapshot || []);
      setDeliveries(deliveriesData.deliveries || []);
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

  const renderRow = (values: (string | number | undefined | null)[]) => (
    <tr>
      {values.map((value, idx) => (
        <td key={idx}>{value ? String(value) : ""}</td>
      ))}
    </tr>
  );

  const liveRows =
    liveRecords.length > 0
      ? liveRecords.map((item) =>
          renderRow([
            item.order_id,
            item.queue_age_text,
            item.checked_at_readable,
            item.source_url,
          ])
        )
      : [
          <tr key="empty">
            <td colSpan={4}>No live snapshot yet.</td>
          </tr>,
        ];

  const deliveryRows =
    deliveries.length > 0
      ? deliveries.map((item) =>
          renderRow([
            item.order_id,
            item.status,
            item.notified_at_readable,
            item.last_seen_at_readable || "—",
            item.last_seen_age || "—",
            item.queue_checked_at_readable || "—",
          ])
        )
      : [
          <tr key="empty">
            <td colSpan={6}>No delivery history yet.</td>
          </tr>,
        ];

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Queue Watcher Dashboard</h1>
        <div className="sub">
          Live queue snapshots, removed-order history, and the timestamps we can reliably infer from
          the queue page. Orders marked <code>likely_delivered</code> are the ones that disappeared
          from the live queue and triggered a notification.
        </div>
        <div className="refresh-info">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
          <button onClick={fetchData} className="refresh-btn">
            ↻ Refresh Now
          </button>
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
          <div className="label">Likely delivered</div>
          <div className="value">{summary?.delivered_count ?? 0}</div>
        </div>
        <div className="card">
          <div className="label">Last checked</div>
          <div className="value" style={{ fontSize: "1rem" }}>
            {summary?.last_checked_readable || "never"}
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
                <th>Order ID</th>
                <th>Queue age text</th>
                <th>Checked at</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>{liveRows}</tbody>
          </table>
        </div>
      </section>

      <section>
        <header>
          <h2>Likely Delivered Orders</h2>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
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

      <div className="footer">
        API endpoints: <code>/api/health</code>, <code>/api/orders</code>, <code>/api/summary</code>,
        <code>/api/live</code>, <code>/api/deliveries</code>
      </div>
    </div>
  );
}
