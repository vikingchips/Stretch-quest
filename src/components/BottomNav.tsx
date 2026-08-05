import { NavLink } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { Icon, type IconName } from './Icon';

type Tab = { to: string; label: string; icon: IconName };

const TABS: Tab[] = [
  { to: '/', label: 'home', icon: 'home' },
  { to: '/routines', label: 'routines', icon: 'routines' },
  { to: '/stats', label: 'stats', icon: 'stats' },
  { to: '/friends', label: 'friends', icon: 'friends' },
  { to: '/achievements', label: 'awards', icon: 'awards' },
];

const GRIP_TAB: Tab = { to: '/finger', label: 'grip', icon: 'grip' };

export function BottomNav() {
  const fingerEnabled = useSettingsStore((s) => s.fingerModuleEnabled);
  // Six tabs on a phone are cramped. Awards steps aside for the grip tab —
  // it is still reachable from home and stats.
  const tabs = fingerEnabled
    ? [...TABS.filter((t) => t.to !== '/achievements'), GRIP_TAB]
    : TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => (
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
