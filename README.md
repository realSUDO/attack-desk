# AttackDesk

## Project Overview

AttackDesk is a visual execution workspace for missions, deadlines, post
ideas, canvases, and weekly reviews. This repository currently provides the
backend foundation and minimal rendering-strategy demonstration pages.

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL / Neon
- Zod
- Server Actions
- Route Handlers

## Environment Variables

Create `.env` from `.env.example` and set a real PostgreSQL connection:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

## Database Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

## Run Locally

```bash
npm run dev
```

## API Routes

- `GET /api/missions`
- `POST /api/missions`
- `GET /api/missions/[id]`
- `PATCH /api/missions/[id]`
- `DELETE /api/missions/[id]`
- `GET /api/deadlines`
- `POST /api/deadlines`
- `GET /api/deadlines/[id]`
- `PATCH /api/deadlines/[id]`
- `DELETE /api/deadlines/[id]`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/[id]`
- `PATCH /api/posts/[id]`
- `DELETE /api/posts/[id]`
- `GET /api/canvases`
- `POST /api/canvases`
- `GET /api/canvases/[id]`
- `PATCH /api/canvases/[id]`
- `DELETE /api/canvases/[id]`
- `GET /api/weekly-reviews`
- `POST /api/weekly-reviews`
- `GET /api/weekly-reviews/[id]`
- `PATCH /api/weekly-reviews/[id]`
- `DELETE /api/weekly-reviews/[id]`

## Server Actions

- `src/actions/mission.actions.ts`: create, update, complete, delete
- `src/actions/deadline.actions.ts`: create, update, complete, delete
- `src/actions/post.actions.ts`: create, update, mark ready, mark posted, delete
- `src/actions/canvas.actions.ts`: create, update title, delete
- `src/actions/weekly-review.actions.ts`: create, update, delete

## Rendering Strategies

- SSG: `/`
- SSR/dynamic: `/dashboard`, `/board`, `/post-lab`, `/canvas`
- ISR: `/showcase` (60-second revalidation)

## API Routes vs Server Actions

Route Handlers provide REST-style CRUD for programmatic access, API testing,
future drag-and-drop updates, and canvas autosave.

Server Actions handle internal form submissions in the Next.js application.
They return plain objects and trigger route revalidation after mutations.

## Assignment Concepts Covered

- File-based routing
- Layouts
- Multiple pages and routes
- SSR
- SSG
- ISR
- API Route Handlers
- GET, POST, PATCH, and DELETE
- Prisma database integration
- Structured API responses
- Validation and error handling
- Server Actions
- `"use server"` directive

## Assumptions / Limitations

- Single-user app
- No authentication in V1
- Canvas data is stored as JSON
- PostgreSQL is required
- Frontend polish will be added later
