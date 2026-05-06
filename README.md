# Queue Watcher - Next.js Edition

A modern queue monitoring dashboard for Hack Club orders, now running on **Next.js** and **Vercel**.

This is a rewrite of the original Modal Python app to be serverless, fast, and easy to deploy on Vercel.

## What it does

- Monitors the Hack Club queue at https://flavortown.hackclub.com/queue
- Extracts order IDs from the **"Awaiting Periodical Fulfillment"** section
- Tracks specific target order IDs and sends **Telegram notifications** when they disappear (likely fulfilled)
- Displays a real-time dashboard with:
  - Live queue snapshot
  - Delivery history with **readable timestamps**
  - Summary statistics

## Key Features

✅ **No source field clutter** - Removed redundant source cause field  
✅ **Readable timestamps** - All times formatted as "May 06, 2025 14:30 UTC"  
✅ **Serverless** - Runs on Vercel with Vercel KV for storage  
✅ **Automated checks** - Configurable cron job (default: every minute)  
✅ **REST API** - Query status programmatically  
✅ **Beautiful dashboard** - Dark theme with responsive design

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd queue-watcher-nextjs
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
# Queue Configuration
QUEUE_URL=https://flavortown.hackclub.com/queue
TARGET_ORDER_IDS=9226,9241,9243
CHECK_INTERVAL_MINUTES=1

# Telegram (optional)
BOT_TOKEN=your_bot_token_here
CHAT_ID=your_chat_id_here

# Cron Security
CRON_SECRET=your_random_secret_here
```

### 3. Get Telegram Credentials (optional)

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Run `/newbot` and follow the prompts
3. Copy the bot token into `BOT_TOKEN`

#### Getting your CHAT_ID:

1. Message your bot at least once
2. Open this URL in your browser (replace `<token>`):
   ```
   https://api.telegram.org/bot<token>/getUpdates
   ```
3. Find `"chat": { "id": ... }` and copy that number into `CHAT_ID`

### 4. Deploy to Vercel

```bash
npm run build
```

Then deploy:

```bash
vercel deploy
```

**Important:** Add these secrets in Vercel:

- `TARGET_ORDER_IDS` - Your order IDs to monitor
- `BOT_TOKEN` - Telegram bot token
- `CHAT_ID` - Telegram chat ID
- `CRON_SECRET` - Random secret for cron validation

Setup **Vercel KV** for storage:

1. Go to your Vercel project settings
2. Add a new **KV Database**
3. Vercel will automatically set `KV_*` environment variables

### 5. Local Development

```bash
npm run dev
```

Open http://localhost:3000

## API Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/orders` → Latest cached orders
- `GET /api/summary` → Statistics
- `GET /api/live` → Live queue snapshot with readable timestamps
- `GET /api/deliveries` → Delivery history (without source field)

## Cron Job Configuration

The `vercel.json` file configures automatic checks:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-queue",
      "schedule": "*/1 * * * *"  // Every 1 minute
    }
  ]
}
```

Adjust the schedule as needed (cron format).

## Monitoring Multiple Orders

Use comma-separated order IDs:

```
TARGET_ORDER_IDS=4199,4226,9241,9243
```

## What's Different from the Python Version

| Feature | Python (Modal) | Next.js (Vercel) |
|---------|---|---|
| Deployment | Modal serverless | Vercel serverless |
| Storage | modal.Dict | Vercel KV |
| Scheduling | APScheduler | Vercel Cron |
| Timestamps | ISO format only | ISO + Readable format |
| Source field | Included | ✅ Removed |
| Dashboard | FastAPI + HTML | React + Next.js |
| Port | Custom | Built into Vercel |

## Architecture

```
app/
  ├── api/
  │   ├── health/       # Health check
  │   ├── orders/       # Last cached orders
  │   ├── summary/      # Statistics
  │   ├── live/         # Current queue snapshot
  │   ├── deliveries/   # Delivery history
  │   └── cron/
  │       └── check-queue/  # Scheduled job
  ├── page.tsx          # Dashboard
  └── layout.tsx        # App layout
lib/
  ├── scraper.ts        # Queue HTML parsing
  ├── storage.ts        # Vercel KV operations
  ├── notifier.ts       # Telegram notifications
  └── utils.ts          # Helpers
components/
  └── Dashboard.tsx     # React dashboard
```

## Troubleshooting

### Cron not running?

1. Verify `vercel.json` is in the root
2. Check Vercel project logs for `/api/cron/check-queue`
3. Ensure `CRON_SECRET` is set in Vercel environment

### No notifications?

1. Test your Telegram bot: `https://api.telegram.org/bot{BOT_TOKEN}/getMe`
2. Verify `BOT_TOKEN` and `CHAT_ID` are correct
3. Check Vercel function logs

### Orders not showing?

1. Verify `QUEUE_URL` is accessible
2. Check that order IDs in the queue start with 3+ digits
3. Review API logs in Vercel dashboard

## Optional Configuration

- `QUEUE_URL` (default: Hack Club queue)
- `REQUEST_TIMEOUT_SECONDS` (default: 10)
- `REQUEST_RETRIES` (default: 3)

## License

MIT
