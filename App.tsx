import React, { useEffect, useState } from 'react';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInAnonymously, signInWithPopup } from 'firebase/auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentView from './components/StudentView';
import AttendanceView from './components/AttendanceView';
import FeesView from './components/FeesView';
import VehicleView from './components/VehicleView';
import DailyLogView from './components/DailyLogView';
import DestinationView from './components/DestinationView';
import { ViewType } from './types';
import { runLocalStorageMigration } from './services/migration';
import { auth, googleProvider } from './services/firebase';
import { canAccessView } from './services/accessControl';
import { TransportDataService } from './services/dataService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isTryingGoogle, setIsTryingGoogle] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  const formatAuthError = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: string }).code);
      return `${fallback} (${code})`;
    }
    return fallback;
  };

  const signInSilently = async () => {
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInAnonymously(auth);
    } catch (error) {
      setAuthError(formatAuthError(error, 'Failed to initialize anonymous session.'));
      // eslint-disable-next-line no-console
      console.error('Anonymous sign-in error', error);
      setAuthReady(true);
    }
  };

  const signInWithGoogleFallback = async () => {
    setIsTryingGoogle(true);
    setAuthError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(formatAuthError(error, 'Google sign-in failed.'));
      // eslint-disable-next-line no-console
      console.error('Google fallback sign-in error', error);
    } finally {
      setIsTryingGoogle(false);
    }
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setAuthReady(true);
      if (!auth.currentUser) {
        setAuthError('Connection timed out. Please retry.');
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInSilently();
        return;
      }

      try {
        await runLocalStorageMigration();
        await TransportDataService.flushOfflineQueue();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Local migration failed', error);
      }

      setAuthReady(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const flushOnReconnect = async () => {
      await TransportDataService.flushOfflineQueue();
    };
    window.addEventListener('online', flushOnReconnect);
    return () => window.removeEventListener('online', flushOnReconnect);
  }, []);

  useEffect(() => {
    if (!canAccessView(currentView)) {
      setCurrentView(ViewType.DASHBOARD);
    }
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case ViewType.DASHBOARD:
        return <Dashboard setView={setCurrentView} />;
      case ViewType.STUDENTS:
        return <StudentView />;
      case ViewType.DESTINATIONS:
        return <DestinationView />;
      case ViewType.ATTENDANCE:
        return <AttendanceView />;
      case ViewType.FEES:
        return <FeesView />;
      case ViewType.MAINTENANCE:
        return <VehicleView />;
      case ViewType.DAILY_LOG:
        return <DailyLogView />;
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700">
        Connecting to Firebase...
      </div>
    );
  }

  if (!auth.currentUser && !guestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-800">Connecting...</h1>
          <p className="mt-2 text-slate-600">
            Initializing a secure session.
          </p>
          {authError && (
            <p className="mt-3 text-sm text-rose-600">{authError}</p>
          )}
          <button
            type="button"
            onClick={signInSilently}
            className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700"
          >
            Retry Connection
          </button>
          <button
            type="button"
            onClick={signInWithGoogleFallback}
            disabled={isTryingGoogle}
            className="mt-3 w-full rounded-lg bg-slate-800 px-4 py-2 text-white font-semibold hover:bg-black disabled:opacity-60"
          >
            {isTryingGoogle ? 'Opening Google...' : 'Continue with Google'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthError('Running in guest mode for demo submission.');
              setGuestMode(true);
              setAuthReady(true);
            }}
            className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-white font-semibold hover:bg-amber-600"
          >
            Continue in Guest Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
