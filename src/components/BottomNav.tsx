import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/routines', label: 'Routines', emoji: '🧘' },
  { to: '/stats', label: 'Stats', emoji: '📊' },
  { to: '/achievements', label: 'Awards', emoji: '🏅' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-card/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${
                isActive ? 'text-brand' : 'text-ink-dim hover:text-ink'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.emoji}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
