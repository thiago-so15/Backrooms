# The Backrooms

Juego de supervivencia en primera persona inspirado en *The Backrooms*. Explorá laberintos generados proceduralmente, juntá llaves y escapá antes de que te alcance la entidad.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abrí la URL que muestra Vite (por defecto `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview   # previsualizar el build
```

## Controles

| Tecla | Acción |
|-------|--------|
| WASD | Moverse |
| Shift | Correr |
| Mouse | Mirar |
| F | Linterna |
| Esc | Pausa |

## Stack

- **Vite** — bundler y dev server
- **Three.js** — renderizado 3D (vanilla JS, sin React)
- **localStorage** — ajustes y progreso (100 % cliente)

## Arquitectura

```
src/
├── app/              # GameManager, bootstrap
├── config/           # Valores de juego (sin magic numbers)
├── constants/        # Estados, eventos, storage keys
├── services/storage/ # StorageService (localStorage)
├── systems/          # Managers: audio, input, lighting, level, UI…
├── graphics/maze/    # Generación y construcción del laberinto
├── entities/         # Player, enemy, pickups
├── levels/shared/    # Datos de niveles y temas
├── components/ui/    # HUD, pantallas, modales (HTML, no canvas)
└── utils/            # Utilidades compartidas
```

Los sistemas se comunican vía **EventBus** (`systems/events/EventBus.js`).  
Las preferencias pasan por **SettingsManager** + **StorageService** — nunca `localStorage` directo desde UI.

Rutas antiguas (`src/core/`, `src/ui/`, etc.) reexportan los módulos nuevos por compatibilidad.

## Niveles

1. **Nivel 119 — Average Waterpark**
2. **Nivel 9 — The Suburbs**
3. **Nivel 188 — The Apartments**
