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
    name: 'Mente estable',
    description: 'Aumenta tu cordura máxima en un 25%.',
    price: 15,
    requires: null,
    effect: { maxSanityBonus: 25 },
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

export const ECONOMY_CONFIG = {
  coinValue: 1,
  coinHeight: 0.9,
  coinCollectRadius: 0.9,
};
