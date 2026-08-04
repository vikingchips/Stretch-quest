import { useProgressStore } from '../store/progressStore';
import { ACHIEVEMENTS } from '../data/achievements';
import { BadgeCard } from '../components/BadgeCard';

export function AchievementsPage() {
  const unlockedBadges = useProgressStore((s) => s.progress.unlockedBadges);
  const unlockedCount = Object.keys(unlockedBadges).length;

  return (
    <main className="px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold">Achievements</h1>
      <p className="mb-4 text-sm font-semibold text-ink-dim">
        {unlockedCount} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => (
          <BadgeCard key={a.id} achievement={a} unlockedAt={unlockedBadges[a.id]} />
        ))}
      </div>
    </main>
  );
}
