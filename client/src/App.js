import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './services/socket';
import { AuthProvider, useAuth } from './services/auth';
import { Chart as ChartJS } from 'chart.js';
import Dashboard from './pages/Dashboard';
import BagFilterMonitoring from './pages/BagFilterMonitoring';
import SmartControlCentre from './pages/SmartControlCentre';
import StockManagement from './pages/StockManagement';
import PredictiveMaintenance from './pages/PredictiveMaintenance';
import EnergyOptimization from './pages/EnergyOptimization';
import QualityPrediction from './pages/QualityPrediction';
import WorkerSafety from './pages/WorkerSafety';
import EmissionsTracking from './pages/EmissionsTracking';
import ModulePlaceholder from './pages/ModulePlaceholder';
import Compliance from './pages/Compliance';
import Login from './pages/Login';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';

ChartJS.defaults.interaction.mode = 'index';
ChartJS.defaults.interaction.intersect = false;
ChartJS.defaults.plugins.tooltip.enabled = true;

function AuthedApp({ theme, onThemeToggle }) {
  const { user, logout } = useAuth();
  return (
    <SocketProvider>
      <Layout user={user} onLogout={logout} theme={theme} onThemeToggle={onThemeToggle}>
        <Routes>
          <Route path="/"                                        element={<Dashboard />} />
          <Route path="/modules/bag-filter-dust-monitoring"       element={<BagFilterMonitoring />} />
          <Route path="/modules/smart-control-centre"             element={<SmartControlCentre />} />
          <Route path="/modules/3d-stock-management"              element={<StockManagement />} />
          <Route path="/modules/predictive-maintenance"           element={<PredictiveMaintenance />} />
          <Route path="/modules/kiln-energy-optimization"         element={<EnergyOptimization />} />
          <Route path="/modules/quality-prediction-lab-automation" element={<QualityPrediction />} />
          <Route path="/modules/worker-safety-computer-vision"    element={<WorkerSafety />} />
          <Route path="/modules/emissions-carbon-tracking"        element={<EmissionsTracking />} />
          <Route path="/modules/:slug"                            element={<ModulePlaceholder />} />
          <Route path="/compliance"                               element={<Compliance />} />
          <Route path="*"                                         element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </SocketProvider>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleThemeToggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AuthedApp theme={theme} onThemeToggle={handleThemeToggle} />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
