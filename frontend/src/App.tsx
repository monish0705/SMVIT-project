import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveIncidentMap } from './pages/LiveIncidentMap';
import { IncidentQueue } from './pages/IncidentQueue';
import { IncidentDetails } from './pages/IncidentDetails';
import { ReportSubmission } from './pages/ReportSubmission';
import { ReviewCentre } from './pages/ReviewCentre';
import { WorkOrders } from './pages/WorkOrders';
import { OperationsCopilot } from './pages/OperationsCopilot';
import { SettingsPage } from './pages/SettingsPage';
import { CitizenPortal } from './pages/CitizenPortal';
import { InspectorHub } from './pages/InspectorHub';
import { AdminUserManagement } from './pages/AdminUserManagement';

// Dynamic Home View based on Active Role
const HomeViewDispatcher: React.FC = () => {
  const { role } = useAuth();
  if (role === 'citizen') return <CitizenPortal />;
  if (role === 'field_inspector') return <InspectorHub />;
  if (role === 'operator') return <ReviewCentre />;
  return <OverviewDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomeViewDispatcher />} />
            <Route path="/map" element={<LiveIncidentMap />} />
            <Route path="/queue" element={<IncidentQueue />} />
            <Route path="/incidents/:id" element={<IncidentDetails />} />
            <Route path="/report" element={<ReportSubmission />} />
            <Route path="/reviews" element={<ReviewCentre />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/copilot" element={<OperationsCopilot />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users" element={<AdminUserManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
