# Deployment Instructions

## Push to GitHub

This repository is ready to push to GitHub. Follow these steps:

### 1. Create a new GitHub repository

Go to [github.com/new](https://github.com/new) and create a new repository named `queue-watcher-nextjs` (or your preferred name).

**DO NOT initialize with README, .gitignore, or license** - we already have those.

### 2. Add GitHub remote and push

Run these commands in the project directory:

```bash
cd queue-watcher-nextjs

# Add the remote (replace YOUR_USERNAME and YOUR_REPO with your values)
git remote add origin https://github.com/YOUR_USERNAME/queue-watcher-nextjs.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Verify on GitHub

Check [github.com/YOUR_USERNAME/queue-watcher-nextjs](https://github.com/YOUR_USERNAME/queue-watcher-nextjs) to confirm the files are there.

## Deploy to Vercel

### 1. Sign up / Login to Vercel

Go to [vercel.com](https://vercel.com)

### 2. Import the GitHub repository

1. Click **"New Project"**
2. Select **"Import Git Repository"**
3. Search for and select `queue-watcher-nextjs`
4. Click **Import**

### 3. Configure Environment Variables

In the Vercel project settings, add these environment variables:

```
QUEUE_URL=https://flavortown.hackclub.com/queue
TARGET_ORDER_IDS=9226,9241,9243
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
CRON_SECRET=your_random_secret_here
```

(Keep `BOT_TOKEN` and `CHAT_ID` blank if you don't want Telegram notifications)

### 4. Connect Vercel KV

1. Go to **Storage** tab in Vercel
2. Click **Create Database**
3. Select **KV Database**
4. Follow the prompts

Vercel will automatically add `KV_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN` to your environment variables.

### 5. Deploy

Click **Deploy** - Vercel will automatically build and deploy your app.

## ✅ Security Checklist

**Your code is clean - these files are NOT in the repository:**

- ✅ `.env.local` - excluded by `.gitignore`
- ✅ `node_modules/` - excluded by `.gitignore`
- ✅ `.next/` build folder - excluded by `.gitignore`
- ✅ No hardcoded credentials anywhere
- ✅ `.env.example` included (with placeholder values only)

All sensitive configuration is managed via:
- Vercel environment variables (never stored in git)
- GitHub secrets (if using CI/CD)

## CI/CD Pipeline (Optional)

To automatically deploy on every push to `main`:

1. Create a GitHub Personal Access Token:
   - Go to [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click **Generate new token (classic)**
   - Select `repo` scope
   - Copy the token

2. Get your Vercel details:
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Create a token and copy it
   - Go to your project settings → copy **ORG ID** and **PROJECT ID**

3. Add GitHub secrets to your repository:
   - Go to **Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Add:
     - `VERCEL_TOKEN` = your Vercel token
     - `VERCEL_ORG_ID` = your organization ID
     - `VERCEL_PROJECT_ID` = your project ID

4. Uncomment/enable `.github/workflows/deploy.yml` and update it with your details

Now every push to `main` will automatically deploy to Vercel!

## Support

See `README.md` for:
- API documentation
- Environment variables reference
- Troubleshooting guide
- Architecture overview

---

Happy monitoring! 🎉
