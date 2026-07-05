import { HUD } from '../../components/ui/hud/HUD.js';
import { Screens } from '../../components/ui/Screens.js';
import { ToastManager } from '../../components/ui/overlays/ToastManager.js';
import { TouchControls } from '../../components/ui/overlays/TouchControls.js';

/**
 * Coordinates all HTML UI layers (screens, HUD, toasts).
 * UI is never rendered inside the WebGL canvas.
 */
export class UIManager {
  constructor(uiLayer, gameContainer, inputManager) {
    this.container = uiLayer;
    this.hud = new HUD(uiLayer);
    this.screens = new Screens(uiLayer, gameContainer);
    this.toasts = new ToastManager(uiLayer);
    this.touchControls = new TouchControls(uiLayer, inputManager);
  }

  get settingsPanel() {
    return this.screens.settingsPanel;
  }

  showToast(message, duration) {
    this.toasts.show(message, duration);
  }

  dispose() {
    this.toasts.clear();
  }
}
