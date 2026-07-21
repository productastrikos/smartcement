// PM/dust limit reuses the exact bag-filter regulatory threshold (same CEMS
// data source, per the reference doc's note that this module "reuses the
// same CEMS data as the bag filter module, so the marginal build cost is low").
const PM_LIMIT_MGNM3 = 30;
const NOX_LIMIT_MGNM3 = 800;
const SO2_LIMIT_MGNM3 = 200;

// Rough stack-gas-volume-per-ton conversion factor used only to translate a
// live mg/Nm3 concentration into an illustrative kg/ton figure for the KPI
// cards — not a certified emissions-factor calculation.
const KG_PER_TON_FACTOR = 0.0026;

const state = {
  noxMgNm3: 550 + Math.random() * 120,
  so2MgNm3: 90 + Math.random() * 60,
};

module.exports = { PM_LIMIT_MGNM3, NOX_LIMIT_MGNM3, SO2_LIMIT_MGNM3, KG_PER_TON_FACTOR, state };
