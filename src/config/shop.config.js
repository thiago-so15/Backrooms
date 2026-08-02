/** Default third-person outfit (free). */
export const DEFAULT_SKIN = {
  id: 'default',
  name: 'Ropa básica',
  description: 'Tu atuendo inicial.',
  colors: {
    skin: 0xc4a882,
    shirt: 0x3a4a38,
    pants: 0x1e2420,
    shoes: 0x151515,
  },
};

/** Shop upgrades — prices and effects (Spanish labels in UI). */
export const SHOP_ITEMS = [
  {
    id: 'battery_1',
    name: 'Batería ampliada I',
    description: 'Aumenta la capacidad máxima de la linterna en un 25%.',
    price: 10,
    requires: null,
    effect: { maxBatteryBonus: 25 },
  },
  {
    id: 'battery_2',
    name: 'Batería ampliada II',
    description: 'Aumenta aún más la capacidad de la linterna (+25%).',
    price: 25,
    requires: 'battery_1',
    effect: { maxBatteryBonus: 25 },
  },
  {
    id: 'battery_3',
    name: 'Batería ampliada III',
    description: 'Máxima extensión de batería (+25%).',
    price: 50,
    requires: 'battery_2',
    effect: { maxBatteryBonus: 25 },
  },
  {
    id: 'battery_efficient',
    name: 'Carga eficiente',
    description: 'La linterna consume un 25% menos de batería.',
    price: 20,
    requires: null,
    effect: { batteryDrainMult: 0.75 },
  },
  {
    id: 'sanity_1',
    name: 'Vitalidad',
    description: 'Aumenta tu vida máxima en un 25%.',
    price: 15,
    requires: null,
    effect: { maxHealthBonus: 25 },
  },
  {
    id: 'speed_1',
    name: 'Piernas ligeras',
    description: 'Te movés un 12% más rápido.',
    price: 18,
    requires: null,
    effect: { speedMult: 1.12 },
  },
];

/** Character skins for third-person view — cosmetic only. */
export const SHOP_SKINS = [
  {
    id: 'skin_emergency',
    name: 'Traje de emergencia',
    description: 'Mono naranja de evacuación. Visible en la oscuridad.',
    price: 500,
    colors: {
      skin: 0xc4a882,
      shirt: 0xd45500,
      pants: 0xb84400,
      shoes: 0x2a1810,
    },
  },
  {
    id: 'skin_hospital',
    name: 'Uniforme clínico',
    description: 'Bata blanca y pantalón celeste. Parecés del personal.',
    price: 550,
    colors: {
      skin: 0xd4b896,
      shirt: 0xe8eef2,
      pants: 0x6a9bb0,
      shoes: 0xffffff,
    },
  },
  {
    id: 'skin_hazmat',
    name: 'Traje hazmat',
    description: 'Amarillo tóxico. Ideal para zonas contaminadas.',
    price: 600,
    colors: {
      skin: 0xc4a882,
      shirt: 0xd4c420,
      pants: 0xc4b418,
      shoes: 0x3a3a20,
    },
  },
  {
    id: 'skin_rust',
    name: 'Explorador oxidado',
    description: 'Tonos óxido y tierra. Como si llevaras años perdido.',
    price: 650,
    colors: {
      skin: 0xb8956a,
      shirt: 0x8a4a28,
      pants: 0x4a3020,
      shoes: 0x2a1810,
    },
  },
  {
    id: 'skin_shadow',
    name: 'Sombra del limbo',
    description: 'Todo negro. Te fundís con los pasillos.',
    price: 750,
    colors: {
      skin: 0x8a7060,
      shirt: 0x121212,
      pants: 0x0a0a0a,
      shoes: 0x050505,
    },
  },
  {
    id: 'skin_toxic',
    name: 'Neón tóxico',
    description: 'Verde ácido. Parece filtrarse de las tuberías.',
    price: 800,
    colors: {
      skin: 0xa8c878,
      shirt: 0x3dff6a,
      pants: 0x1a4a28,
      shoes: 0x0a1a10,
    },
  },
  {
    id: 'skin_void',
    name: 'Viajero del vacío',
    description: 'Azul profundo y detalles pálidos. El más raro.',
    price: 1000,
    colors: {
      skin: 0xc8c0d8,
      shirt: 0x1a2848,
      pants: 0x0e1628,
      shoes: 0xe8e4f0,
    },
  },
];

export const ECONOMY_CONFIG = {
  coinValue: 1,
  coinHeight: 0.9,
  coinCollectRadius: 0.9,
};
