# AttackDesk

A visual execution workspace for missions, deadlines, post ideas, canvases, and weekly reviews.

**Live → [attack.sudohq.me](https://attack.sudohq.me)**

---

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/423bcb0f-70de-4bea-a853-86c748892099" alt="AttackDesk Home" width="100%" />
      <br />
      <sub>Home / Landing</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/5c701d45-a81d-4f80-8e67-6cb6eb4d101d" alt="AttackDesk Dashboard" width="100%" />
      <br />
      <sub>Command Dashboard</sub>
    </td>
  </tr>

  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/a3f5bac6-e432-4fbf-8327-7fb1799c0d15" alt="AttackDesk Board" width="100%" />
      <br />
      <sub>Command Dashboard dark</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/8f435807-1be7-4803-9a2e-9e0b1f7d31ca" alt="AttackDesk Deadlines" width="100%" />
      <br />
      <sub>Mission board</sub>
    </td>
  </tr>

  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/41ab6dbe-929f-425b-b898-49550fcd1ce9" alt="AttackDesk Post Lab" width="100%" />
      <br />
      <sub>Post Lab</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/38570744-e359-4322-ba37-bcedd79f3a8a" alt="AttackDesk Canvas" width="100%" />
      <br />
      <sub>Canvas Workspace</sub>
    </td>
  </tr>

  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/f48d73a1-7b85-4ab2-859c-333fa9506290" alt="AttackDesk Weekly Review" width="100%" />
      <br />
      <sub>Canvas playground</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/3c3a29d7-75ef-4ead-b140-562093a34a00" alt="AttackDesk Showcase" width="100%" />
      <br />
      <sub>Weekly Review</sub>
    </td>
  </tr>
</table>

---

## What is AttackDesk?

AttackDesk is a personal execution workspace — a single place to plan and track work across multiple dimensions at once. Instead of context-switching between a task manager, a content planner, a notes app, and a drawing tool, everything lives together and links to each other.

Missions can be tied to deadlines and canvases. Canvases can reference deadlines. Post ideas can be linked to visual workspaces. The dashboard surfaces what matters right now: today's focus, the nearest deadline, weekly output, and content pipeline status — all from live database queries on every page load.

---

### Video preview
https://github.com/user-attachments/assets/4879db5b-f45d-47cf-83da-db4bb8975b59

---


## Features

### Command Dashboard
A live operations overview rendered server-side on every visit. Shows today's active mission, mission counts across PLANNED / DOING / DONE, a deadline radar with countdown, weekly completed mission count, post lab pipeline stats, and a quick-jump to the most recently edited canvas.

### Mission Board
A three-column kanban (PLANNED → DOING → DONE) with optimistic updates. Missions carry a title, description, priority (LOW / MEDIUM / HIGH / CRITICAL), due date, category, and optional links to a deadline and canvas. The board supports inline search and a slide-in drawer for creating or editing missions. Deletes and status changes reflect instantly in the UI and roll back on failure.

### Deadline Radar
A focused view of upcoming deadlines sorted by priority then due date. Each deadline has a title, due date, category, priority, optional link, and a status (ACTIVE / COMPLETED / MISSED). Deadlines can be linked to multiple missions and canvases, making them the connective tissue of a sprint.

### Post Lab
A content pipeline board for moving ideas from raw thought to published post. Each post idea moves through: IDEA → DRAFTING → READY → POSTED. Fields include title, hook, draft body, final content, posted URL, category, and an optional canvas link for visual planning.

### Canvas
A full freehand drawing and shape editor built on Konva. Each canvas is a named, persistent workspace backed by JSON in the database.

**Tools:** Select, Pan, Pen (freehand with `perfect-freehand` smoothing), Rectangle, Ellipse, Arrow, Text, Eraser

**Shapes support:** stroke color, fill color, fill patterns (none / solid / hachure / cross-hatch / dots), stroke width, rotation, grouping, z-ordering

**Canvas features:** infinite pan, zoom (0.2×–4×), 100-step undo/redo history, auto-save on idle, keyboard shortcuts for every tool (`V` `H` `P` `R` `O` `A` `T` `E`), right-click context menu, an inspector panel for precise property editing, and a link-mission modal to attach missions directly to a canvas.

### Weekly Review
A structured weekly reflection form. Each review covers a date range and four fields: what went right, what went wrong, next plan, and a final note. Reviews are ordered by week start, newest first.

### Showcase
An ISR-rendered public stats page showing total and completed counts across missions, deadlines, posts, and canvases. Revalidates every 60 seconds.


---

## Stack

- **Next.js 16** — App Router, Server Actions, Route Handlers
- **Prisma 6** — ORM with PostgreSQL
- **Neon** — serverless Postgres (production)
- **Zod 4** — validation (schemas shared between API routes and Server Actions)
- **Konva / react-konva** — canvas rendering and interaction
- **Tailwind CSS 4** — utility-first styling
- **perfect-freehand** — pressure-aware pen stroke smoothing

---

## Project Structure

```
src/
├── app/
│   ├── api/               # REST route handlers (10 endpoints)
│   │   ├── missions/
│   │   ├── deadlines/
│   │   ├── posts/
│   │   ├── canvases/
│   │   └── weekly-reviews/
│   ├── board/             # Mission kanban (SSR)
│   ├── canvas/            # Canvas list + editor (SSR)
│   ├── dashboard/         # Command dashboard (SSR)
│   ├── post-lab/          # Content pipeline (SSR)
│   ├── weekly-review/     # Weekly reflection (SSR)
│   └── showcase/          # Public stats (ISR, 60s)
├── actions/               # Server Actions (form mutations)
├── components/
│   ├── board/             # Kanban board, mission cards, drawer
│   ├── canvas/            # Konva editor, toolbar, inspector, store
│   ├── dashboard/         # Sidebar, command bar
│   ├── landing/           # Hero, bento, header, footer
│   ├── post-lab/          # Post cards, drawer, pipeline client
│   └── weekly-review/     # Review form client
├── db/
│   └── queries/           # Prisma query functions (data access layer)
└── lib/
    ├── api-response.ts    # Typed JSON response helpers
    ├── client-api.ts      # Fetch wrapper for client components
    ├── validators.ts      # Zod schemas for all models
    └── prisma.ts          # Singleton Prisma client
```

---

## Data Model

```
Mission       — title, status, priority, dueDate, category → Deadline, Canvas
Deadline      — title, dueDate, priority, status, category, link → [Mission], [Canvas]
PostIdea      — title, hook, draft, finalContent, status, postedUrl → Canvas
Canvas        — title, description, data (JSON), thumbnail → Deadline, [Mission], [PostIdea]
WeeklyReview  — weekStart, weekEnd, wentRight, wentWrong, nextPlan, finalNote
```

All timestamps are managed by Prisma (`createdAt`, `updatedAt`). IDs are cuid strings.

---

## API Routes

All routes return `{ success, message, data }`. Validation errors return `{ error: { code: "VALIDATION_ERROR", fields: { ... } } }`.

| Method | Route | Description |
|--------|-------|-------------|
| GET / POST | `/api/missions` | List (with filters) or create |
| GET / PATCH / DELETE | `/api/missions/[id]` | Get, update, or delete |
| GET / POST | `/api/deadlines` | List (with filters) or create |
| GET / PATCH / DELETE | `/api/deadlines/[id]` | Get, update, or delete |
| GET / POST | `/api/posts` | List (with filters) or create |
| GET / PATCH / DELETE | `/api/posts/[id]` | Get, update, or delete |
| GET / POST | `/api/canvases` | List or create |
| GET / PATCH / DELETE | `/api/canvases/[id]` | Get, update, or delete |
| GET / POST | `/api/weekly-reviews` | List or create |
| GET / PATCH / DELETE | `/api/weekly-reviews/[id]` | Get, update, or delete |

Query parameters for filtering: `status`, `priority`, `category`, `deadlineId`, `canvasId`.

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

> **Note:** Start the dev server with `DATABASE_URL` in scope. If the variable isn't picked up automatically, prefix the command: `DATABASE_URL="..." npm run dev`, or add it to `.env.local`.

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

## Rendering Strategies

| Route | Strategy | Reason |
|-------|----------|--------|
| `/` | SSG | Static landing page |
| `/dashboard` | SSR | Live stats on every visit |
| `/board` | SSR | Real-time mission state |
| `/post-lab` | SSR | Current pipeline state |
| `/canvas` | SSR | Latest canvases list |
| `/weekly-review` | SSR | Current week's reviews |
| `/showcase` | ISR (60s) | Public stats, tolerable staleness |
