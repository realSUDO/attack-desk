import { getDashboardStats } from "@/db/queries/stats";

export const dynamic = "force-dynamic";

const emptyStats = {
  totalMissions: 0,
  doingMissions: 0,
  criticalActiveDeadlines: 0,
  readyPosts: 0,
  totalCanvases: 0,
};

export default async function DashboardPage() {
  let stats = emptyStats;
  let databaseAvailable = true;

  try {
    stats = await getDashboardStats();
  } catch {
    databaseAvailable = false;
  }

  return (
    <main>
      <h1>Dashboard</h1>
      {!databaseAvailable && <p>Database is currently unavailable.</p>}
      <dl>
        <dt>Total missions</dt>
        <dd>{stats.totalMissions}</dd>
        <dt>Doing missions</dt>
        <dd>{stats.doingMissions}</dd>
        <dt>Critical active deadlines</dt>
        <dd>{stats.criticalActiveDeadlines}</dd>
        <dt>Ready posts</dt>
        <dd>{stats.readyPosts}</dd>
        <dt>Total canvases</dt>
        <dd>{stats.totalCanvases}</dd>
      </dl>
    </main>
  );
}
