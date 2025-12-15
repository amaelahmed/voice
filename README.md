# Job Assistant (Next.js)

## Prerequisites

- Node.js (recommended: 20+)
- SQLite (via Prisma)

## Environment variables

Copy the template and fill in values:

```bash
cp .env.example .env
cp .env.example .env.local
```

### Required

- `DATABASE_URL` – SQLite database URL used by Prisma.
  - Example: `file:./dev.db`
- `OPENAI_API_KEY` – used for CV parsing/matching via OpenAI.
- `TELEGRAM_BOT_TOKEN` – used for Telegram notifications.
- `STORAGE_BUCKET` – storage bucket name for CV uploads (S3 or S3-compatible).

Notes:
- Prisma CLI reads `.env` by default.
- Next.js reads `.env.local` (and `.env`). Keeping them in sync avoids surprises.

## Database (Prisma + SQLite)

This project uses Prisma for the data layer. The schema lives in `prisma/schema.prisma`.

### Create tables

After setting `DATABASE_URL`, run:

```bash
npx prisma migrate dev
```

### Seed reference data

The seed inserts deterministic reference data:

- Default `JobSource` records
- `ExperienceLevelPreset` rows (to keep ordering stable)

Run:

```bash
npx prisma db seed
```

## Development

```bash
npm run dev
```

## Prisma client helper

Use the singleton Prisma client exported from `lib/db.ts` in API routes and server components.
