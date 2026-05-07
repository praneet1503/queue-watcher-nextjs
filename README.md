# Queue Watcher - Next.js Dashboard (Frontend Only)

A lightweight Next.js UI that reads queue data from an external Modal backend. This repo is frontend-only: no cron jobs, no scheduling, and no server-side workers.

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
│   (External)        │
└─────────────────────┘
```

## Quick Start

1. Deploy your backend (Modal) and copy its base URL.
2. Create `.env.local` and set:
   ```
   NEXT_PUBLIC_API_URL=https://username--queue-watcher.modal.run
   ```
3. Run the frontend:
   ```bash
   npm install
   npm run dev
   ```

## Environment Variables

```
NEXT_PUBLIC_API_URL=https://username--queue-watcher.modal.run
```

## API Endpoints (Backend)

Available at the base URL in `NEXT_PUBLIC_API_URL`:

- `GET /health`
- `GET /api/orders`
- `GET /api/summary`
- `GET /api/live`
- `GET /api/deliveries`

## Project Structure

```
queue-watcher-nextjs/
├── app/                      # Next.js app directory
│   ├── fulfilled/
│   ├── page.tsx             # Dashboard page
│   ├── layout.tsx           # App layout
│   └── globals.css          # Styling
├── components/
│   └── Dashboard.tsx        # React dashboard component
├── lib/
│   ├── api.ts               # External API client (frontend)
│   └── utils.ts             # Helper functions
├── package.json
├── tsconfig.json
└── .env.local
```

## Deployment (Vercel)

Set `NEXT_PUBLIC_API_URL` in your Vercel environment variables and deploy.

## License

MIT

