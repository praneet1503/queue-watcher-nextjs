# Deployment Guide

This app consists of two parts:
1. **Modal Backend** - Queue monitoring, scheduling, API (in `modal/` directory)
2. **Next.js Frontend** - Dashboard UI (in root directory)

## Step 1: Deploy Modal Backend

### Prerequisites

```bash
pip install modal
modal token new  # Authenticate with Modal
```

### Deploy

```bash
cd modal/

# Create a secret with your configuration
modal secret create queue-watcher-secrets \
  --TARGET_ORDER_IDS "9226,9241,9243" \
  --BOT_TOKEN "your_telegram_bot_token" \
  --CHAT_ID "your_telegram_chat_id"

# Deploy the backend
modal deploy modal_backend.py
```

Modal will output a URL like:
```
✓ App created with URL: https://username--queue-watcher.modal.run
```

**Copy this URL** - you'll need it for the Next.js frontend.

## Step 2: Deploy Next.js Frontend to Vercel

### Prerequisites

- Node.js 18+
- Vercel account
- GitHub repository (push this repo to GitHub first)

### Configure

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
MODAL_API_URL=https://username--queue-watcher.modal.run
```

### Deploy

**Option A: Via Vercel CLI**

```bash
npm install -g vercel
vercel deploy
```

**Option B: Via GitHub (recommended)**

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repository
5. In environment variables, add:
   - `MODAL_API_URL=https://username--queue-watcher.modal.run`
6. Click "Deploy"

## Step 3: Verify Deployment

1. Open your Vercel URL
2. Dashboard should load and show:
   - ✅ Live queue count
   - ✅ Delivery history
   - ✅ Summary stats

## Setting Up Telegram Notifications (Optional)

### Get Telegram Credentials

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Run `/newbot` and follow the prompts
3. Copy your bot token
4. Get your chat ID:
   - Message your bot at least once
   - Visit: `https://api.telegram.org/bot<token>/getUpdates`
   - Find the `"id"` field in the chat object

### Update Modal Secret

```bash
modal secret update queue-watcher-secrets \
  --BOT_TOKEN "your_bot_token" \
  --CHAT_ID "your_chat_id"
```

The backend will auto-reload and start sending notifications.

## Testing

### Test Modal Backend

```bash
# Manually trigger a queue check
modal run modal/modal_backend.py::run_once

# View logs
modal logs modal_backend
```

### Test Next.js Frontend Locally

```bash
npm run dev
# Opens http://localhost:3000
```

If Modal isn't deployed yet, the dashboard will show empty data.

## Monitoring Multiple Order IDs

Update the Modal secret:

```bash
modal secret update queue-watcher-secrets \
  --TARGET_ORDER_IDS "4199,4226,9241,9243"
```

## Logs & Debugging

### Modal Backend Logs

```bash
modal logs modal_backend
```

### Vercel Frontend Logs

1. Go to your Vercel project dashboard
2. Click "Deployments"
3. Select the latest deployment
4. Click "View Logs"

## Updating the Code

### Update Backend

```bash
cd modal/
# Make changes to modal_backend.py
modal deploy modal_backend.py
```

### Update Frontend

```bash
# Make changes to React/Next.js code
git add .
git commit -m "Update dashboard"
git push  # If using GitHub deployment
# or
vercel deploy
```

## FAQ

**Q: How do I change the check interval?**

A: Edit `modal/modal_backend.py` line with `schedule=modal.Period(minutes=1)` to change the interval.

**Q: How do I add more order IDs to monitor?**

A: Update the Modal secret with new IDs:
```bash
modal secret update queue-watcher-secrets \
  --TARGET_ORDER_IDS "id1,id2,id3,..."
```

**Q: Can I host both on Modal instead of Vercel?**

A: Yes! Use the `@modal.asgi_app()` from the original `modal_app.py` to serve both frontend and API from Modal.

**Q: How do I see what orders are currently in the queue?**

A: Visit `/api/live` endpoint for the current queue snapshot.

## Architecture

```
Frontend (Vercel)
    ↓ HTTP requests
Modal API Backend
    ├─ Scheduled checks (every minute)
    ├─ Queue monitoring
    ├─ Telegram alerts
    └─ Data storage (modal.Dict)
```

---

Need help? Check the README.md or Modal docs: https://modal.com/docs

