# AttackDesk

A visual execution workspace for missions, deadlines, post ideas, canvases, and weekly reviews.

**Live → [attack.sudohq.me](https://attack.sudohq.me)**

---

## Stack

- **Next.js 16** — App Router, Server Actions, Route Handlers
- **Prisma 6** — ORM with PostgreSQL
- **Neon** — serverless Postgres (production)
- **Zod 4** — validation
- **Konva / react-konva** — canvas editor
- **Tailwind CSS 4**

---

## Features

- **Mission Board** — track tasks across PLANNED / DOING / DONE with priorities and deadlines
- **Deadline Radar** — upcoming deadlines sorted by priority and due date
- **Post Lab** — content pipeline from idea → draft → ready → posted
- **Canvas** — freehand drawing and shape editor linked to missions
- **Weekly Review** — structured reflection with went-right / went-wrong / next-plan
- **Dashboard** — live stats across all workstreams

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env and set DATABASE_URL
cp .env.example .env

# 3. Start Postgres
docker compose up -d

# 4. Run migrations and generate Prisma client
npx prisma migrate dev
npx prisma generate

# 5. Seed demo data
npm run db:seed

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |

Local default (matches `compose.yaml`):
```
DATABASE_URL="postgresql://attackdesk:attackdesk@localhost:5432/attackdesk?schema=public"
```

---

## API Routes

All routes return `{ success, message, data }`.

| Method | Route | Description |
|--------|-------|-------------|
| GET / POST | `/api/missions` | List or create missions |
| GET / PATCH / DELETE | `/api/missions/[id]` | Get, update, or delete a mission |
| GET / POST | `/api/deadlines` | List or create deadlines |
| GET / PATCH / DELETE | `/api/deadlines/[id]` | Get, update, or delete a deadline |
| GET / POST | `/api/posts` | List or create post ideas |
| GET / PATCH / DELETE | `/api/posts/[id]` | Get, update, or delete a post |
| GET / POST | `/api/canvases` | List or create canvases |
| GET / PATCH / DELETE | `/api/canvases/[id]` | Get, update, or delete a canvas |
| GET / POST | `/api/weekly-reviews` | List or create weekly reviews |
| GET / PATCH / DELETE | `/api/weekly-reviews/[id]` | Get, update, or delete a review |

---

## Deployment (Vercel + Neon)

1. Create a project on [neon.tech](https://neon.tech) and copy the **pooled** connection string
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `DATABASE_URL` in Vercel → Settings → Environment Variables
4. Deploy — migrations run automatically via the build command
5. Seed production once:
   ```bash
   DATABASE_URL="<neon-connection-string>" npm run db:seed
   ```

---

## Rendering Strategies

| Route | Strategy |
|-------|----------|
| `/` | SSG |
| `/dashboard`, `/board`, `/post-lab`, `/canvas` | SSR |
| `/showcase` | ISR (60s revalidation) |
