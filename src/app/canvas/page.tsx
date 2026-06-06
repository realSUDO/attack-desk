import { getCanvases } from "@/db/queries/canvases";

export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  let canvases: Awaited<ReturnType<typeof getCanvases>> = [];
  let databaseAvailable = true;

  try {
    canvases = await getCanvases();
  } catch {
    databaseAvailable = false;
  }

  return (
    <main>
      <h1>Canvases</h1>
      {!databaseAvailable && <p>Database is currently unavailable.</p>}
      <ul>
        {canvases.map((canvas) => (
          <li key={canvas.id}>
            {canvas.title} ({canvas._count.missions} missions,{" "}
            {canvas._count.postIdeas} post ideas)
          </li>
        ))}
      </ul>
    </main>
  );
}
