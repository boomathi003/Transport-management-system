
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudentView from './components/StudentView';
import AttendanceView from './components/AttendanceView';
import FeesView from './components/FeesView';
import VehicleView from './components/VehicleView';
import DailyLogView from './components/DailyLogView';
import DestinationView from './components/DestinationView';
import { ViewType } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);

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

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
