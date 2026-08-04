import { useProgressStore } from '../store/progressStore';
import { ACHIEVEMENTS } from '../data/achievements';
import { BadgeCard } from '../components/BadgeCard';

export function AchievementsPage() {
  const unlockedBadges = useProgressStore((s) => s.progress.unlockedBadges);
  const unlockedCount = Object.keys(unlockedBadges).length;

  return (
    <main className="px-6 pb-28 pt-10">
      <h1 className="text-2xl lowercase tracking-wide">awards</h1>
      <p className="mb-10 mt-1 text-sm lowercase text-ink-soft">
        {unlockedCount} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="grid grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((a) => (
          <BadgeCard key={a.id} achievement={a} unlockedAt={unlockedBadges[a.id]} />
        ))}
      </div>
    </main>
  );
}
