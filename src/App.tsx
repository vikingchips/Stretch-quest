import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { useProgressStore } from './store/progressStore';
import { useSettingsStore } from './store/settingsStore';
import { Onboarding } from './components/Onboarding';
import { HomePage } from './routes/HomePage';
import { LibraryPage } from './routes/LibraryPage';
import { RoutineDetailPage } from './routes/RoutineDetailPage';
import { SessionPage } from './routes/SessionPage';
import { CompletePage } from './routes/CompletePage';
import { BuilderPage } from './routes/BuilderPage';
import { StatsPage } from './routes/StatsPage';
import { AchievementsPage } from './routes/AchievementsPage';
import { SettingsPage } from './routes/SettingsPage';
import { FriendsPage } from './routes/FriendsPage';
import { AddFriendPage } from './routes/AddFriendPage';

export default function App() {
  const location = useLocation();
  const reconcile = useProgressStore((s) => s.reconcile);
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);
  const dismissOnboarding = useSettingsStore((s) => s.dismissOnboarding);

  useEffect(() => {
    reconcile();
  }, [reconcile]);

  const immersive =
    location.pathname.startsWith('/session/') || location.pathname === '/complete';

  return (
    <div className="mx-auto min-h-dvh max-w-md safe-top">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/routines" element={<LibraryPage />} />
        <Route path="/routines/:id" element={<RoutineDetailPage />} />
        <Route path="/session/:routineId" element={<SessionPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/builder/:id" element={<BuilderPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/add/:slug" element={<AddFriendPage />} />
      </Routes>
      {!immersive && <BottomNav />}
      {!onboardingSeen && <Onboarding onDone={dismissOnboarding} />}
    </div>
  );
}
