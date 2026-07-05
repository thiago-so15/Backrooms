import { THEMES } from './themes.js';

/** Level definitions: maze size, keys, entity, narrative copy (Spanish UI). */
export const LEVELS = [
  {
    id: 1,
    name: 'NIVEL 119',
    subtitle: 'Average Waterpark',
    description:
      'Hiciste no-clip a través de una pared y caíste en un parque acuático abandonado. Cientos de toboganes se retuercen hacia el infinito. Se escucha el eco de olas que no existen. Encontrá el tobogán amarillo: la salida está cerca.',
    mazeSize: 5,
    keyCount: 2,
    entityEnabled: false,
    theme: THEMES.waterpark,
  },
  {
    id: 2,
    name: 'NIVEL 9',
    subtitle: 'The Suburbs',
    description:
      'Un tobogán amarillo te escupió a un suburbio interminable, atrapado en una noche perpetua. Niebla espesa, asfalto húmedo, faroles que titilan. Las casas se repiten iguales. Algo camina entre ellas, siempre a la misma distancia. No te salgas de la luz.',
    mazeSize: 10,
    keyCount: 4,
    entityEnabled: true,
    entityStartCell: { x: 0, y: 0 },
    theme: THEMES.suburbs,
  },
];
