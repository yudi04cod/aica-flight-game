# Kestrel Ridge Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?ref=38m33ybw)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/yudi04cod/aica-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?ref=38m33ybw)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/yudi04cod/aica-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?ref=38m33ybw)

**Kestrel Ridge Run** is an original bush-plane flight game for the
[make.fun](https://make.fun/bounty/best-flight-game-20261126-0057?ref=38m33ybw)
"Make the best flight game" bounty. Fly the Kestrel-9 through the Meridian
valley in a chase view over recognisable mountain terrain: thread the gold
rings, watch your fuel, mind the ridge walls, and put her down on the strip
at the valley's end.

## How to play

- Open `game/index.html` in a desktop browser, or run `node serve.ts` and
  open http://localhost:8080.
- On the title screen pick a mission with keys **1–3** (or click it), then
  press **Enter** or click to fly.
- **← →** (or **A / D**) bank and turn · **↑ ↓** climb and descend ·
  **W / S** throttle · **Space** airbrake · the mouse steers too.
- **P** pause · **R** restart · **M** mute · **T** back to the title screen.

## The three sorties

1. **Ring Run** — thread all 12 gold rings, then land on the strip.
   Rings pay 100 points and 12% fuel.
2. **Ridge Delivery** — six rings and tight fuel. The strip is the mission:
   fly past it and the sortie is over.
3. **Storm Dash** — 90 seconds, crosswind gusts shove you sideways, rings
   are the only way to stay ahead of the clock.

A landing counts when you touch the strip slow, level and gently — a smooth
touchdown earns a bonus. Too low, too slow, or too far past the valley wall
and the ridge wins. Below stall speed the wings stop flying and she sinks;
out of fuel she glides, so plan the rings.

## The instruments

Airspeed and altitude top the screen with a vertical-speed readout, a
heading compass tape across the top, an artificial horizon, and fuel and
throttle gauges — all lit, all live. Your plane's shadow on the valley floor
is the honest altitude gauge.

## Tech

Vanilla JavaScript on one canvas, static files only, zero network requests.
Sounds are synthesised live with WebAudio (engine drone, wind, ring chimes,
touchdown, crash). Source is split by job: `game/src/config.js` (tuning),
`game/src/track.js` (the valley), `game/src/world.js` (flight model),
`game/src/render.js` (the scene), `game/src/plane.js` (the Kestrel-9),
`game/src/hud.js` (instruments and screens), `game/src/audio.js` (synth),
`game/src/input.js` (keyboard and mouse), `game/src/shots.js`
(screenshot scenes) and `game/src/main.js` (boot and loop).
