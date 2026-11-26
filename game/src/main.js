// Kestrel Ridge Run — boot and frame loop. One canvas, one loop: read the
// input, step the world in fixed slices, render the scene, draw the HUD.
// ?shot=start|play|end stages a deterministic scene instead, for screenshots.
import { VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createWorld, selectMission, startFlight, stepWorld, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { renderWorld } from './render.js';
import { drawScreen } from './hud.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(20261126);
const STEP = 1 / 60;
const SHOT = new URLSearchParams(window.location.search).get('shot');

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function announce(text) {
  statusLine.textContent = text;
}

function handleMenuKeys() {
  const missionKey = input.consumeAny(['Digit1', 'Digit2', 'Digit3']);
  if (missionKey) {
    selectMission(world, Number(missionKey.slice(-1)) - 1);
    audio.click();
    return;
  }
  if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter') || input.mouseClicked()) {
    input.consume('Enter');
    input.consume('NumpadEnter');
    audio.start();
    audio.click();
    startFlight(world);
    announce('Flying. Thread the gold rings, mind the fuel, land on the strip.');
  }
}

function handlePlayKeys() {
  if (input.wasPressed('KeyP')) {
    input.consume('KeyP');
    if (world.screen === SCREEN_PLAY) world.screen = SCREEN_PAUSED;
    else if (world.screen === SCREEN_PAUSED) world.screen = SCREEN_PLAY;
    audio.click();
    return;
  }
  if (input.wasPressed('KeyM')) {
    input.consume('KeyM');
    audio.toggleMute();
    return;
  }
  if (input.wasPressed('KeyR')) {
    input.consume('KeyR');
    startFlight(world);
    return;
  }
  if (world.screen !== SCREEN_PLAY) {
    if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter') || input.mouseClicked()) {
      input.consume('Enter');
      input.consume('NumpadEnter');
      startFlight(world);
    }
    if (input.wasPressed('KeyT')) {
      input.consume('KeyT');
      world.screen = SCREEN_TITLE;
    }
  }
}

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const width = canvas.width;
  const height = canvas.height;
  const seconds = now / 1000;

  if (SHOT) {
    // Screenshot mode: the world is already staged; render it once, still.
    // The fixed time keeps the title's blinking prompt visible in the frame.
    renderWorld(ctx, world, width, height, 13.0);
    drawScreen(ctx, world, width, height, 13.0);
  } else {
    if (world.screen === SCREEN_TITLE) handleMenuKeys();
    else handlePlayKeys();
    if (world.screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepWorld(world, input, STEP);
        accumulator -= STEP;
        if (world.screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
      audio.update(world.throttle, world.speed / 6200, world.altitude > 0);
    }
    renderWorld(ctx, world, width, height, seconds);
    drawScreen(ctx, world, width, height, seconds);
  }
  requestAnimationFrame(frame);
}

resize();
window.addEventListener('resize', resize);
if (SHOT) {
  stageShot(SHOT, world);
  resize();
}
announce('Kestrel Ridge Run. A bush-plane sortie over the Meridian valley.');
requestAnimationFrame(frame);

// Exposed for headless play-tests: the live world, nothing else.
window.__kestrel = { world, startFlight, selectMission };
