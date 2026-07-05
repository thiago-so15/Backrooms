/** Clamp a numeric value between min and max. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
