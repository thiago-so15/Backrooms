/** Returns true when a fine pointer (mouse) is available. */
export function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}

/** @typedef {'desktop' | 'mobile'} DeviceType */

/**
 * Detects the primary input device class.
 * Mobile = coarse pointer or touch without fine pointer.
 */
export function getDeviceType() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const touch = navigator.maxTouchPoints > 0;

  if (coarse && !fine) return 'mobile';
  if (touch && !fine) return 'mobile';
  return 'desktop';
}

export function isMobileDevice() {
  return getDeviceType() === 'mobile';
}

/** Spanish label shown in UI. */
export function getDeviceLabel(type = getDeviceType()) {
  return type === 'mobile' ? 'Celular' : 'Computadora';
}

/** Hint text for intro screen per device. */
export function getDeviceHint(type = getDeviceType()) {
  if (type === 'mobile') {
    return 'Usá las flechas para moverte. Arrastrá el dedo en la derecha de la pantalla para mirar alrededor.';
  }
  return 'WASD para moverte, mouse para mirar.';
}

/** Default graphics quality based on device capabilities. */
export function detectDefaultGraphicsQuality() {
  if (window.matchMedia('(pointer: coarse)').matches) return 'medium';
  return 'high';
}

/** Effective reduced-motion preference (system or override). */
export function prefersReducedMotion(override = null) {
  if (override === true || override === false) return override;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
