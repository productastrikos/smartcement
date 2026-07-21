// ── CemPulse content source ─────────────────────────────────────────────
// Central place for the plant/product copy that drives the Overview
// dashboard and the module placeholder pages. Figures are taken directly
// from the "Smart Cement Manufacturing Facility" reference document.

export const PLATFORM = {
  name: 'CemPulse',
  tagline: 'Smart Cement Operations Platform',
  plantName: 'CemPulse Demo Plant',
  plantCapacityMtpa: 2,
};

export const OVERVIEW_STATS = {
  industryAdoptionPct: 30,
  downtimeReductionRange: [40, 60],
  paybackMonthsRange: [12, 18],
  investmentPhase1to2UsdRange: [200000, 500000],
  investmentFullUsdRange: [1000000, 3000000],
  annualSavingsUsdRange: [2000000, 8000000],
};

export const PLANT_ZONES = ['Raw Mill', 'Kiln', 'Clinker Cooler', 'Cement Mill', 'Packing'];

export const MODULES = [
  {
    id: 'bag-filter-dust-monitoring',
    slug: 'bag-filter-dust-monitoring',
    title: 'Bag Filter Dust Monitoring',
    shortTitle: 'Bag Filter Dust',
    status: 'full',
    route: '/modules/bag-filter-dust-monitoring',
    whatItIs: 'Baghouses (bag filters) capture dust before it reaches the stack. A single torn or blinded bag can push emissions above legal limits within hours. Smart monitoring places differential pressure, airflow, acoustic, and emission sensors on each compartment and streams the readings to a live dashboard with AI-based alerts.',
    advantages: [
      'Early failure detection: AI models flag bag blinding 48 to 96 hours in advance, and acoustic sensors detect stuck valves or leaking diaphragms up to 8 weeks before a manual inspection would.',
      'Pinpoint accuracy: compartment-level leak detection sends the maintenance crew to the exact baghouse, cutting repair time.',
      'Compliance protection: continuous emission monitoring with automated alarms creates an audit trail and prevents fines and forced shutdowns.',
      'Documented KPIs: 24% longer filter bag life, 32% lower compressed air consumption, and 28% reduction in particulate emissions.',
    ],
    disadvantages: [
      'Requires ruggedized sensors rated for extreme dust, heat, and vibration, which raises hardware cost.',
      'Alert quality depends on model calibration; poorly tuned thresholds create alarm fatigue for operators.',
      'Integration with older pulse-jet controllers and legacy PLCs can require custom work.',
    ],
    bottomLine: 'A high-value dashboard opportunity: live compartment-level pressure maps, emission trend lines against regulatory limits, and predictive alerts. Every avoided emissions violation or unplanned shutdown directly saves the plant money — recommended as the entry point for the rollout.',
    headlineKpis: [
      { label: 'Filter Bag Life', value: '+24%', tone: 'success' },
      { label: 'Compressed Air Use', value: '-32%', tone: 'success' },
      { label: 'Particulate Emissions', value: '-28%', tone: 'success' },
    ],
  },
  {
    id: 'smart-control-centre',
    slug: 'smart-control-centre',
    title: 'Smart Control Centre Management',
    shortTitle: 'Control Centre',
    status: 'placeholder',
    route: '/modules/smart-control-centre',
    whatItIs: 'A unified control room, on-site or remote, that consolidates kiln, mill, quality, energy, and safety data into one operational picture. Industry leaders have proven the model with centres supervising more than a dozen plants and dozens of kilns and mills around the clock, with a digital twin layer for simulation and predictive maintenance.',
    advantages: [
      'Single source of truth: one entry point to process, production, quality, and business data removes information silos.',
      'Faster corrective action: operators see deviations in safety, environment, efficiency, and quality targets immediately.',
      'Proven KPIs: 6% lower maintenance cost, 40% increase in mean time between failures, and 1.2 percentage point gain in equipment availability.',
      'Multi-plant benchmarking: standardized KPIs and SOPs across sites let management compare plant performance directly.',
    ],
    disadvantages: [
      'Highest upfront investment of the modules, since it depends on plant-wide instrumentation and reliable connectivity.',
      'Organizational change is significant; operators shift from manual control to supervision, which requires retraining.',
      'Centralization concentrates risk: network outages or cyber incidents affect visibility across every connected plant.',
    ],
    bottomLine: 'Essentially a dashboard product — KPI walls, alarm management, energy and emissions tracking, and cross-plant comparison screens. The largest revenue opportunity and positions the platform at the core of plant operations.',
    headlineKpis: [
      { label: 'Maintenance Cost', value: '-6%', tone: 'success' },
      { label: 'MTBF', value: '+40%', tone: 'success' },
      { label: 'Equipment Availability', value: '+1.2pp', tone: 'success' },
    ],
  },
  {
    id: '3d-stock-management',
    slug: '3d-stock-management',
    title: '3D Stock Management',
    shortTitle: 'Stock Management',
    status: 'placeholder',
    route: '/modules/3d-stock-management',
    whatItIs: 'A typical plant manages 8 to 14 bulk material stockpiles such as limestone, clinker, coal, and gypsum. Traditional surveys with tape measures or GPS rovers carry 5 to 15 percent error and require people to climb unstable piles. 3D stock management replaces this with drone photogrammetry, LiDAR scanners, and software that converts point clouds into volume and tonnage figures pushed straight into ERP systems.',
    advantages: [
      'Accuracy: combined drone and ground LiDAR setups reach sub-1% measurement accuracy, versus 5 to 15 percent for manual methods.',
      'Speed: a full stockyard survey drops from 3-5 days to about 90 minutes; one site now covers 30 stockpiles in 7-8 drone flights per month.',
      'Safety: nobody climbs a pile or enters a dusty clinker silo; LiDAR penetrates dust and works in dark, confined spaces.',
      'Financial control: accurate book-versus-physical reconciliation recovers hundreds of thousands of dollars in previously unexplained inventory variance at a typical 2 MTPA plant.',
    ],
    disadvantages: [
      'Drone operations need trained pilots, flight permissions, and weather or dust windows for outdoor missions.',
      'Tonnage accuracy still depends on correct material density assumptions per pile.',
      'Fixed scanner installations must be engineered per site to avoid blind spots, which adds design effort.',
    ],
    bottomLine: 'Strong dashboard fit: 3D pile visualizations, volume and tonnage by material, trend charts of intake versus consumption, and automatic reconciliation against ERP records. Client value is measured in recovered working capital.',
    headlineKpis: [
      { label: 'Survey Accuracy', value: '>99%', tone: 'success' },
      { label: 'Survey Time', value: '~90 min', tone: 'success' },
      { label: 'vs Manual Survey', value: '3-5 days', tone: 'neutral' },
    ],
  },
  {
    id: 'predictive-maintenance',
    slug: 'predictive-maintenance',
    title: 'Predictive Maintenance',
    shortTitle: 'Predictive Maint.',
    status: 'placeholder',
    route: '/modules/predictive-maintenance',
    whatItIs: 'Vibration, temperature, pressure, and flow sensors are placed on critical rotating equipment such as kiln drives, mill gearboxes, and fans. Machine learning models learn the normal signature of each machine and raise a work order when the pattern drifts, so repairs happen during planned windows instead of after a breakdown.',
    advantages: [
      'Downtime reduction: digitally mature plants report 40 to 60% less unplanned downtime; one avoided downtime day at a 1 MTPA plant is worth around USD 300K.',
      'Proven at scale: leading deployments report 6% lower maintenance cost and a 40% increase in mean time between failures on covered equipment.',
      'Better planning: spare parts and crews are scheduled in advance rather than mobilized in emergencies.',
    ],
    disadvantages: [
      'Needs months of baseline data before predictions become trustworthy.',
      'Sensor retrofits on hundreds of assets take time and budget; prioritization of critical equipment is essential.',
    ],
    bottomLine: 'Dashboard fit is direct: asset health scores, remaining useful life estimates, and a live work order queue. Pairs naturally with the bag filter module since both share the same alerting and maintenance workflow screens.',
    headlineKpis: [
      { label: 'Downtime Reduction', value: '40-60%', tone: 'success' },
      { label: 'Avoided Downtime Value', value: '~$300K/day', tone: 'neutral' },
    ],
  },
  {
    id: 'kiln-energy-optimization',
    slug: 'kiln-energy-optimization',
    title: 'Kiln and Energy Optimization',
    shortTitle: 'Energy Optimization',
    status: 'placeholder',
    route: '/modules/kiln-energy-optimization',
    whatItIs: 'AI models continuously tune kiln firing, grinding circuits, and fan loads against fuel cost, throughput, and quality targets — attacking the single largest operating cost in cement, which is energy across kilns, mills, and coolers.',
    advantages: [
      'Energy savings: AI-optimized kiln operation and smart grinding report savings in the range of 8 to 15%, with leading transformations claiming up to 35 to 50% across combined measures.',
      'More output without capex: optimization raises throughput from existing equipment instead of new capacity investment.',
      'Emissions benefit: lower fuel burn directly reduces CO2, supporting sustainability reporting and alternative fuel use.',
    ],
    disadvantages: [
      'Kiln chemistry is complex; models must be trained on cement-specific process physics — generic tools underperform.',
      'Closed-loop control requires strong operator trust and careful safety interlocks before AI is allowed to act autonomously.',
    ],
    bottomLine: 'Energy dashboards (specific power per ton, fuel mix, kiln thermal profile) are among the most-viewed screens in any cement control room. Even a 1% energy reduction can justify an entire project phase.',
    headlineKpis: [
      { label: 'Energy Savings', value: '8-15%', tone: 'success' },
      { label: 'Leading Transformations', value: 'up to 35-50%', tone: 'success' },
    ],
  },
  {
    id: 'quality-prediction-lab-automation',
    slug: 'quality-prediction-lab-automation',
    title: 'Quality Prediction and Lab Automation',
    shortTitle: 'Quality Prediction',
    status: 'placeholder',
    route: '/modules/quality-prediction-lab-automation',
    whatItIs: 'Instead of waiting for lab tests every couple of hours, soft-sensor models predict clinker and cement quality (free lime, fineness, strength class) in real time from process data, and flag drift before off-spec material is produced.',
    advantages: [
      'Fewer off-spec batches: deviations are corrected in minutes rather than discovered hours later at the lab.',
      'Tighter targets: confidence in quality prediction lets plants run closer to specification limits, saving clinker and energy.',
      'Full traceability: every batch is logged with its process conditions, simplifying customer claims and audits.',
    ],
    disadvantages: [
      'Model accuracy depends on consistent raw material data; poor quarry data quality weakens predictions.',
      'Physical lab testing is still legally required for certification, so this augments rather than replaces the lab.',
    ],
    bottomLine: 'Quality trend dashboards with predicted-versus-measured values are a clear differentiator, connecting production data with the commercial side of the business.',
    headlineKpis: [
      { label: 'Correction Time', value: 'Minutes vs hours', tone: 'success' },
      { label: 'Lab Test Cadence', value: 'Every ~2h baseline', tone: 'neutral' },
    ],
  },
  {
    id: 'worker-safety-computer-vision',
    slug: 'worker-safety-computer-vision',
    title: 'Worker Safety and Computer Vision',
    shortTitle: 'Worker Safety',
    status: 'placeholder',
    route: '/modules/worker-safety-computer-vision',
    whatItIs: 'Cameras with AI vision models watch high-risk zones for missing PPE, people entering restricted areas near kilns or moving conveyors, vehicle and pedestrian proximity, and unsafe behaviour such as climbing stockpiles. Alerts go to supervisors in real time and incidents are logged automatically.',
    advantages: [
      'Continuous coverage: cameras watch 24/7 across zones a safety officer can only spot check.',
      'Faster response: a person down or a proximity breach triggers an alert in seconds instead of being found later.',
      'Audit-ready records: automatic incident logs with video evidence support investigations and insurance claims.',
    ],
    disadvantages: [
      'Privacy and works council concerns; clear policies and worker communication are required before rollout.',
      'Heavy dust and poor lighting degrade camera performance, so placement and cleaning routines matter.',
    ],
    bottomLine: 'Safety dashboards (live zone status, incident counts, PPE compliance rates) speak directly to plant management and HSE teams — the easiest topic to get executive attention on.',
    headlineKpis: [
      { label: 'Coverage', value: '24/7', tone: 'neutral' },
      { label: 'Alert Latency', value: 'Seconds', tone: 'success' },
    ],
  },
  {
    id: 'emissions-carbon-tracking',
    slug: 'emissions-carbon-tracking',
    title: 'Emissions and Carbon Tracking',
    shortTitle: 'Emissions Tracking',
    status: 'placeholder',
    route: '/modules/emissions-carbon-tracking',
    whatItIs: 'A sustainability layer that aggregates CEMS stack data, fuel consumption, alternative fuel share, and power use into live CO2, NOx, SO2, and dust reporting per ton of clinker and cement. It supports regulatory reporting and net-zero commitments with automated, audit-ready records.',
    advantages: [
      'Regulatory protection: live tracking against permit limits with automated alerts prevents violations before they happen.',
      'Carbon accounting: per-ton CO2 figures feed ESG reports and carbon credit or tax calculations without manual spreadsheet work.',
      'Alternative fuel support: tracking thermal substitution rates helps plants raise cheaper alternative fuel use safely.',
    ],
    disadvantages: [
      'Regulations differ by country and change often, so calculation logic needs ongoing maintenance.',
      'Emission factors and measurement calibration must be defensible; auditors will challenge the numbers.',
    ],
    bottomLine: 'Every cement producer now has sustainability reporting obligations, making this a recurring-revenue dashboard rather than a one-time build. It reuses the same CEMS data as the bag filter module, so marginal build cost is low.',
    headlineKpis: [
      { label: 'Reporting', value: 'Live · audit-ready', tone: 'neutral' },
      { label: 'Data Reuse', value: 'Shares CEMS w/ Bag Filter', tone: 'neutral' },
    ],
  },
];

export const getModuleBySlug = (slug) => MODULES.find((m) => m.slug === slug);

export const RBAC_ROLES = [
  { role: 'Plant Administrator', roleKey: 'plant_admin', users: 1, rights: ['Manage users', 'All read', 'All write', 'Acknowledge alerts', 'Export reports'], color: 'red' },
  { role: 'Control Room Operator', roleKey: 'control_room_operator', users: 1, rights: ['View live dashboards', 'Acknowledge alerts', 'Adjust setpoints'], color: 'sky' },
  { role: 'Maintenance Engineer', roleKey: 'maintenance_engineer', users: 1, rights: ['View asset health', 'Create work orders', 'Acknowledge maintenance alerts'], color: 'amber' },
  { role: 'HSE / Safety Officer', roleKey: 'hse_officer', users: 1, rights: ['View safety & emissions', 'Acknowledge safety alerts', 'Export compliance records'], color: 'emerald' },
];

export const AUDIT_LOG = [
  { id: 'AUD-3120', ts: '2026-07-16 16:42:11', user: 'Rajesh Kumar', role: 'Plant Administrator', action: 'Acknowledged critical alert', target: 'BH-3 emission threshold breach', ip: '10.4.2.18', result: 'success' },
  { id: 'AUD-3119', ts: '2026-07-16 15:58:03', user: 'Priya Nair', role: 'Control Room Operator', action: 'Viewed live dashboard', target: 'Bag Filter Dust Monitoring', ip: '10.4.2.31', result: 'success' },
  { id: 'AUD-3118', ts: '2026-07-16 14:33:47', user: 'Suresh Menon', role: 'Maintenance Engineer', action: 'Created work order', target: 'BH-5 inspection — bag blinding predicted', ip: '10.4.2.55', result: 'success' },
  { id: 'AUD-3117', ts: '2026-07-16 12:14:09', user: 'Anita Fernandes', role: 'HSE / Safety Officer', action: 'Exported compliance record', target: 'Emissions summary — Q2 2026', ip: '10.4.2.07', result: 'success' },
  { id: 'AUD-3116', ts: '2026-07-16 11:02:22', user: 'Rajesh Kumar', role: 'Plant Administrator', action: 'Updated emission threshold', target: '30 mg/Nm³ regulatory limit', ip: '10.4.2.01', result: 'success' },
  { id: 'AUD-3115', ts: '2026-07-16 09:48:55', user: 'unknown', role: '(unauthenticated)', action: 'Login attempt', target: '(rejected — invalid credentials)', ip: '10.4.2.99', result: 'failure' },
  { id: 'AUD-3114', ts: '2026-07-15 18:30:01', user: 'Priya Nair', role: 'Control Room Operator', action: 'Acknowledged warning alert', target: 'BH-7 early blinding signature', ip: '10.4.2.31', result: 'success' },
  { id: 'AUD-3113', ts: '2026-07-15 17:21:44', user: 'Suresh Menon', role: 'Maintenance Engineer', action: 'Closed work order', target: 'BH-2 compressed-air valve service', ip: '10.4.2.55', result: 'success' },
];

export const EMISSIONS_PERMIT_LIMITS = [
  { pollutant: 'Particulate Matter (dust)', limitMgNm3: 30, standard: 'Local emissions permit' },
  { pollutant: 'NOx', limitMgNm3: 800, standard: 'Local emissions permit' },
  { pollutant: 'SO2', limitMgNm3: 200, standard: 'Local emissions permit' },
];
