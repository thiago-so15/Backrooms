import { currencyManager } from '../../../systems/economy/CurrencyManager.js';
import { shopManager } from '../../../systems/economy/ShopManager.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Shop modal — buy permanent upgrades with collected coins.
 */
export class ShopPanel {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.overlay = null;
    this.isOpen = false;
    this._previousFocus = null;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._build();

    currencyManager.subscribe(() => this._render());
    shopManager.subscribe(() => this._render());
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.element = document.createElement('div');
    this.element.className = 'shop-panel';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'shop-title');
    this.element.innerHTML = `
      <div class="settings-header">
        <h2 id="shop-title" class="settings-title">Tienda</h2>
        <button type="button" class="modal-close shop-close" aria-label="Cerrar tienda">&times;</button>
      </div>
      <p class="shop-balance">Monedas: <span id="shop-balance">0</span></p>
      <div id="shop-items" class="shop-items"></div>
      <p class="settings-note">Las mejoras son permanentes y se guardan en este navegador.</p>
    `;

    this.overlay.appendChild(this.element);
    this.container.appendChild(this.overlay);

    this.element.querySelector('.shop-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    this.element.addEventListener('click', (e) => e.stopPropagation());

    this._itemsEl = this.element.querySelector('#shop-items');
    this._balanceEl = this.element.querySelector('#shop-balance');
    this._render();
  }

  _render() {
    if (!this._itemsEl) return;
    const balance = currencyManager.getBalance();
    this._balanceEl.textContent = String(balance);

    this._itemsEl.innerHTML = shopManager.getAllItems().map((item) => {
      const owned = shopManager.owns(item.id);
      const canBuy = shopManager.canPurchase(item.id);
      const locked = item.requires && !shopManager.owns(item.requires);

      let btnLabel = 'Comprar';
      let btnClass = 'shop-buy-btn';
      if (owned) {
        btnLabel = 'Comprada';
        btnClass += ' shop-buy-btn--owned';
      } else if (locked) {
        btnLabel = 'Bloqueada';
        btnClass += ' shop-buy-btn--locked';
      } else if (!canBuy) {
        btnClass += ' shop-buy-btn--expensive';
      }

      return `
        <article class="shop-item ${owned ? 'shop-item--owned' : ''}">
          <div class="shop-item-info">
            <h3 class="shop-item-name">${item.name}</h3>
            <p class="shop-item-desc">${item.description}</p>
            ${locked ? '<p class="shop-item-req">Requiere mejora anterior</p>' : ''}
          </div>
          <div class="shop-item-action">
            <span class="shop-item-price">${item.price} 🪙</span>
            <button type="button" class="${btnClass}" data-id="${item.id}"
              ${owned || locked ? 'disabled' : ''}>${btnLabel}</button>
          </div>
        </article>
      `;
    }).join('');

    for (const btn of this._itemsEl.querySelectorAll('.shop-buy-btn:not(:disabled)')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (shopManager.purchase(id)) {
          this._render();
        }
      });
    }
  }

  _handleKeyDown(e) {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = [...this.element.querySelectorAll(FOCUSABLE)].filter(
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
    this._render();
    this.overlay.classList.remove('hidden');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', this._onKeyDown, true);
    this.element.querySelector('.shop-close').focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onKeyDown, true);
    this._previousFocus?.focus?.();
  }
}
