import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setAuthError(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError('Google sign-in was not completed. Please try again.');
      // eslint-disable-next-line no-console
      console.error('Google sign-in error', error);
    } finally {
      setIsSigningIn(false);
      setAuthReady(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInWithGoogle();
        return;
      }

      try {
        await runLocalStorageMigration();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Local migration failed', error);
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

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

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-800">Sign in required</h1>
          <p className="mt-2 text-slate-600">
            Continue with Google to access transport management data.
          </p>
          {authError && (
            <p className="mt-3 text-sm text-rose-600">{authError}</p>
          )}
          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            onClick={signInWithGoogle}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
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
