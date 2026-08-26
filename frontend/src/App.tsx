import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n';
import MainLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import AlgorithmList from './pages/Algorithms/AlgorithmList';
import AlgorithmDetail from './pages/Algorithms/AlgorithmDetail';
import CoverageMap from './pages/Algorithms/CoverageMap';
import WorkflowList from './pages/Workflows/WorkflowList';
import WorkflowDetail from './pages/Workflows/WorkflowDetail';
import MonitoringDashboard from './pages/Monitoring/MonitoringDashboard';
import DriftReport from './pages/Monitoring/DriftReport';
import BacktestingPage from './pages/Backtesting/BacktestingPage';
import GrafanaPage from './pages/Embedded/GrafanaPage';
import MlflowPage from './pages/Embedded/MlflowPage';
import MlflowModelsPage from './pages/Embedded/MlflowModelsPage';
import PipelineEditor from './pages/Pipelines/PipelineEditor';
import SettingsPage from './pages/Settings/SettingsPage';
import AutoMlPage from './pages/AutoML/AutoMlPage';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/algorithms" element={<AlgorithmList />} />
          <Route path="/algorithms/coverage" element={<CoverageMap />} />
          <Route path="/algorithms/:id" element={<AlgorithmDetail />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/pipelines/editor" element={<PipelineEditor />} />
          <Route path="/monitoring" element={<MonitoringDashboard />} />
          <Route path="/monitoring/drift" element={<DriftReport />} />
          <Route path="/monitoring/grafana" element={<GrafanaPage />} />
          <Route path="/experiments" element={<MlflowPage />} />
          <Route path="/models" element={<MlflowModelsPage />} />
          <Route path="/backtesting" element={<BacktestingPage />} />
          <Route path="/automl" element={<AutoMlPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
