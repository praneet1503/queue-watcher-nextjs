# Queue Watcher - Next.js Dashboard + Modal Backend

A queue monitoring dashboard for Hack Club orders with a **Next.js frontend** and **Modal backend**.

- **Frontend**: React dashboard deployed on Vercel (no database needed)
- **Backend**: Python app with queue monitoring, scheduling, and API - deployed on Modal
- **Storage**: Modal.Dict for persistence
- **Scheduling**: Modal scheduled functions (every 1 minute)

## Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │
│   (React Dashboard) │
│  (Deployed Vercel)  │
└──────────┬──────────┘
           │ HTTP requests
           │ /api/summary
           │ /api/live
           │ /api/deliveries
           ▼
┌─────────────────────┐
│  Modal API Backend  │
│ (Python FastAPI)    │
│   (Deployed Modal)  │
├─────────────────────┤
│ Queue Monitoring    │
│ Telegram Alerts     │
│ Data Persistence    │
│ Scheduled Jobs      │
└─────────────────────┘
```

## Quick Start

### 1. Deploy Modal Backend

```bash
cd modal/
pip install modal

# Create a secret with your config
modal secret create queue-watcher-secrets \
  --TARGET_ORDER_IDS "9226,9241,9243" \
  --BOT_TOKEN "your_bot_token" \
  --CHAT_ID "your_chat_id"

# Deploy
modal deploy modal_backend.py
```

Modal will give you a URL like: `https://username--queue-watcher.modal.run`

### 2. Deploy Next.js Frontend

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
```

Edit `.env.local`:
```
MODAL_API_URL=https://username--queue-watcher.modal.run
```

Deploy to Vercel:
```bash
vercel deploy
```

### 3. Test Locally

**Terminal 1 - Modal Backend (optional for local testing):**
```bash
cd modal/
modal run modal_backend.py
```

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
# Opens http://localhost:3000
```

## Features

✅ **Beautiful Dashboard** - Real-time status with responsive design  
✅ **Queue Monitoring** - Automatically checks every minute  
✅ **Telegram Alerts** - Get notified when orders are fulfilled  
✅ **Readable Timestamps** - No more ISO format confusion  
✅ **Clean Data** - No source field clutter  
✅ **No Database** - Modal handles all persistence  
✅ **REST API** - Query data programmatically  

## Environment Variables

### Next.js (.env.local)

```
MODAL_API_URL=https://username--queue-watcher.modal.run
```

### Modal (create secret)

```bash
modal secret create queue-watcher-secrets \
  --TARGET_ORDER_IDS "9226,9241,9243" \
  --BOT_TOKEN "your_telegram_bot_token" \
  --CHAT_ID "your_chat_id"
```

## Telegram Setup (Optional)

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Run `/newbot` and follow the prompts
3. Copy the bot token
4. Get your CHAT_ID by messaging your bot and visiting:
   ```
   https://api.telegram.org/bot<token>/getUpdates
   ```
5. Add credentials to Modal secret

## API Endpoints

Available at `https://username--queue-watcher.modal.run`:

- `GET /health` → Health check
- `GET /api/orders` → Latest cached orders
- `GET /api/summary` → Statistics (target count, live orders, delivered count)
- `GET /api/live` → Live queue snapshot
- `GET /api/deliveries` → Delivery history

## Project Structure

```
queue-watcher-nextjs/
├── app/                      # Next.js app directory
│   ├── api/                  # API proxy routes
│   │   ├── health/
│   │   ├── orders/
│   │   ├── summary/
│   │   ├── live/
│   │   └── deliveries/
│   ├── page.tsx             # Dashboard page
│   ├── layout.tsx           # App layout
│   └── globals.css          # Styling
├── components/
│   └── Dashboard.tsx        # React dashboard component
├── lib/
│   ├── modal-client.ts      # Modal API client
│   └── utils.ts             # Helper functions
├── modal/                    # Backend code (for reference)
│   ├── modal_backend.py     # Modal app definition
│   └── README.md            # Backend setup guide
├── package.json
├── tsconfig.json
└── .env.example
```

## Monitoring Multiple Orders

Edit the Modal secret:

```bash
modal secret update queue-watcher-secrets \
  --TARGET_ORDER_IDS "4199,4226,9241,9243"
```

## Troubleshooting

### Dashboard shows no data

1. Check Modal backend is running:
   ```bash
   modal logs modal_backend
   ```

2. Verify `MODAL_API_URL` is correct in `.env.local`

3. Make sure Modal API is accessible

### No Telegram notifications

1. Test your bot token:
   ```
   https://api.telegram.org/bot<token>/getMe
   ```

2. Check Modal logs for errors:
   ```bash
   modal logs modal_backend
   ```

3. Verify `BOT_TOKEN` and `CHAT_ID` in the secret

### Can't deploy to Modal

1. Install Modal: `pip install modal`
2. Authenticate: `modal token new`
3. Deploy: `modal deploy modal/modal_backend.py`

## Development

**Local frontend development:**
```bash
npm run dev
```

**Local backend testing:**
```bash
cd modal/
modal run modal_backend.py
```

**Build for production:**
```bash
npm run build
npm start
```

## Differences from Python-Only Version

| Aspect | Before | Now |
|--------|--------|-----|
| Frontend | FastAPI HTML | React Dashboard |
| Deployment | Modal only | Modal + Vercel |
| Storage | modal.Dict | modal.Dict (unchanged) |
| Scheduling | Modal scheduled | Modal scheduled (unchanged) |
| API | Embedded in FastAPI | Separate Modal API |
| Dashboard | HTML template | React component |
| Responsive | Limited | Full |

## License

MIT

