import { Link, useNavigate } from 'react-router-dom';
import { GAMES } from '../../../finger/games';
import { GAME_LIST, bestKey } from '../../../finger/games/types';
import { useFingerStore } from '../../../store/fingerStore';
import { Icon } from '../../../components/Icon';

export function GamesPage() {
  const navigate = useNavigate();
  const bests = useFingerStore((s) => s.gameBests);

  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={() => navigate('/finger')}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-2 text-2xl lowercase tracking-wide">games</h1>
      <p className="measure mb-10 text-sm leading-relaxed text-ink-soft">
        Training in a costume. None of them reward yanking — that is deliberate.
      </p>

      <div className="border-t border-line-soft">
        {GAME_LIST.map((game) => {
          const spec = GAMES[game.id];
          const format = spec?.formatScore ?? String;
          const left = bests[bestKey(game.id, 'left')];
          const right = bests[bestKey(game.id, 'right')];
          const bestLine = [
            left && `${format(left.score)} left`,
            right && `${format(right.score)} right`,
          ]
            .filter(Boolean)
            .join(' · ');
          if (!spec) {
            return (
              <div
                key={game.id}
                className="flex items-center gap-4 border-b border-line-soft py-4 opacity-40"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-base lowercase">{game.name}</h2>
                  <p className="mt-0.5 text-xs lowercase text-ink-soft">coming soon</p>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={game.id}
              to={`/finger/games/${game.id}`}
              className="group flex items-center gap-4 border-b border-line-soft py-4 hover:bg-surface"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-base lowercase">{game.name}</h2>
                <p className="mt-0.5 text-xs lowercase text-ink-soft">{game.tagline}</p>
                {bestLine && (
                  <p className="mt-0.5 text-xs lowercase tabular-nums text-pine-deep">
                    best {bestLine}
                  </p>
                )}
              </div>
              <span className="text-line">
                <Icon name="chevronRight" size={18} />
              </span>
            </Link>
          );
        })}
      </div>

      <p className="measure mt-6 text-xs leading-relaxed text-ink-soft">
        Every visit starts with one hard pull — that pull becomes 100% and everything in the game
        scales from it, so a score is always against the hand you brought today. The games never
        touch your training max, and they never tick the daily plan: play earns a little xp, the
        plan stays training.
      </p>
    </main>
  );
}
