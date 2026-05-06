# Modal Backend Setup

This directory contains the backend code that runs on Modal.

## Installation

```bash
pip install modal
```

## Configure Secrets

Create a Modal secret with your configuration:

```bash
modal secret create queue-watcher-secrets \
  --TARGET_ORDER_IDS "9226,9241,9243" \
  --BOT_TOKEN "your_telegram_bot_token" \
  --CHAT_ID "your_chat_id"
```

Replace the values with your actual credentials.

## Deploy to Modal

```bash
modal deploy modal_backend.py
```

This will:
1. Create the app on Modal
2. Start the scheduled queue checks (every 1 minute)
3. Deploy the API server (accessible at a Modal URL)

## Test Locally

```bash
# Run a single check
modal run modal_backend.py::run_once

# Run the full app with scheduling
modal run modal_backend.py
```

## API Endpoints

Once deployed, Modal will provide a URL like: `https://username--queue-watcher.modal.run`

Available endpoints:
- `GET /health` - Health check
- `GET /api/orders` - Last cached orders
- `GET /api/summary` - Statistics
- `GET /api/live` - Live queue snapshot
- `GET /api/deliveries` - Delivery history

## Configure Next.js Frontend

Set the `MODAL_API_URL` environment variable in the Next.js app:

```bash
MODAL_API_URL=https://username--queue-watcher.modal.run
```

Then the frontend dashboard will fetch data from this URL.
