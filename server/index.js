require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { seedDemoHistory } = require('./db/seedDemoHistory');
const { startSimulationLoop } = require('./services/simulation');
const { startPlantSimulationLoop } = require('./services/plantSimulation');
const { startControlCentreSimulationLoop } = require('./services/controlCentreSimulation');
const { startStockSimulationLoop } = require('./services/stockSimulation');
const { startPredictiveMaintenanceSimulationLoop } = require('./services/predictiveMaintenanceSimulation');
const { startEnergyOptimizationSimulationLoop } = require('./services/energyOptimizationSimulation');
const { startQualityPredictionSimulationLoop } = require('./services/qualityPredictionSimulation');
const { startWorkerSafetySimulationLoop } = require('./services/workerSafetySimulation');
const { startEmissionsSimulationLoop } = require('./services/emissionsSimulation');
const { ensureBagFilterRepairHistory } = require('./services/bagfilterMaintenance');
const { ensurePredictiveMaintenanceRepairHistory } = require('./services/predictiveMaintenanceHistory');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const bagfilterRoutes = require('./routes/bagfilter');
const controlCentreRoutes = require('./routes/controlCentre');
const stockManagementRoutes = require('./routes/stockManagement');
const predictiveMaintenanceRoutes = require('./routes/predictiveMaintenance');
const energyOptimizationRoutes = require('./routes/energyOptimization');
const qualityPredictionRoutes = require('./routes/qualityPrediction');
const workerSafetyRoutes = require('./routes/workerSafety');
const emissionsTrackingRoutes = require('./routes/emissionsTracking');
const governanceRoutes = require('./routes/governance');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/bagfilter', requireAuth, bagfilterRoutes);
app.use('/api/control-centre', requireAuth, controlCentreRoutes);
app.use('/api/stock-management', requireAuth, stockManagementRoutes);
app.use('/api/predictive-maintenance', requireAuth, predictiveMaintenanceRoutes);
app.use('/api/energy-optimization', requireAuth, energyOptimizationRoutes);
app.use('/api/quality-prediction', requireAuth, qualityPredictionRoutes);
app.use('/api/worker-safety', requireAuth, workerSafetyRoutes);
app.use('/api/emissions-tracking', requireAuth, emissionsTrackingRoutes);
app.use('/api/governance', requireAuth, governanceRoutes);

const CLIENT_BUILD_DIR = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(CLIENT_BUILD_DIR)) {
  app.use(express.static(CLIENT_BUILD_DIR));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_BUILD_DIR, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  await seedDemoHistory();
  await ensureBagFilterRepairHistory();
  await ensurePredictiveMaintenanceRepairHistory();
  startSimulationLoop();
  startPlantSimulationLoop();
  startControlCentreSimulationLoop();
  startStockSimulationLoop();
  startPredictiveMaintenanceSimulationLoop();
  startEnergyOptimizationSimulationLoop();
  startQualityPredictionSimulationLoop();
  startWorkerSafetySimulationLoop();
  startEmissionsSimulationLoop();

  app.listen(PORT, () => {
    console.log(`CemPulse API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start CemPulse server', err);
  process.exit(1);
});
