import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { initAuth } from './sync/authStore';
import { initCloudSync } from './sync/cloudSync';

// Sync is a no-op when the build has no Supabase credentials.
initAuth();
initCloudSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
