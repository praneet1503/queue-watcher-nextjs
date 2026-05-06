# GitHub Actions Workflow for Queue Watcher

This file documents how to set up CI/CD for automatic deployments to Vercel.

## Setup

1. Create a GitHub Personal Access Token (PAT) or use GitHub App
2. Add these secrets to your GitHub repository:
   - `VERCEL_TOKEN` - Your Vercel API token
   - `VERCEL_ORG_ID` - Your Vercel organization ID
   - `VERCEL_PROJECT_ID` - Your Vercel project ID

See `.github/workflows/deploy.yml.example` for a sample workflow configuration.
