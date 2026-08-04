import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const TABS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'home', icon: 'home' },
  { to: '/routines', label: 'routines', icon: 'routines' },
  { to: '/stats', label: 'stats', icon: 'stats' },
  { to: '/achievements', label: 'awards', icon: 'awards' },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1.5 py-3 text-[11px] lowercase tracking-wide ${
                isActive ? 'text-pine-deep' : 'text-ink-soft hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={tab.icon} size={21} strokeWidth={isActive ? 1.5 : 1.15} />
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
