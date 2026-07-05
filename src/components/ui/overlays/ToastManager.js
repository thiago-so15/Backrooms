import { UI_CONFIG } from '../../../config/ui.config.js';

/**
 * Lightweight toast notification stack (HTML overlay, not canvas).
 */
export class ToastManager {
  constructor(container) {
    this.container = container;
    this._queue = [];
    this._stack = document.createElement('div');
    this._stack.className = 'toast-stack';
    this._stack.setAttribute('aria-live', 'polite');
    this.container.appendChild(this._stack);
  }

  show(message, duration = UI_CONFIG.toast.defaultDuration) {
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    this._stack.appendChild(toast);

    const items = this._stack.querySelectorAll('.toast-item');
    if (items.length > UI_CONFIG.toast.maxVisible) {
      items[0].remove();
    }

    requestAnimationFrame(() => toast.classList.add('toast-item--visible'));

    const timer = setTimeout(() => {
      toast.classList.remove('toast-item--visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 300);
    }, duration * 1000);

    this._queue.push({ toast, timer });
  }

  clear() {
    for (const { toast, timer } of this._queue) {
      clearTimeout(timer);
      toast.remove();
    }
    this._queue = [];
  }
}
