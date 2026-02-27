const MATERIALS_DATA = {
  "Precious Metals": { isPrecious: true, icon: "fa-solid fa-gem", items: [] },
  "E-Waste (Live Yield)": {
    icon: "fa-solid fa-microchip",
    isYieldBased: true,
    items: [
      { n: "Motherboards (High Grade)", goldYield: 0.12, pdYield: 0.01 },
      { n: "RAM (Gold Sticks)", goldYield: 0.25 },
      { n: "Ceramic CPUs", goldYield: 0.6, pdYield: 0.15 }
    ]
  },
  "Catalytic Converters": {
    icon: "fa-solid fa-van-shuttle",
    isYieldBased: true,
    items: [
      { n: "Small Domestic", ptYield: 1.2, pdYield: 0.8, rhYield: 0.08 },
      { n: "Large Foreign", ptYield: 2.8, pdYield: 2.2, rhYield: 0.25 }
    ]
  },
  "Copper & Wire": {
    icon: "fa-solid fa-bolt-lightning",
    items: [
      { n: "#1 COPPER", p: 3.0 },
      { n: "#2 COPPER", p: 2.8 },
      { n: "BARE BRITE COPPER", p: 3.1 }
    ]
  },
  "Aluminum": {
    icon: "fa-solid fa-car",
    items: [
      { n: "AL POP CANS", p: 0.5 },
      { n: "ALUM WHEELS", p: 0.85 },
      { n: "ALUMINUM SHEET", p: 0.5 }
    ]
  },
  "Brass & Bronze": {
    icon: "fa-solid fa-faucet",
    items: [
      { n: "YELLOW BRASS", p: 2.2 },
      { n: "RED BRASS", p: 2.4 }
    ]
  },
  "Radiators": {
    icon: "fa-solid fa-temperature-three-quarters",
    items: [
      { n: "AL/CU RADS – CLEAN", p: 1.5 },
      { n: "AUTO RADS W/FE", p: 0.8 }
    ]
  },
  "Motors & Parts": {
    icon: "fa-solid fa-gears",
    items: [
      { n: "ALTERNATORS", p: 0.4 },
      { n: "STARTERS", p: 0.25 }
    ]
  },
  "E-Waste (Static)": {
    icon: "fa-solid fa-laptop",
    items: [
      { n: "CELL PHONES W/ BATTS", p: 1.15 },
      { n: "LAPTOP INTACT", p: 0.4 }
    ]
  }
};

module.exports = { MATERIALS_DATA };
