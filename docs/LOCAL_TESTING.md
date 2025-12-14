# Local Testing Guide

## Quick Start

### 1. Set Up Environment

```bash
# Copy environment template
cp .env.example .env.local

# Add your values
# TELEGRAM_BOT_TOKEN=your-token-here (optional for local testing)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs?schema=public
```

### 2. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Testing the Webhook

### Method 1: Using the Test Endpoint (No Telegram Bot Required)

The easiest way to test locally is using the development test endpoint:

```bash
# Test APPROVE action
curl -X POST http://localhost:3000/api/dev/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "matchScoreId": "YOUR_MATCH_SCORE_ID"
  }'

# Test SKIP action
curl -X POST http://localhost:3000/api/dev/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "SKIP",
    "matchScoreId": "YOUR_MATCH_SCORE_ID"
  }'
```

### Method 2: Using Real Telegram Bot (With ngrok)

#### Prerequisites
- Telegram Bot Token from @BotFather
- ngrok installed (https://ngrok.com/download)

#### Steps

1. **Start ngrok:**
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

2. **Set Telegram webhook:**
```bash
curl -X POST https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
```

3. **Get your Telegram user ID:**
   - Open Telegram and search for @userinfobot
   - Start the bot and it will show your user ID
   - Note the numeric ID

4. **Update test user in database:**

   Using Prisma Studio:
   ```bash
   npm run db:studio
   ```

   - Find the User with id "test-user-1"
   - Change `telegramUserId` to your user ID
   - Save

5. **Verify webhook is set:**
```bash
curl https://api.telegram.org/bot{YOUR_TOKEN}/getWebhookInfo
```

6. **Trigger a notification:**
```bash
curl -X POST http://localhost:3000/api/notifications/process
```

7. **Check your Telegram:**
   - You should receive a notification with buttons
   - Click APPROVE or SKIP
   - The webhook will process your action

## Testing the Dashboard

### View Applications

Visit `http://localhost:3000/applications` to see the dashboard.

The dashboard displays:
- Total applications count
- Approval/skip statistics
- Average match score
- Filterable table of applications
- Real-time status updates

### Test with Sample Data

The seed file includes test data. To reset and seed:

```bash
# Reset database (if using local PostgreSQL)
npm run db:migrate reset

# Seed with test data
npm run db:seed
```

This creates:
- 1 test user with Telegram ID 123456789
- 2 test jobs (Senior Software Engineer, Full Stack Developer)
- 2 match scores (0.85 and 0.72)
- 1 sample application event

## API Endpoints for Testing

### Fetch Applications

```bash
# Get all applications
curl http://localhost:3000/api/applications

# Filter by status
curl "http://localhost:3000/api/applications?filter=APPROVED"
curl "http://localhost:3000/api/applications?filter=SKIPPED"
curl "http://localhost:3000/api/applications?filter=NOTIFIED"
```

### Process Notifications

```bash
# Trigger notification processing for READY_FOR_REVIEW match scores
curl -X POST http://localhost:3000/api/notifications/process
```

### Approve Application

```bash
curl -X POST http://localhost:3000/api/applications/approve \
  -H "Content-Type: application/json" \
  -d '{"matchScoreId": "YOUR_MATCH_SCORE_ID"}'
```

### Test Webhook (Development Only)

```bash
# Simulate APPROVE action
curl -X POST http://localhost:3000/api/dev/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "matchScoreId": "YOUR_MATCH_SCORE_ID",
    "telegramUserId": "123456789"
  }'
```

## Finding Match Score IDs

You can get match score IDs in several ways:

### Option 1: Prisma Studio

```bash
npm run db:studio
```

Navigate to MatchScore table and copy the ID.

### Option 2: Query via API

```bash
# This gets full application data including match score
curl http://localhost:3000/api/applications
```

### Option 3: Database CLI

```bash
# Using psql (if PostgreSQL is running locally)
psql postgresql://postgres:postgres@localhost:5432/nextjs

SELECT id, score, status FROM "MatchScore" LIMIT 10;
```

## Debugging

### Check Logs

Watch the terminal running `npm run dev` for:
- Webhook verification messages
- Database update confirmations
- Rate limiting events
- Error messages

### Enable Verbose Logging

Add console.log statements in:
- `app/api/telegram/webhook/route.ts`
- `lib/workers/telegram-notification.ts`
- `app/api/applications/route.ts`

### Database Issues

```bash
# View current schema
npm run db:studio

# Check migration status
npx prisma migrate status

# Push schema changes (if needed)
npx prisma db push
```

## Troubleshooting

### Test endpoint returns 403
- The test endpoint only works in development mode
- Check that `NODE_ENV` is not set to "production"

### Match score not found
- Seed the database: `npm run db:seed`
- Verify the ID exists in the database

### ngrok URL keeps changing
- Set up a paid ngrok account for static URLs
- Or use `--authtoken` to use your account

### Telegram not receiving messages
- Verify BOT_TOKEN is correct
- Check that Telegram user ID is numeric
- Verify TELEGRAM_BOT_TOKEN is set in environment

### No logs appearing
- Make sure `npm run dev` is running
- Check that the console is not being filtered
- Try a simple endpoint first to verify dev server is running
