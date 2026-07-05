import { GameManager } from './GameManager.js';

/** Application entry point — bootstraps the game manager. */
export function bootstrap() {
  return new GameManager();
}
