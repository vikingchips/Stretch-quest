import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { useProgressStore } from './store/progressStore';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore } from './sync/authStore';
import { syncConfigured } from './sync/client';
import { Onboarding } from './components/Onboarding';
import { AuthScreen } from './components/AuthScreen';
import { HomePage } from './routes/HomePage';
import { LibraryPage } from './routes/LibraryPage';
import { RoutineDetailPage } from './routes/RoutineDetailPage';
import { SessionPage } from './routes/SessionPage';
import { CompletePage } from './routes/CompletePage';
import { BuilderPage } from './routes/BuilderPage';
import { StatsPage } from './routes/StatsPage';
import { HistoryPage } from './routes/HistoryPage';
import { AchievementsPage } from './routes/AchievementsPage';
import { SettingsPage } from './routes/SettingsPage';
import { FriendsPage } from './routes/FriendsPage';
import { AddFriendPage } from './routes/AddFriendPage';
import { FingerHomePage } from './routes/finger/FingerHomePage';
import { HangSessionPage } from './routes/finger/HangSessionPage';
import { MaxTestPage } from './routes/finger/MaxTestPage';
import { FingerHistoryPage } from './routes/finger/FingerHistoryPage';
import { DevicePage } from './routes/finger/DevicePage';
import { GamesPage } from './routes/finger/games/GamesPage';
import { GamePlayPage } from './routes/finger/games/GamePlayPage';

export default function App() {
  const location = useLocation();
  const reconcile = useProgressStore((s) => s.reconcile);
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);
  const dismissOnboarding = useSettingsStore((s) => s.dismissOnboarding);
  const authStatus = useAuthStore((s) => s.status);
  const fingerEnabled = useSettingsStore((s) => s.fingerModuleEnabled);

  useEffect(() => {
    reconcile();
  }, [reconcile]);

  // The tour comes first: it explains what the account is for.
  if (!onboardingSeen) return <Onboarding onDone={dismissOnboarding} />;

  if (syncConfigured) {
    // Restoring a stored session takes a moment. Showing the sign-in form in
    // the meantime would flash it at people who are already signed in.
    if (authStatus === 'loading') {
      return <div className="min-h-dvh bg-paper" />;
    }
    // A build without credentials has nothing to sign in to, so it stays
    // local-only rather than becoming unusable.
    if (authStatus !== 'signed-in') return <AuthScreen />;
  }

  const immersive =
    location.pathname.startsWith('/session/') ||
    location.pathname.startsWith('/finger/session/') ||
    // The games list keeps the nav; a game in play is as immersive as a
    // session — note the trailing slash doing that work.
    location.pathname.startsWith('/finger/games/') ||
    location.pathname === '/complete';

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
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/add/:slug" element={<AddFriendPage />} />
        {/* The module is opt-in, so its routes only exist once it is on.
            Turning it off takes the pages with it rather than leaving them
            reachable by URL. */}
        {fingerEnabled ? (
          <>
            <Route path="/finger" element={<FingerHomePage />} />
            <Route path="/finger/session/:programId" element={<HangSessionPage />} />
            <Route path="/finger/test" element={<MaxTestPage />} />
            <Route path="/finger/history" element={<FingerHistoryPage />} />
            <Route path="/finger/device" element={<DevicePage />} />
            <Route path="/finger/games" element={<GamesPage />} />
            <Route path="/finger/games/:gameId" element={<GamePlayPage />} />
          </>
        ) : (
          <Route path="/finger/*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
      {!immersive && <BottomNav />}
    </div>
  );
}
