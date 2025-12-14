# Quick Start: Telegram Approvals Dashboard

## What's Implemented

A complete Telegram-based job approval system with a dashboard to track applications.

### Core Features
1. **Telegram Webhook** - Receives approval/skip actions from Telegram buttons
2. **Notification Worker** - Sends job matches via Telegram with inline action buttons
3. **Applications Dashboard** - Web interface to view and filter job applications
4. **Local Testing Support** - Development endpoints for testing without Telegram

## Quick Setup (5 minutes)

### 1. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add (optional for local testing):
# TELEGRAM_BOT_TOKEN=your-token-from-botfather
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs?schema=public
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Seed Test Data
```bash
npm run db:seed
```

This creates:
- Test user with Telegram ID 123456789
- 2 sample jobs (Senior Software Engineer, Full Stack Developer)
- Match scores for testing

### 4. Test Locally (No Telegram Required)

**Test the webhook locally:**
```bash
curl -X POST http://localhost:3000/api/dev/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "matchScoreId": "your-match-score-id"
  }'
```

**View the dashboard:**
Open http://localhost:3000/applications in your browser

### 5. Test with Real Telegram (Optional)

**Prerequisites:**
- Telegram Bot Token from @BotFather
- ngrok installed

**Steps:**
```bash
# 1. Start ngrok
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# 2. Set Telegram webhook
curl -X POST https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'

# 3. Update your Telegram user ID in the database
# Visit: http://localhost:3000/api/prisma/studio (if available)
# Or use: npm run db:studio

# 4. Trigger notifications
curl -X POST http://localhost:3000/api/notifications/process

# 5. Check your Telegram and click the buttons!
```

## File Structure

### New Files Created
```
app/
├── (dashboard)/
│   ├── applications/page.tsx    # Dashboard UI
│   └── layout.tsx                # Dashboard layout
└── api/
    ├── telegram/webhook/route.ts # Telegram webhook handler
    ├── notifications/process/route.ts # Trigger notifications
    ├── applications/route.ts     # Fetch applications API
    ├── applications/approve/route.ts # Approval endpoint
    └── dev/test-webhook/route.ts # Local testing endpoint

lib/
├── telegram.ts                   # Telegram utilities
├── test-webhook.ts               # Webhook signature testing
└── workers/
    └── telegram-notification.ts  # Notification processing

prisma/
├── schema.prisma                 # Updated with new fields
├── seed.ts                        # Updated with test data
└── migrations/add_telegram_support/ # Database migrations

docs/
├── TELEGRAM_INTEGRATION.md       # Full setup guide
├── LOCAL_TESTING.md              # Testing guide
└── IMPLEMENTATION_SUMMARY.md     # Technical details
```

## Key Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/telegram/webhook` | Telegram webhook (approval/skip) |
| GET | `/api/applications` | Fetch applications list |
| POST | `/api/notifications/process` | Trigger notifications |
| POST | `/api/applications/approve` | Mark as queued for submission |
| POST | `/api/dev/test-webhook` | Test webhook locally (dev only) |
| GET | `/applications` | Dashboard UI |

## Database Changes

### New Enum: MatchScoreStatus
- PENDING (default)
- READY_FOR_REVIEW (when user approves)
- ARCHIVED (when user skips)

### New ApplicationStatus
- QUEUED_FOR_SUBMISSION (awaiting confirmation before external submission)

### Updated MatchScore
- `status: MatchScoreStatus` - Track match score state
- `telegramMessageId: String?` - Store Telegram message ID
- `telegramMessageTs: DateTime?` - Store notification timestamp

## Workflow

1. **Job Match Created** → MatchScore in PENDING status
2. **Ready for Review** → MatchScore → READY_FOR_REVIEW status
3. **Notification Sent** → Telegram message with buttons
4. **User Action**:
   - **Approve** → Creates APPROVED ApplicationEvent
   - **Skip** → Creates SKIPPED ApplicationEvent
5. **Dashboard Updates** → Shows latest status

## Troubleshooting

### Webhook not responding
- Check TELEGRAM_BOT_TOKEN is set
- Verify ngrok URL is correct
- Check webhook status: `curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo`

### Test endpoint not working
- Only available in development mode
- Check NODE_ENV is not "production"

### No match scores found
- Run seed: `npm run db:seed`
- Check database connection
- Verify migrations ran: `npm run db:migrate status`

## Documentation

For detailed information, see:
- **docs/TELEGRAM_INTEGRATION.md** - Complete setup and webhook details
- **docs/LOCAL_TESTING.md** - Testing methods and debugging
- **docs/IMPLEMENTATION_SUMMARY.md** - Technical implementation details

## Next Steps

1. **Get Telegram Bot Token** (optional):
   - Open Telegram and chat with @BotFather
   - Use `/newbot` command
   - Copy the token

2. **Set TELEGRAM_BOT_TOKEN** in .env.local

3. **Deploy webhook**:
   - For production: Set webhook URL with Telegram API
   - For development: Use ngrok

4. **Integrate with job matching system**:
   - When MatchScore enters READY_FOR_REVIEW
   - Call `/api/notifications/process` to send notifications
   - Can be triggered by cron job or event listener

## Support

- Check logs in terminal running `npm run dev`
- Use `npm run db:studio` to inspect database
- Review test file: `lib/test-webhook.ts` for webhook examples
