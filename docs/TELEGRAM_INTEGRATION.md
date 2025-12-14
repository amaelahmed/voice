# Telegram Integration Guide

## Overview

This system integrates with Telegram to send job match notifications and allow users to approve or skip job opportunities via inline buttons.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start the conversation and use `/newbot` command
3. Follow the prompts to create a new bot
4. Copy the bot token (format: `123456789:ABCdeFGhijKLmnoPQRstUVwxyz`)

### 2. Configure Environment Variables

Add the bot token to your `.env.local`:

```
TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

### 3. Set Up Webhook (Production)

For production, configure the webhook URL with Telegram:

```bash
curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### 4. Local Testing with ngrok

For local development, use ngrok to expose your local server:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Set the webhook
curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
```

## API Endpoints

### POST `/api/telegram/webhook`

Receives Telegram callback queries from button interactions.

**Request format:**
- Telegram sends a JSON update with `callback_query` when user clicks a button
- Request is signed with `X-Telegram-Bot-API-Secret-Hash` header

**Supported actions:**
- `APPROVE|{matchScoreId}` - User approves the job match
- `SKIP|{matchScoreId}` - User skips the job match

### POST `/api/notifications/process`

Manually trigger processing of pending notifications.

```bash
curl -X POST http://localhost:3000/api/notifications/process
```

### GET `/api/applications`

Fetch applications with filtering.

**Query parameters:**
- `filter` - Optional filter by ApplicationStatus (APPROVED, SKIPPED, NOTIFIED, etc.)

## Workflow

1. **Match Score Ready**: When a `MatchScore` enters `READY_FOR_REVIEW` status, the system queues a notification.

2. **Notification Sent**: The `processReadyMatchScores()` function sends a Telegram message with:
   - Job title, company, location
   - Match score percentage
   - Three inline buttons: Approve, Skip, View JD

3. **User Action**: User clicks a button
   - **Approve**: Creates an `APPROVED` application event, marks match score as `READY_FOR_REVIEW`
   - **Skip**: Creates a `SKIPPED` application event, marks match score as `ARCHIVED`

4. **Dashboard**: Users can view all applications and their statuses at `/applications`

## Database Schema

### MatchScore Updates

Added fields:
- `status` (MatchScoreStatus) - PENDING, READY_FOR_REVIEW, ARCHIVED
- `telegramMessageId` - Telegram message ID for tracking
- `telegramMessageTs` - Timestamp of when notification was sent

### ApplicationStatus Updates

New statuses:
- `QUEUED_FOR_SUBMISSION` - Approved but awaiting manual confirmation before submission

## Rate Limiting

The system implements rate limiting to avoid Telegram bans:
- Minimum 1 second between notifications per user
- Configurable in `lib/workers/telegram-notification.ts`

## Monitoring

Check logs for:
- Notification delivery status
- Rate limiting events
- Webhook verification failures
- Database update errors

## Testing

### Test Data

The seed file creates test data with:
- Test user with Telegram ID: `123456789`
- Two test jobs
- Sample match scores and application events

To seed the database:

```bash
npm run db:seed
```

### Manual Testing

1. Get your Telegram user ID (use `@userinfobot`)
2. Update the test user's `telegramUserId` in the database
3. Trigger a notification:

```bash
curl -X POST http://localhost:3000/api/notifications/process
```

4. Check your Telegram for the notification with buttons
5. Click a button to test the webhook

## Troubleshooting

### Webhook not receiving requests
- Check webhook URL is correct: `curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo`
- Verify ngrok is still running
- Check that TELEGRAM_BOT_TOKEN is set correctly

### Messages not sending
- Verify Telegram user ID is correct (must be numeric)
- Check that BOT_TOKEN is valid
- Review logs for API errors

### Database issues
- Ensure migrations have run: `npm run db:migrate`
- Check that MatchScoreStatus enum is in schema
