const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Reusable modal overlay: focus trap, Esc to close, click-outside to close.
 */
export class Modal {
  constructor(container, options = {}) {
    this.container = container;
    this.panelClass = options.panelClass || 'modal-panel';
    this.overlayClass = options.overlayClass || 'modal-overlay';
    this.ariaLabelledBy = options.ariaLabelledBy || null;
    this.closeOnOverlay = options.closeOnOverlay !== false;
    this.closeOnEscape = options.closeOnEscape !== false;

    this.isOpen = false;
    this._previousFocus = null;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this.onClose = null;

    this.overlay = document.createElement('div');
    this.overlay.className = `${this.overlayClass} hidden`;
    this.overlay.setAttribute('aria-hidden', 'true');

    this.panel = document.createElement('div');
    this.panel.className = this.panelClass;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    if (this.ariaLabelledBy) {
      this.panel.setAttribute('aria-labelledby', this.ariaLabelledBy);
    }

    this.overlay.appendChild(this.panel);
    this.container.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (this.closeOnOverlay && e.target === this.overlay) this.close();
    });
    this.panel.addEventListener('click', (e) => e.stopPropagation());
  }

  setContent(html) {
    this.panel.innerHTML = html;
  }

  query(selector) {
    return this.panel.querySelector(selector);
  }

  _handleKeyDown(e) {
    if (!this.isOpen) return;

    if (this.closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = [...this.panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._previousFocus = document.activeElement;
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', this._onKeyDown, true);

    const closeBtn = this.panel.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onKeyDown, true);

    if (this._previousFocus?.focus) {
      this._previousFocus.focus();
    }
    if (this.onClose) this.onClose();
  }

  destroy() {
    this.close();
    this.overlay.remove();
  }
}
