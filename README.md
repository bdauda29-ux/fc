# Football League Tracker

A full-stack football league tracker built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Local Development

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` and `DIRECT_URL`.
3. Install dependencies:

```bash
npm install
```

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Neon Setup

Use two Neon connection strings:

- `DATABASE_URL`: Neon pooled connection string for the running app
- `DIRECT_URL`: Neon direct connection string for Prisma CLI and migrations

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Deploy To Vercel

1. Push this project to GitHub.
2. Import the repo into Vercel.
3. In Vercel project settings, add these environment variables for `Production`:

```env
DATABASE_URL=your_neon_pooled_url
DIRECT_URL=your_neon_direct_url
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=your_long_random_secret
```

4. Keep the framework preset as `Next.js`.
5. Deploy the app.

## Production Migration

Run production migrations against Neon before or during your first production rollout:

```bash
npm run prisma:migrate:deploy
```

You can run that locally against your production `DIRECT_URL`, or inside a CI/CD workflow.

## Recommended Vercel Workflow

- Use the Neon pooled string in `DATABASE_URL`
- Use the Neon direct string in `DIRECT_URL`
- Keep Prisma migrations out of preview deployments unless you intentionally want previews to change the same database
- Use a separate Neon branch or database for previews if needed

## Build And Validation

```bash
npm run lint
npm run build
```
