// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh flight for a fixed number of steps, steered by a
// simple autopilot (aim for the next ring, ease the throttle, descend for the
// strip), so the frame is what a short flight really looks like and the same
// seed always gives the same frame.
import { MAX_SPEED, SEGMENT_LENGTH } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE, selectMission, startFlight, stepWorld } from './world.js';
import { clamp } from './random.js';

const SAMPLE = 1 / 60;
const START_SECONDS = 6;
const PLAY_SECONDS = 24;

// A stand-in for the keyboard: the autopilot answers the same questions the
// real input answers, so stepWorld never knows the difference.
function autopilotInput(world, mode) {
  const nextRing = world.track.rings.find((ring) => !ring.passed && !ring.missed);
  const targetLateral = nextRing ? nextRing.x : 0;
  const targetAltitude = nextRing ? nextRing.altitude : 900;
  // Only start the descent once the strip is close: the valley floor still
  // rises and falls before it, and the approach must stay above stall speed.
  const stripStart = (world.track.segments.length - 36) * SEGMENT_LENGTH;
  const nearStrip = world.position > stripStart - 90 * SEGMENT_LENGTH;
  const overStrip = world.position > stripStart;
  const landing = mode === 'end' && nearStrip;

  const lateralError = targetLateral - world.lateral;
  // Over the strip, aim for the ground itself with a firm, steady descent:
  // the proportional controller alone asymptotes above the runway and the
  // rollout needs most of the strip. 0.6 pitch sinks ~-380/s, still gentle.
  const approachAltitude = overStrip ? 0 : 260;
  const altitudeError = (landing ? approachAltitude : targetAltitude) - world.altitude;
  let pitch = clamp(-altitudeError / 700, -1, 1);
  if (landing && overStrip) pitch = 0.6;
  // Slow for the approach from 90 segments out: at cruise speed the strip
  // arrives before the drag does, and a fast touchdown is no touchdown.
  const speedTarget = landing ? MAX_SPEED * 0.40 : MAX_SPEED * 0.72;
  return {
    bank: () => clamp(lateralError * 1.6, -1, 1),
    pitch: () => pitch,
    throttleUp: () => world.speed < speedTarget,
    throttleDown: () => world.speed > speedTarget * 1.08,
    airbrake: () => landing && world.speed > speedTarget * 1.05,
  };
}

// Step the world forward with the autopilot until `seconds` pass or the
// flight ends on its own.
function flyForward(world, seconds, mode) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    stepWorld(world, autopilotInput(world, mode), SAMPLE);
    if (world.screen !== SCREEN_PLAY) break;
  }
}

// Set `world` to the named scene (start, play or end; any other name is
// start) and return the screen to draw over it.
export function stageShot(name, world) {
  selectMission(world, 0);
  if (name !== 'play' && name !== 'end') {
    startFlight(world);
    flyForward(world, START_SECONDS, 'start');
    world.screen = SCREEN_TITLE;
    world.time = START_SECONDS;
    return;
  }
  startFlight(world);
  if (name === 'play') {
    flyForward(world, PLAY_SECONDS, 'play');
    if (world.screen !== SCREEN_PLAY) {
      // The autopilot pranged it — fly a shorter leg and keep the frame alive.
      startFlight(world);
      flyForward(world, 10, 'play');
    }
    if (world.screen !== SCREEN_PLAY) world.screen = SCREEN_PLAY;
    return;
  }
  // The end scene: fly the whole valley and land on the strip. The screen
  // stays whatever the flight honestly ended as — never forced to a landing.
  flyForward(world, 240, 'end');
}
