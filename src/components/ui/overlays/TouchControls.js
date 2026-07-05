/**
 * On-screen D-pad for mobile movement (HTML overlay).
 */
export class TouchControls {
  constructor(container, inputManager) {
    this.container = container;
    this.input = inputManager;
    this.element = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'touch-controls';
    el.className = 'touch-controls hidden';
    el.setAttribute('aria-label', 'Controles de movimiento');
    el.innerHTML = `
      <div class="touch-dpad">
        <button type="button" class="touch-btn touch-btn--up" data-dir="up" aria-label="Arriba">&#9650;</button>
        <button type="button" class="touch-btn touch-btn--left" data-dir="left" aria-label="Izquierda">&#9664;</button>
        <button type="button" class="touch-btn touch-btn--right" data-dir="right" aria-label="Derecha">&#9654;</button>
        <button type="button" class="touch-btn touch-btn--down" data-dir="down" aria-label="Abajo">&#9660;</button>
      </div>
    `;

    this.container.appendChild(el);
    this.element = el;

    for (const btn of el.querySelectorAll('.touch-btn')) {
      const dir = btn.dataset.dir;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
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

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    this.input.clearTouchDirections();
  }
}
