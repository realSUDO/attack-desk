import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const day = 24 * 60 * 60 * 1000;

function fromNow(days, hour = 17) {
  const date = new Date(Date.now() + days * day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

const scenes = {
  architecture: {
    camera: { x: 0, y: 0, zoom: 1 },
    shapes: [
      {
        id: "seed-title",
        type: "text",
        text: "ATTACKDESK DELIVERY",
        x: 120,
        y: 80,
        z: 1,
        rotation: 0,
        groupId: null,
        stroke: "#1e1b15",
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: 2,
        fontSize: 32,
        width: 420,
        align: "left",
      },
      {
        id: "seed-api",
        type: "rect",
        x: 120,
        y: 180,
        z: 2,
        rotation: 0,
        groupId: null,
        stroke: "#1e1b15",
        fill: "#c9f308",
        fillPattern: "hachure",
        strokeWidth: 3,
        width: 220,
        height: 120,
      },
      {
        id: "seed-db",
        type: "ellipse",
        x: 520,
        y: 180,
        z: 3,
        rotation: 0,
        groupId: null,
        stroke: "#1e1b15",
        fill: "#fbf3e7",
        fillPattern: "dots",
        strokeWidth: 3,
        width: 220,
        height: 120,
      },
      {
        id: "seed-arrow",
        type: "arrow",
        x: 0,
        y: 0,
        z: 4,
        rotation: 0,
        groupId: null,
        stroke: "#536600",
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: 5,
        points: [[340, 240], [520, 240]],
      },
    ],
  },
  content: {
    camera: { x: 0, y: 0, zoom: 1 },
    shapes: [
      {
        id: "seed-content-title",
        type: "text",
        text: "CONTENT SYSTEM",
        x: 140,
        y: 100,
        z: 1,
        rotation: 0,
        groupId: null,
        stroke: "#1e1b15",
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: 2,
        fontSize: 34,
        width: 440,
        align: "center",
      },
    ],
  },
};

async function main() {
  const deadlines = [
    ["seed-deadline-launch", "Ship AttackDesk beta", 3, "CRITICAL", "Product"],
    ["seed-deadline-review", "Full-stack assignment review", 8, "HIGH", "School"],
    ["seed-deadline-content", "Publish launch article", 12, "MEDIUM", "Content"],
    ["seed-deadline-retro", "Monthly execution retro", 25, "LOW", "Planning"],
  ];

  for (const [id, title, days, priority, category] of deadlines) {
    await prisma.deadline.upsert({
      where: { id },
      update: { title, dueDate: fromNow(days), priority, category, status: "ACTIVE" },
      create: {
        id,
        title,
        description: `Seeded deadline for ${title.toLowerCase()}.`,
        dueDate: fromNow(days),
        priority,
        category,
      },
    });
  }

  const canvases = [
    {
      id: "seed-canvas-architecture",
      title: "AttackDesk Architecture",
      description: "API, database, and frontend delivery map.",
      data: scenes.architecture,
      deadlineId: "seed-deadline-launch",
    },
    {
      id: "seed-canvas-content",
      title: "Content Launch System",
      description: "Hooks, drafts, and launch distribution plan.",
      data: scenes.content,
      deadlineId: "seed-deadline-content",
    },
    {
      id: "seed-canvas-research",
      title: "User Feedback Synthesis",
      description: "Themes collected from early product feedback.",
      data: { camera: { x: 0, y: 0, zoom: 1 }, shapes: [] },
      deadlineId: null,
    },
  ];

  for (const canvas of canvases) {
    await prisma.canvas.upsert({
      where: { id: canvas.id },
      update: canvas,
      create: canvas,
    });
  }

  const missions = [
    ["seed-mission-api", "Finish production CRUD routes", "DOING", "CRITICAL", 1, "Backend", "seed-deadline-launch", "seed-canvas-architecture"],
    ["seed-mission-board", "Connect mission board interactions", "DOING", "HIGH", 2, "Frontend", "seed-deadline-launch", "seed-canvas-architecture"],
    ["seed-mission-seed", "Create realistic database seed", "DONE", "MEDIUM", -1, "Backend", "seed-deadline-review", null],
    ["seed-mission-canvas", "Polish canvas editing gestures", "PLANNED", "HIGH", 4, "Canvas", "seed-deadline-launch", "seed-canvas-architecture"],
    ["seed-mission-review", "Prepare assignment walkthrough", "PLANNED", "HIGH", 7, "School", "seed-deadline-review", null],
    ["seed-mission-copy", "Draft launch announcement", "PLANNED", "MEDIUM", 10, "Content", "seed-deadline-content", "seed-canvas-content"],
    ["seed-mission-research", "Summarize user feedback", "DONE", "LOW", -3, "Research", null, "seed-canvas-research"],
    ["seed-mission-deploy", "Configure Neon and Vercel", "PLANNED", "CRITICAL", 2, "DevOps", "seed-deadline-launch", null],
  ];

  for (let order = 0; order < missions.length; order += 1) {
    const [id, title, status, priority, days, category, deadlineId, canvasId] =
      missions[order];
    const data = {
      title,
      description: `Production task: ${title.toLowerCase()}.`,
      status,
      priority,
      dueDate: fromNow(days),
      category,
      deadlineId,
      canvasId,
      order,
    };
    await prisma.mission.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  const posts = [
    ["seed-post-actions", "Server Actions finally clicked", "Server Actions are best treated as app-local mutation boundaries.", "IDEA", "Next.js", null],
    ["seed-post-grid", "Why visible grids improve thinking", "A canvas grid is not decoration. It is spatial feedback.", "IDEA", "Design", "seed-canvas-architecture"],
    ["seed-post-editor", "Building a fast canvas text editor", "The textarea and rendered text must share one coordinate system.", "DRAFTING", "Tech", "seed-canvas-architecture"],
    ["seed-post-local-first", "Local-first UI without lying to users", "Optimistic updates need rollback and visible errors.", "DRAFTING", "Strategy", null],
    ["seed-post-launch", "AttackDesk: from ideas to execution", "One workspace for missions, drafts, deadlines, and visual planning.", "READY", "Productivity", "seed-canvas-content"],
    ["seed-post-prisma", "Prisma patterns for small full-stack apps", "Keep validation, queries, and transport contracts separate.", "READY", "Next.js", null],
    ["seed-post-shipping", "Shipping the first usable version", "Scope is a product decision, not an excuse for broken controls.", "POSTED", "Strategy", null],
    ["seed-post-canvas", "What makes a canvas interaction feel right", "Realtime transforms and stable text positioning are table stakes.", "POSTED", "Design", "seed-canvas-architecture"],
  ];

  for (let order = 0; order < posts.length; order += 1) {
    const [id, title, hook, status, category, canvasId] = posts[order];
    const data = {
      title,
      hook,
      draft:
        status === "IDEA"
          ? null
          : `${hook}\n\nThis seeded draft exists to exercise the real editor, status workflow, search, and persistence.`,
      finalContent: status === "POSTED" ? `${hook} The shipped version is stored here.` : null,
      status,
      category,
      canvasId,
      postedUrl: status === "POSTED" ? `https://example.com/posts/${id}` : null,
      order,
    };
    await prisma.postIdea.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday.getTime() + 6 * day);
  sunday.setHours(23, 59, 59, 999);

  await prisma.weeklyReview.upsert({
    where: { id: "seed-review-current" },
    update: {
      weekStart: monday,
      weekEnd: sunday,
      wentRight: "Canvas editing and API contracts became stable.",
      wentWrong: "Too many controls initially existed without real actions.",
      nextPlan: "Finish deployment configuration and assignment walkthrough.",
      finalNote: "Prefer real empty states over hidden sample fallbacks.",
    },
    create: {
      id: "seed-review-current",
      weekStart: monday,
      weekEnd: sunday,
      wentRight: "Canvas editing and API contracts became stable.",
      wentWrong: "Too many controls initially existed without real actions.",
      nextPlan: "Finish deployment configuration and assignment walkthrough.",
      finalNote: "Prefer real empty states over hidden sample fallbacks.",
    },
  });

  console.log("Seeded AttackDesk with linked production-style demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
