// The valley itself: a ribbon of segments winding between rock walls, with
// gold rings to thread and an asphalt strip at its far end. Built once from a
// seed, so every flight and every screenshot fly the same mountains.
import {
  CAMERA_DEPTH,
  DRAW_DISTANCE,
  PALETTE,
  RING_RADIUS,
  ROAD_WIDTH,
  RUNWAY_SEGMENTS,
  SEGMENT_LENGTH,
  TRACK_SEGMENTS,
  WALL_HEIGHT,
} from './config.js';
import { clamp, hash01, lerp, mulberry32 } from './random.js';

export const SEGMENT_LENGTH_EXPORT = SEGMENT_LENGTH;

function makeSegment(index) {
  return {
    index,
    curve: 0,
    p1: { world: { x: 0, y: 0, z: index * SEGMENT_LENGTH }, camera: {}, screen: {} },
    p2: { world: { x: 0, y: 0, z: (index + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
    ring: null,
    runway: false,
    fog: 0,
    clip: 0,
    looped: false,
  };
}

// Rolling elevation from layered sines, flattened to a table for the strip.
function elevationAt(distance) {
  const t = distance / SEGMENT_LENGTH;
  const hills = Math.sin(t * 0.021) * 1500 + Math.sin(t * 0.008 + 1.7) * 2200;
  return 2600 + hills;
}

function curveAt(distance) {
  const t = distance / SEGMENT_LENGTH;
  return Math.sin(t * 0.011) * 2.4 + Math.sin(t * 0.004 + 2.1) * 3.2;
}

export function buildTrack(mission, seed) {
  const rng = mulberry32(seed);
  const segments = [];
  for (let index = 0; index < TRACK_SEGMENTS; index += 1) {
    segments.push(makeSegment(index));
  }

  // Lay the ribbon: curve and height change gently, segment by segment.
  for (let index = 0; index < TRACK_SEGMENTS; index += 1) {
    const segment = segments[index];
    const d = index * SEGMENT_LENGTH;
    segment.curve = curveAt(d);
    const y = elevationAt(d);
    segment.p1.world.y = y;
    segment.p2.world.y = elevationAt(d + SEGMENT_LENGTH);
  }
  // The strip is dead flat: the last segments share one elevation, no curve.
  const stripY = elevationAt((TRACK_SEGMENTS - RUNWAY_SEGMENTS) * SEGMENT_LENGTH);
  for (let index = TRACK_SEGMENTS - RUNWAY_SEGMENTS; index < TRACK_SEGMENTS; index += 1) {
    const segment = segments[index];
    segment.curve = 0;
    segment.p1.world.y = stripY;
    segment.p2.world.y = stripY;
    segment.runway = true;
  }
  // Smooth the join into the strip so the valley floor does not jump.
  for (let index = TRACK_SEGMENTS - RUNWAY_SEGMENTS - 12; index < TRACK_SEGMENTS - RUNWAY_SEGMENTS; index += 1) {
    const blend = (index - (TRACK_SEGMENTS - RUNWAY_SEGMENTS - 12)) / 12;
    const segment = segments[index];
    segment.p1.world.y = lerp(segment.p1.world.y, stripY, blend * blend);
    segment.p2.world.y = lerp(segment.p2.world.y, stripY, blend * blend);
  }

  // Rings: spread along the valley, never on the strip, each with a lateral
  // offset and a height above the ground at its segment.
  const ringCount = mission.rings;
  const rings = [];
  for (let i = 0; i < ringCount; i += 1) {
    const at = Math.floor(((i + 1) / (ringCount + 1)) * (TRACK_SEGMENTS - RUNWAY_SEGMENTS - 60)) + 40;
    const segment = segments[at];
    const x = (rng() * 2 - 1) * 0.55;
    const altitude = 700 + rng() * 1400;
    const ring = { segment: at, x, altitude, radius: RING_RADIUS, passed: false, missed: false };
    segment.ring = ring;
    rings.push(ring);
  }

  // Clouds: fixed puffs the renderer draws with parallax, far above the ridge.
  const clouds = [];
  for (let i = 0; i < 42; i += 1) {
    clouds.push({
      x: (rng() * 2 - 1) * 3.2,
      y: 5200 + rng() * 2600,
      z: rng() * TRACK_SEGMENTS * SEGMENT_LENGTH,
      size: 260 + rng() * 420,
      drift: 12 + rng() * 22,
    });
  }

  return { segments, rings, clouds, stripY };
}

export function findSegment(track, z) {
  const wrapped = ((z % (TRACK_SEGMENTS * SEGMENT_LENGTH)) + TRACK_SEGMENTS * SEGMENT_LENGTH) % (TRACK_SEGMENTS * SEGMENT_LENGTH);
  return track.segments[Math.floor(wrapped / SEGMENT_LENGTH)];
}

export function groundAt(track, z) {
  const segment = findSegment(track, z);
  const t = (z - segment.p1.world.z) / SEGMENT_LENGTH;
  return lerp(segment.p1.world.y, segment.p2.world.y, clamp(t, 0, 1));
}

// Standard perspective projection of one world point into screen space.
export function projectPoint(point, cameraX, cameraY, cameraZ, width, height) {
  point.camera.x = point.world.x - cameraX;
  point.camera.y = point.world.y - cameraY;
  point.camera.z = point.world.z - cameraZ;
  point.screen.scale = CAMERA_DEPTH / Math.max(1, point.camera.z);
  point.screen.x = Math.round(width / 2 + (point.screen.scale * point.camera.x * width) / 2);
  point.screen.y = Math.round(height / 2 - (point.screen.scale * point.camera.y * height) / 2);
  point.screen.w = Math.round((point.screen.scale * ROAD_WIDTH * width) / 2);
}

// How many pine trees stand on this segment, and where, from a hash so the
// forest is stable without storing it.
export function treesOn(segment) {
  const count = Math.floor(hash01(segment.index, 7) * 3);
  const trees = [];
  for (let i = 0; i < count; i += 1) {
    const side = hash01(segment.index, 11 + i) > 0.5 ? 1 : -1;
    trees.push({
      offset: side * (1.08 + hash01(segment.index, 23 + i) * 0.5),
      height: 320 + hash01(segment.index, 31 + i) * 260,
      lean: hash01(segment.index, 47 + i) - 0.5,
    });
  }
  return trees;
}

export { DRAW_DISTANCE, PALETTE, WALL_HEIGHT };
