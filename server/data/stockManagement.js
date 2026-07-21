const MATERIALS = [
  { id: 'limestone', name: 'Limestone', unitPriceUsd: 8 },
  { id: 'clinker', name: 'Clinker', unitPriceUsd: 40 },
  { id: 'coal', name: 'Coal', unitPriceUsd: 90 },
  { id: 'gypsum', name: 'Gypsum', unitPriceUsd: 15 },
  { id: 'flyash', name: 'Fly Ash', unitPriceUsd: 5 },
];

const BASE_QTY_TONS = {
  limestone: 18000,
  clinker: 9000,
  coal: 4200,
  gypsum: 2100,
  flyash: 1400,
};

const now = new Date().toISOString();

const state = {
  materials: Object.fromEntries(
    MATERIALS.map((m) => {
      const book = BASE_QTY_TONS[m.id];
      const physical = book * (0.97 + Math.random() * 0.05);
      return [m.id, { bookQtyTons: book, physicalQtyTons: physical, lastScanAt: now }];
    })
  ),
  metrics: {
    measurementAccuracyPct: 99.2 + Math.random() * 0.6,
    surveyCycleTimeMin: 85 + Math.random() * 15,
    flightsPerMonth: 7 + Math.floor(Math.random() * 3),
    densityCalibrationAccuracyPct: 97.5 + Math.random() * 1.8,
  },
};

module.exports = { MATERIALS, state };
