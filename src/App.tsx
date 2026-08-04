import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { useProgressStore } from './store/progressStore';
import { HomePage } from './routes/HomePage';
import { LibraryPage } from './routes/LibraryPage';
import { RoutineDetailPage } from './routes/RoutineDetailPage';
import { SessionPage } from './routes/SessionPage';
import { CompletePage } from './routes/CompletePage';
import { BuilderPage } from './routes/BuilderPage';
import { StatsPage } from './routes/StatsPage';
import { AchievementsPage } from './routes/AchievementsPage';
import { SettingsPage } from './routes/SettingsPage';

export default function App() {
  const location = useLocation();
  const reconcile = useProgressStore((s) => s.reconcile);

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
      </Routes>
      {!immersive && <BottomNav />}
    </div>
  );
}
