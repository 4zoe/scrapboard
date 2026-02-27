const express = require('express');
const cors = require('cors');
const { MATERIALS_DATA } = require('./materialsData');

const app = express();
const PORT = process.env.PORT || 3000;
const OZ_TO_GRAM = 31.1035;
const PURITIES = { "24K": 1.0, "22K": 0.9167, "20K": 0.8333, "18K": 0.75, "16K": 0.6667, "14K": 0.5833, "12K": 0.5, "10K": 0.4167 };
const RHODIUM_FALLBACK = 145.0;

app.use(cors());
app.use(express.json());

function cloneMaterials() {
  return JSON.parse(JSON.stringify(MATERIALS_DATA));
}

async function getSpotFeed() {
  let payload;
  try {
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
    if (!response.ok) throw new Error(`Spot API failed: ${response.status}`);
    payload = await response.json();
  } catch (_error) {
    payload = {
      items: [
        {
          xauPrice: 2050,
          xagPrice: 23.5,
          xptPrice: 900,
          xpdPrice: 1000
        }
      ],
      fallback: true
    };
  }

  const item = payload.items?.[0];
  if (!item) throw new Error('Spot API payload missing items[0]');

  const goldG = item.xauPrice / OZ_TO_GRAM;
  const silverG = item.xagPrice / OZ_TO_GRAM;
  const ptG = (item.xptPrice || 900) / OZ_TO_GRAM;
  const pdG = (item.xpdPrice || 1000) / OZ_TO_GRAM;

  const liveAPI = {
    gold_rates: {
      Price_OZ: +item.xauPrice.toFixed(2),
      Price_G: +goldG.toFixed(2),
      Price_24K: +(goldG * PURITIES['24K']).toFixed(2),
      Price_22K: +(goldG * PURITIES['22K']).toFixed(2),
      Price_20K: +(goldG * PURITIES['20K']).toFixed(2),
      Price_18K: +(goldG * PURITIES['18K']).toFixed(2),
      Price_16K: +(goldG * PURITIES['16K']).toFixed(2),
      Price_14K: +(goldG * PURITIES['14K']).toFixed(2),
      Price_12K: +(goldG * PURITIES['12K']).toFixed(2),
      Price_10K: +(goldG * PURITIES['10K']).toFixed(2)
    },
    silver_rates: { Price_OZ: +item.xagPrice.toFixed(2), Price_G: +silverG.toFixed(2) },
    platinum_rates: { Price_OZ: +(item.xptPrice || 900).toFixed(2), Price_G: +ptG.toFixed(2) },
    palladium_rates: { Price_OZ: +(item.xpdPrice || 1000).toFixed(2), Price_G: +pdG.toFixed(2) },
    gold_raw: goldG,
    palladium_raw: pdG,
    platinum_raw: ptG,
    rhodium_raw: RHODIUM_FALLBACK
  };

  return { payload, liveAPI };
}

function applyDynamicRates(materials, liveAPI) {
  materials['E-Waste (Live Yield)']?.items.forEach((i) => {
    i.p = (i.goldYield || 0) * liveAPI.gold_raw + (i.pdYield || 0) * liveAPI.palladium_raw;
  });

  materials['Catalytic Converters']?.items.forEach((i) => {
    i.p = (i.ptYield || 0) * liveAPI.platinum_raw + (i.pdYield || 0) * liveAPI.palladium_raw + (i.rhYield || 0) * liveAPI.rhodium_raw;
  });

  materials['Precious Metals'].items = [
    { n: 'Gold (24K)', p: liveAPI.gold_rates.Price_24K, isPrecious: true },
    { n: 'Silver (.999)', p: liveAPI.silver_rates.Price_G, isPrecious: true },
    { n: 'Platinum (Pure)', p: liveAPI.platinum_rates.Price_G, isPrecious: true },
    { n: 'Palladium (Pure)', p: liveAPI.palladium_rates.Price_G, isPrecious: true }
  ];

  return materials;
}

function getRate(item, unit) {
  const p = item.p || 0;
  if (item.isPrecious) {
    if (unit === 'g') return p;
    if (unit === 'oz') return p * 31.1035;
    if (unit === 'lb') return p * 453.592;
    if (unit === 'kg') return p * 1000;
  } else {
    if (unit === 'lb') return p;
    if (unit === 'kg') return p * 2.20462;
    if (unit === 'oz') return p / 16;
    if (unit === 'g') return p / 453.592;
  }
  return p;
}

app.get('/prices/live', async (_req, res) => {
  try {
    const { payload, liveAPI } = await getSpotFeed();
    const materials = applyDynamicRates(cloneMaterials(), liveAPI);

    res.json({
      liveAPI,
      yardRates: {
        eWaste: materials['E-Waste (Live Yield)'].items,
        catalyticConverters: materials['Catalytic Converters'].items
      },
      source: payload,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/materials', async (_req, res) => {
  try {
    const { liveAPI } = await getSpotFeed();
    const materials = applyDynamicRates(cloneMaterials(), liveAPI);
    res.json({ materials, fetchedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/quote', async (req, res) => {
  try {
    const { lineItems = [], margin = 0 } = req.body || {};
    const { liveAPI } = await getSpotFeed();
    const materials = applyDynamicRates(cloneMaterials(), liveAPI);

    const computed = lineItems.map((line) => {
      const category = materials[line.category];
      const selectedItem = category?.items.find((item) => item.n === line.name) || category?.items[line.itemIndex];

      const unit = line.unit || 'lb';
      const qty = Number(line.qty || 0);
      const unitRate = selectedItem ? getRate(selectedItem, unit) : Number(line.rate || 0);
      const lineTotal = unitRate * qty;

      return {
        category: line.category,
        name: selectedItem?.n || line.name || 'Custom Material',
        unit,
        qty,
        unitRate,
        lineTotal
      };
    });

    const subtotal = computed.reduce((sum, row) => sum + row.lineTotal, 0);
    const payout = subtotal * (1 - Number(margin || 0));

    res.json({
      margin: Number(margin || 0),
      subtotal,
      payout,
      lineItems: computed,
      pricedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`scrapboard api listening on http://localhost:${PORT}`);
});
