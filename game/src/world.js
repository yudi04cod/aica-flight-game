// The sortie itself: one state object, stepped forward in fixed slices.
// Title, flying, paused, crashed, landed and finished are all here, with the
// flight model — throttle, bank, pitch, stall, gusts, fuel and rings.
import {
  BANK_RATE,
  CLIMB_RATE,
  FUEL_DRAIN,
  LANDING_BONUS,
  LAND_SPEED_MAX,
  MAX_SPEED,
  MISSIONS,
  RING_FUEL_BONUS,
  RING_SCORE,
  ROAD_WIDTH,
  RUNWAY_SEGMENTS,
  SEGMENT_LENGTH,
  SINK_RATE,
  SMOOTH_BONUS,
  STALL_SPEED,
  TRACK_LENGTH,
  TRACK_SEGMENTS,
} from './config.js';
import { buildTrack, findSegment, groundAt } from './track.js';
import { clamp, wrapAngle } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CRASHED = 'crashed';
export const SCREEN_LANDED = 'landed';
export const SCREEN_DONE = 'done';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_CRASH = 2;
export const EVENT_LANDED = 4;
export const EVENT_DONE = 8;
export const EVENT_LOW_FUEL = 16;

export function createWorld(seed) {
  const world = {
    seed,
    screen: SCREEN_TITLE,
    missionIndex: 0,
    mission: MISSIONS[0],
    track: null,
    // Flight state, all in world units except where named.
    position: 0, // distance along the valley
    lateral: 0, // -1 .. 1 across the valley floor
    altitude: 0, // height above the ground below
    speed: 0,
    throttle: 0.55,
    bank: 0,
    pitch: 0,
    heading: 42,
    verticalSpeed: 0,
    fuel: 100,
    score: 0,
    ringsHit: 0,
    time: 0,
    timeLeft: 0,
    message: '',
    messageUntil: 0,
    warnedLowFuel: false,
    landedSmooth: false,
    best: 0,
    gust: 0,
    gustTimer: 0,
    flash: 0,
  };
  world.track = buildTrack(world.mission, seed);
  return world;
}

export function selectMission(world, index) {
  world.missionIndex = index;
  world.mission = MISSIONS[index];
  world.track = buildTrack(world.mission, world.seed);
  resetFlight(world);
}

export function resetFlight(world) {
  world.position = 0;
  world.lateral = 0;
  world.altitude = 1200;
  world.speed = MAX_SPEED * 0.45;
  world.throttle = 0.55;
  world.bank = 0;
  world.pitch = 0;
  world.heading = 42;
  world.verticalSpeed = 0;
  world.fuel = world.mission.fuel;
  world.score = 0;
  world.ringsHit = 0;
  world.time = 0;
  world.timeLeft = world.mission.timeLimit;
  world.message = '';
  world.messageUntil = 0;
  world.warnedLowFuel = false;
  world.landedSmooth = false;
  world.gust = 0;
  world.gustTimer = 0;
  for (const ring of world.track.rings) {
    ring.passed = false;
    ring.missed = false;
  }
}

export function startFlight(world) {
  resetFlight(world);
  world.screen = SCREEN_PLAY;
}

function showMessage(world, text, seconds) {
  world.message = text;
  world.messageUntil = world.time + seconds;
}

function finishSortie(world, landed) {
  world.verticalSpeed = 0;
  if (world.mission.mustLand && !landed) {
    world.screen = SCREEN_DONE;
    showMessage(world, 'OVERSHOT — the strip is behind you', 4);
    return EVENT_DONE;
  }
  world.screen = landed ? SCREEN_LANDED : SCREEN_DONE;
  if (landed) {
    world.score += LANDING_BONUS;
    if (world.landedSmooth) world.score += SMOOTH_BONUS;
  }
  if (world.score > world.best) world.best = world.score;
  return landed ? EVENT_LANDED : EVENT_DONE;
}

// One fixed physics slice. Returns an event bitmask for sounds and screens.
export function stepWorld(world, input, dt) {
  if (world.screen !== SCREEN_PLAY) return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;
  if (world.mission.timeLimit > 0) {
    world.timeLeft -= dt;
    if (world.timeLeft <= 0) {
      world.timeLeft = 0;
      return finishSortie(world, false) | EVENT_DONE;
    }
  }

  // Storm gusts: a slow crosswind that shoves the plane sideways.
  if (world.mission.gusts) {
    world.gustTimer -= dt;
    if (world.gustTimer <= 0) {
      world.gustTimer = 1.6 + Math.random() * 2.2;
      world.gust = (Math.random() * 2 - 1) * 0.55;
    }
  } else {
    world.gust = 0;
  }

  // Throttle, eased toward the lever; the airbrake drags hard.
  if (input.throttleUp()) world.throttle = clamp(world.throttle + dt * 0.7, 0, 1);
  if (input.throttleDown()) world.throttle = clamp(world.throttle - dt * 0.7, 0, 1);
  const targetSpeed = world.fuel > 0 ? world.throttle * MAX_SPEED : 0;
  const drag = input.airbrake() ? 3.2 : 0.55;
  world.speed += (targetSpeed - world.speed) * Math.min(1, drag * dt);
  if (input.airbrake()) world.speed = Math.max(0, world.speed - 1400 * dt);

  const speedRatio = world.speed / MAX_SPEED;
  const stalled = world.speed < STALL_SPEED;

  // Bank: the stick steers, the wings follow, the nose follows the bank.
  const bankInput = input.bank();
  world.bank += (bankInput - world.bank) * Math.min(1, 6 * dt);
  const curve = findSegment(world.track, world.position).curve;
  const centrifugal = -curve * speedRatio * 0.22;
  world.lateral += (world.bank * BANK_RATE * speedRatio + world.gust * 0.35 + centrifugal) * dt;
  world.lateral = clamp(world.lateral, -1.25, 1.25);
  world.heading = wrapAngle(world.heading + world.bank * speedRatio * 34 * dt + curve * speedRatio * 6 * dt);

  // Pitch: climb needs airspeed; without it the nose drops and she sinks.
  const pitchInput = input.pitch();
  world.pitch += (pitchInput - world.pitch) * Math.min(1, 5 * dt);
  const climbAuthority = stalled ? 0.25 : 1;
  world.verticalSpeed = -world.pitch * CLIMB_RATE * speedRatio * climbAuthority;
  if (stalled || world.fuel <= 0) world.verticalSpeed -= SINK_RATE * (stalled ? 1 : 0.6);
  world.altitude += world.verticalSpeed * dt;
  world.position += world.speed * dt;

  // Fuel: throttle burns it, rings top it up.
  if (world.fuel > 0) {
    world.fuel = Math.max(0, world.fuel - FUEL_DRAIN * (0.35 + world.throttle) * dt);
    if (world.fuel < 20 && !world.warnedLowFuel) {
      world.warnedLowFuel = true;
      showMessage(world, 'LOW FUEL — find a ring', 3);
      events |= EVENT_LOW_FUEL;
    }
  }

  // Rings: crossed this slice, close enough in both axes, and it is ours.
  for (const ring of world.track.rings) {
    const ringZ = ring.segment * SEGMENT_LENGTH;
    if (ring.passed || ring.missed) continue;
    if (world.position < ringZ) continue;
    const lateralGap = Math.abs(world.lateral - ring.x) * ROAD_WIDTH;
    const verticalGap = Math.abs(world.altitude - ring.altitude);
    if (lateralGap < ring.radius && verticalGap < ring.radius) {
      ring.passed = true;
      world.ringsHit += 1;
      world.score += RING_SCORE;
      world.fuel = Math.min(100, world.fuel + RING_FUEL_BONUS);
      showMessage(world, `RING ${world.ringsHit}/${world.track.rings.length}  +${RING_SCORE}`, 1.6);
      events |= EVENT_RING;
    } else {
      ring.missed = true;
    }
  }

  // The ground: touch it gently on the strip and slow, and it is a landing.
  // Anywhere else, or too fast, or banked over, and it is a crash.
  if (world.altitude <= 0) {
    const segment = findSegment(world.track, world.position);
    const onStrip = segment.runway && Math.abs(world.lateral) < 0.28;
    const gentle = world.verticalSpeed > -520 && world.speed < LAND_SPEED_MAX && Math.abs(world.bank) < 0.3;
    world.altitude = 0;
    if (onStrip && gentle) {
      world.landedSmooth = world.verticalSpeed > -260;
      // Cut the engine and brake: the rollout only ends when she is slow.
      world.throttle = 0;
      world.speed = Math.max(0, world.speed - 2600 * dt);
      if (world.speed < 420) return finishSortie(world, true);
      return events;
    }
    world.verticalSpeed = 0;
    world.screen = SCREEN_CRASHED;
    if (world.score > world.best) world.best = world.score;
    return events | EVENT_CRASH;
  }

  // Valley walls: stray past the edge and the rock takes you.
  if (Math.abs(world.lateral) > 1.15) {
    world.verticalSpeed = 0;
    world.screen = SCREEN_CRASHED;
    if (world.score > world.best) world.best = world.score;
    return events | EVENT_CRASH;
  }

  // End of the valley: the strip runs almost to the last segment, so the
  // check sits near the very end and a landing has the whole strip to use.
  if (world.position >= TRACK_LENGTH - 2 * SEGMENT_LENGTH) {
    const segment = findSegment(world.track, world.position);
    if (segment.runway && world.altitude < 60 && world.speed < LAND_SPEED_MAX) {
      return finishSortie(world, true);
    }
    return finishSortie(world, false);
  }

  if (world.time > world.messageUntil) world.message = '';
  world.flash = Math.max(0, world.flash - dt);
  return events;
}

export function groundHeightAt(world) {
  return groundAt(world.track, world.position);
}

export function segmentIndexAt(world) {
  return Math.floor(world.position / SEGMENT_LENGTH) % TRACK_SEGMENTS;
}
