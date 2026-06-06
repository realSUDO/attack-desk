import { getShowcaseStats } from "@/db/queries/stats";

export const revalidate = 60;

const emptyStats = {
  totalMissions: 0,
  completedMissions: 0,
  totalDeadlines: 0,
  completedDeadlines: 0,
  totalPostIdeas: 0,
  postedPostIdeas: 0,
  totalCanvases: 0,
};

export default async function ShowcasePage() {
  let stats = emptyStats;
  let databaseAvailable = true;

  try {
    stats = await getShowcaseStats();
  } catch {
    databaseAvailable = false;
  }

  return (
    <main>
      <h1>AttackDesk Showcase</h1>
      <p>This page revalidates every 60 seconds.</p>
      {!databaseAvailable && <p>Database is currently unavailable.</p>}
      <dl>
        <dt>Total missions</dt>
        <dd>{stats.totalMissions}</dd>
        <dt>Completed missions</dt>
        <dd>{stats.completedMissions}</dd>
        <dt>Total deadlines</dt>
        <dd>{stats.totalDeadlines}</dd>
        <dt>Completed deadlines</dt>
        <dd>{stats.completedDeadlines}</dd>
        <dt>Total post ideas</dt>
        <dd>{stats.totalPostIdeas}</dd>
        <dt>Posted post ideas</dt>
        <dd>{stats.postedPostIdeas}</dd>
        <dt>Total canvases</dt>
        <dd>{stats.totalCanvases}</dd>
      </dl>
    </main>
  );
}
