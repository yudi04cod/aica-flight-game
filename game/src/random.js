// Seeded random numbers, so the valley, the rings and the screenshots are
// the same every run: the same seed always builds the same mountain.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable pseudo-random value in [0, 1) for one integer, used for trees and
// clouds so nothing needs a stored table: the same index always answers alike.
export function hash01(index, salt) {
  let h = (index * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 100000) / 100000;
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Smooth interpolation between segment endpoints.
export function easeInOut(a, b, t) {
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}

// Wrap an angle in degrees to (-180, 180].
export function wrapAngle(degrees) {
  let d = degrees % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}
