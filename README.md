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

## Niveles

1. **Nivel 119 — Average Waterpark** — Parque acuático abandonado con toboganes infinitos.
2. **Nivel 9 — The Suburbs** — Suburbio infinito de noche, niebla densa y faroles.

En cada nivel tenés que juntar todas las llaves para desbloquear la salida.

## Stack

- [Three.js](https://threejs.org/) — renderizado 3D
- [Vite](https://vitejs.dev/) — bundler y dev server

## Estructura del proyecto

```
src/
├── core/       # Escena, input, audio
├── maze/       # Generación y construcción del laberinto
├── entities/   # Jugador, entidad enemiga, pickups
├── systems/    # Supervivencia y niveles
├── ui/         # HUD y pantallas
└── styles/     # Estilos CSS
```
