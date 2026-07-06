/**
 * On-screen controls for mobile: D-pad (move) + drag zone (look).
 */
export class TouchControls {
  constructor(container, inputManager) {
    this.container = container;
    this.input = inputManager;
    this.element = null;
    this._lookPointerId = null;
    this._lastLookX = 0;
    this._lastLookY = 0;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'touch-controls';
    el.className = 'touch-controls hidden';
    el.setAttribute('aria-label', 'Controles táctiles');
    el.innerHTML = `
      <div class="touch-look-zone" aria-label="Arrastrá para mirar">
        <span class="touch-look-hint">Arrastrá para mirar</span>
      </div>
      <div class="touch-dpad" aria-label="Controles de movimiento">
        <button type="button" class="touch-btn touch-btn--up" data-dir="up" aria-label="Arriba">&#9650;</button>
        <button type="button" class="touch-btn touch-btn--left" data-dir="left" aria-label="Izquierda">&#9664;</button>
        <button type="button" class="touch-btn touch-btn--right" data-dir="right" aria-label="Derecha">&#9654;</button>
        <button type="button" class="touch-btn touch-btn--down" data-dir="down" aria-label="Abajo">&#9660;</button>
      </div>
    `;

    this.container.appendChild(el);
    this.element = el;

    this._bindDpad(el);
    this._bindLookZone(el.querySelector('.touch-look-zone'));
  }

  _bindDpad(el) {
    for (const btn of el.querySelectorAll('.touch-btn')) {
      const dir = btn.dataset.dir;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.setPointerCapture(e.pointerId);
        this.input.setTouchDirection(dir, true);
        btn.classList.add('touch-btn--active');
      });
      btn.addEventListener('pointerup', () => {
        this.input.setTouchDirection(dir, false);
        btn.classList.remove('touch-btn--active');
      });
      btn.addEventListener('pointercancel', () => {
        this.input.setTouchDirection(dir, false);
        btn.classList.remove('touch-btn--active');
      });
      btn.addEventListener('lostpointercapture', () => {
        this.input.setTouchDirection(dir, false);
        btn.classList.remove('touch-btn--active');
      });
    }
  }

  _bindLookZone(zone) {
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      this._lookPointerId = e.pointerId;
      this._lastLookX = e.clientX;
      this._lastLookY = e.clientY;
      zone.classList.add('touch-look-zone--active');
    });

    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._lookPointerId) return;
      const dx = e.clientX - this._lastLookX;
      const dy = e.clientY - this._lastLookY;
      this.input.addLookDelta(dx, dy);
      this._lastLookX = e.clientX;
      this._lastLookY = e.clientY;
    });

    const endLook = (e) => {
      if (e.pointerId !== this._lookPointerId) return;
      this._lookPointerId = null;
      zone.classList.remove('touch-look-zone--active');
    };

    zone.addEventListener('pointerup', endLook);
    zone.addEventListener('pointercancel', endLook);
    zone.addEventListener('lostpointercapture', () => {
      this._lookPointerId = null;
      zone.classList.remove('touch-look-zone--active');
    });
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    this._lookPointerId = null;
    this.input.clearTouchDirections();
    this.element.querySelector('.touch-look-zone')?.classList.remove('touch-look-zone--active');
  }
}
