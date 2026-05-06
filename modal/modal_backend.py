"""
Queue Watcher Modal Backend

Runs the queue monitoring, notifications, and API server on Modal.
The Next.js frontend calls the API endpoints to display the dashboard.
"""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from html import escape
from typing import Optional

import modal
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

# ============================================================================
# Configuration & Setup
# ============================================================================

app = modal.App("queue-watcher")

# Define image with required dependencies
image = modal.Image.debian_slim().pip_install(
    "requests",
    "beautifulsoup4",
    "fastapi",
)

# Persistent key-value storage (replaces SQLite)
state_dict = modal.Dict.from_name("queue-watcher-state", create_if_missing=True)

# FastAPI dashboard served from Modal
api_app = FastAPI(title="Queue Watcher API")

# ============================================================================
# Constants & Configuration
# ============================================================================

QUEUE_URL = "https://flavortown.hackclub.com/queue"
SECTION_TITLE = "Awaiting Periodical"
REQUEST_TIMEOUT_SECONDS = 10.0
REQUEST_RETRIES = 3
DEFAULT_TARGET_ORDER_IDS = "9226,9241,9243"
DELIVERY_HISTORY_KEY = "delivery_events"
MAX_DELIVERY_EVENTS = 200

# ============================================================================
# Logging Helpers
# ============================================================================


def log_info(msg: str) -> None:
    print(f"[INFO] {msg}")


def log_warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def log_alert(msg: str) -> None:
    print(f"[ALERT] {msg}")


def log_error(msg: str) -> None:
    print(f"[ERROR] {msg}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_readable_time(value: Optional[str]) -> str:
    if not value:
        return "Unknown"

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).strftime("%b %d, %Y %H:%M UTC")
    except Exception:
        return str(value)


def _read_json_value(key: str, default):
    raw_value = state_dict.get(key)
    if raw_value is None:
        return default
    if isinstance(raw_value, (list, dict)):
        return raw_value
    if isinstance(raw_value, str):
        try:
            return json.loads(raw_value)
        except Exception:
            return default
    return default


def _write_json_value(key: str, value) -> None:
    state_dict[key] = json.dumps(value)


def _load_target_ids() -> list[str]:
    try:
        secrets = modal.Secret.from_name("queue-watcher-secrets")
        raw_target_ids = secrets.get("TARGET_ORDER_IDS", "")
    except Exception:
        raw_target_ids = DEFAULT_TARGET_ORDER_IDS

    target_ids = [oid.strip() for oid in (raw_target_ids or "").split(",") if oid.strip()]
    return target_ids or [oid.strip() for oid in DEFAULT_TARGET_ORDER_IDS.split(",") if oid.strip()]


def _load_notification_credentials() -> tuple[str, str]:
    try:
        secrets = modal.Secret.from_name("queue-watcher-secrets")
        bot_token = secrets.get("BOT_TOKEN", "")
        chat_id = secrets.get("CHAT_ID", "")
        return bot_token, chat_id
    except Exception:
        return "", ""


def _load_delivery_events() -> list[dict]:
    events = _read_json_value(DELIVERY_HISTORY_KEY, [])
    return events if isinstance(events, list) else []


def _save_delivery_events(events: list[dict]) -> None:
    _write_json_value(DELIVERY_HISTORY_KEY, events[-MAX_DELIVERY_EVENTS:])


def _append_delivery_event(event: dict) -> None:
    events = _load_delivery_events()
    events.append(event)
    events.sort(key=lambda item: item.get("notified_at", ""), reverse=True)
    _save_delivery_events(events)


def _normalize(text: str) -> str:
    """Normalize text for comparison (lowercase, collapse whitespace)."""
    return " ".join(text.split()).strip().lower()


def _extract_numeric_ids(text: str) -> list[str]:
    """Extract numeric order IDs (3+ digits) from text."""
    return re.findall(r"\b\d{3,}\b", text)


def _find_order_id_in_row(row) -> Optional[str]:
    """Extract order ID from a table row element."""
    # Try attributes first (e.g., data-order-id)
    for attr_value in row.attrs.values() if hasattr(row, "attrs") else []:
        if isinstance(attr_value, str):
            matches = _extract_numeric_ids(attr_value)
            if matches:
                return matches[0]

    # Try first cell
    cells = row.find_all(["td", "th"], recursive=True) if hasattr(row, "find_all") else []
    if cells:
        first_text = cells[0].get_text(" ", strip=True)
        matches = _extract_numeric_ids(first_text)
        if matches:
            return matches[0]

    # Try any cell text
    for cell in cells:
        cell_text = cell.get_text(" ", strip=True)
        matches = _extract_numeric_ids(cell_text)
        if matches:
            return matches[0]

    # Try links inside the row
    for anchor in row.find_all("a", href=True) if hasattr(row, "find_all") else []:
        matches = _extract_numeric_ids(str(anchor.get("href", "")))
        if matches:
            return matches[0]

    # Row text fallback
    row_text = row.get_text(" ", strip=True) if hasattr(row, "get_text") else str(row)
    matches = _extract_numeric_ids(row_text)
    return matches[0] if matches else None


def _extract_queue_records_from_html(html: str) -> list[dict]:
    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception as exc:
        log_error(f"Failed to parse HTML: {exc}")
        return []

    needle = _normalize(SECTION_TITLE)
    marker = soup.find(string=lambda s: isinstance(s, str) and needle in _normalize(s))
    if not marker:
        log_warn("Section marker not found")
        return []

    marker_tag = marker.parent if hasattr(marker, "parent") else None
    if marker_tag is None:
        log_warn("Marker parent not found")
        return []

    table = marker_tag.find_next("table")
    if table is None:
        container = marker_tag.find_parent(["section", "article", "main", "div", "body"])
        if container:
            table = container.find("table")

    if table is None:
        log_warn("Table not found")
        return []

    records: list[dict] = []
    seen: set[str] = set()
    checked_at = _now_iso()

    for row in table.find_all("tr"):
        try:
            cells = row.find_all(["td", "th"], recursive=True) if hasattr(row, "find_all") else []
            if len(cells) < 2:
                continue

            order_id_matches = _extract_numeric_ids(cells[0].get_text(" ", strip=True))
            if not order_id_matches:
                continue

            order_id = order_id_matches[0]
            if order_id in seen:
                continue

            seen.add(order_id)
            records.append(
                {
                    "order_id": order_id,
                    "queue_age_text": cells[1].get_text(" ", strip=True),
                    "checked_at": checked_at,
                    "source_url": QUEUE_URL,
                }
            )
        except Exception as exc:
            log_warn(f"Failed to extract record from row: {exc}")
            continue

    return records


def _fetch_queue_snapshot() -> list[dict]:
    session = requests.Session()
    headers = {
        "User-Agent": "queue-watcher/1.0",
        "Accept": "text/html,application/xhtml+xml",
    }

    last_error: Optional[Exception] = None

    for attempt in range(1, REQUEST_RETRIES + 1):
        try:
            response = session.get(
                QUEUE_URL, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS
            )
            response.raise_for_status()
            return _extract_queue_records_from_html(response.text)
        except Exception as exc:
            last_error = exc
            if attempt < REQUEST_RETRIES:
                time.sleep(0.5 * attempt)
                continue
            log_error(f"Fetch failed after {REQUEST_RETRIES} retries: {exc}")
            return []

    log_error(f"Fetch error: {last_error}")
    return []


# ============================================================================
# Modal Functions
# ============================================================================


@app.function(image=image)
def fetch_queue_snapshot() -> list[dict]:
    """Fetch the live queue and return structured records."""
    return _fetch_queue_snapshot()


@app.function(image=image)
def send_telegram_notification(order_id: str, bot_token: str, chat_id: str) -> bool:
    """Send Telegram notification for fulfilled order."""
    if not bot_token or not chat_id:
        log_error("BOT_TOKEN or CHAT_ID not provided")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": f"🚀 Order {order_id} is no longer in queue. Likely fulfilled.",
        "disable_web_page_preview": True,
    }

    try:
        response = requests.post(url, data=payload, timeout=REQUEST_TIMEOUT_SECONDS)
        data = response.json() if response.headers.get("content-type") == "application/json" else {}

        if response.status_code != 200:
            log_error(f"Telegram HTTP {response.status_code}: {response.text[:200]}")
            return False

        if isinstance(data, dict) and data.get("ok") is False:
            log_error(f"Telegram API error: {data}")
            return False

        log_info(f"Telegram notification sent for order {order_id}")
        return True
    except Exception as e:
        log_error(f"Failed to send Telegram notification: {e}")
        return False


@app.function(
    image=image,
    schedule=modal.Period(minutes=1),  # Run every minute
)
def check_queue() -> None:
    """Scheduled job: check queue and notify if target orders disappear."""

    log_info("Checking queue")

    target_ids = _load_target_ids()
    bot_token, chat_id = _load_notification_credentials()

    if not target_ids:
        log_warn("TARGET_ORDER_IDS not configured")
        return

    # Fetch current queue snapshot
    current_snapshot = fetch_queue_snapshot.remote()

    if not current_snapshot:
        log_warn("Parsed 0 orders; skipping to avoid false positives")
        return

    current_orders = [record["order_id"] for record in current_snapshot]
    snapshot_by_id = {record["order_id"]: record for record in current_snapshot}

    log_info(f"Orders found: {len(current_orders)}")

    # Update cached orders and structured snapshot
    try:
        state_dict["last_orders"] = json.dumps(current_orders)
        state_dict["last_queue_snapshot"] = json.dumps(current_snapshot)
        state_dict["last_checked"] = _now_iso()
    except Exception as e:
        log_error(f"Failed to update state: {e}")

    # Check each target order
    for target_id in target_ids:
        if target_id in snapshot_by_id:
            seen_record = snapshot_by_id[target_id]
            state_dict[f"last_seen_at:{target_id}"] = seen_record["checked_at"]
            state_dict[f"last_seen_age:{target_id}"] = seen_record["queue_age_text"]
            if not state_dict.get(f"first_seen_at:{target_id}"):
                state_dict[f"first_seen_at:{target_id}"] = seen_record["checked_at"]
            log_info(f"Order {target_id} still in queue")
            continue

        # Order missing: check if already notified
        notified_key = f"notified:{target_id}"
        already_notified = state_dict.get(notified_key, False)

        if already_notified:
            log_info(f"Order {target_id} removed; already notified")
            continue

        # Send notification
        success = send_telegram_notification.remote(target_id, bot_token, chat_id)
        if success:
            state_dict[notified_key] = True
            notified_at = _now_iso()
            state_dict[f"notified_at:{target_id}"] = notified_at
            _append_delivery_event(
                {
                    "order_id": target_id,
                    "status": "likely_delivered",
                    "notified_at": notified_at,
                    "last_seen_at": state_dict.get(f"last_seen_at:{target_id}"),
                    "last_seen_age": state_dict.get(f"last_seen_age:{target_id}"),
                    "queue_checked_at": state_dict.get("last_checked"),
                    "queue_count": len(current_orders),
                    "queue_url": QUEUE_URL,
                }
            )
            log_alert(f"Order {target_id} removed → notification sent")
        else:
            log_error(f"Failed to notify for order {target_id}")


# ============================================================================
# API Routes
# ============================================================================


@api_app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@api_app.get("/api/orders")
def get_orders() -> dict[str, object]:
    orders = _read_json_value("last_orders", [])
    last_checked = state_dict.get("last_checked")
    return {
        "orders": orders,
        "last_checked": last_checked,
    }


@api_app.get("/api/summary")
def get_summary() -> dict[str, object]:
    target_ids = _load_target_ids()
    snapshot = _read_json_value("last_queue_snapshot", [])
    events = _load_delivery_events()
    last_checked = state_dict.get("last_checked")

    delivered_count = len([e for e in events if e.get("status") == "likely_delivered"])

    return {
        "summary": {
            "target_count": len(target_ids),
            "live_count": len(snapshot),
            "delivered_count": delivered_count,
            "last_checked": last_checked,
        }
    }


@api_app.get("/api/live")
def get_live() -> dict[str, object]:
    snapshot = _read_json_value("last_queue_snapshot", [])
    return {
        "live_snapshot": snapshot,
        "live_targets": snapshot,
    }


@api_app.get("/api/deliveries")
def get_deliveries() -> dict[str, object]:
    events = _load_delivery_events()
    return {"deliveries": events}


@app.function(image=image)
@modal.asgi_app()
def website():
    return api_app


# ============================================================================
# Manual Trigger (for testing)
# ============================================================================


@app.function(image=image)
def run_once() -> None:
    """Manually trigger a single queue check (for testing)."""
    log_info("Manual trigger: running check_queue once")
    check_queue.remote()


# ============================================================================
# Entrypoint (for `modal run`)
# ============================================================================


@app.local_entrypoint()
def main():
    """Local entrypoint for testing."""
    log_info("Queue Watcher Modal Backend")
    log_info("Scheduled job: check_queue() every 1 minute")
    log_info("")
    log_info("To manually trigger a check:")
    log_info("  modal run modal_backend.py::run_once")
    log_info("")
    log_info("API Endpoints:")
    log_info("  /health - Health check")
    log_info("  /api/orders - Last cached orders")
    log_info("  /api/summary - Statistics")
    log_info("  /api/live - Live queue snapshot")
    log_info("  /api/deliveries - Delivery history")
