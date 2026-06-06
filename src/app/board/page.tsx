import { getDeadlines } from "@/db/queries/deadlines";
import { getMissions } from "@/db/queries/missions";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  let missions: Awaited<ReturnType<typeof getMissions>> = [];
  let deadlines: Awaited<ReturnType<typeof getDeadlines>> = [];
  let databaseAvailable = true;

  try {
    [missions, deadlines] = await Promise.all([
      getMissions(),
      getDeadlines({ status: "ACTIVE" }),
    ]);
  } catch {
    databaseAvailable = false;
  }

  return (
    <main>
      <h1>Mission Board</h1>
      {!databaseAvailable && <p>Database is currently unavailable.</p>}
      {(["PLANNED", "DOING", "DONE"] as const).map((status) => (
        <section key={status}>
          <h2>{status}</h2>
          <ul>
            {missions
              .filter((mission) => mission.status === status)
              .map((mission) => (
                <li key={mission.id}>{mission.title}</li>
              ))}
          </ul>
        </section>
      ))}
      <section>
        <h2>Active deadlines</h2>
        <ul>
          {deadlines.map((deadline) => (
            <li key={deadline.id}>
              {deadline.title} - {deadline.dueDate.toISOString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
