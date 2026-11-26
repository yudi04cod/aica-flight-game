// Kestrel Ridge Run — tuning constants, palettes and mission definitions.
// Everything the other modules agree on lives here, so a balance change is
// one edit and the whole game still agrees with itself.
export const VIEW = { width: 1280, height: 800 };
export const SEGMENT_LENGTH = 200;
export const ROAD_WIDTH = 2400; // half-width of the valley floor, world units
export const CAMERA_DEPTH = 0.84; // 1 / tan(fieldOfView / 2)
export const CAMERA_HEIGHT = 1350; // camera sits this far above the plane
export const DRAW_DISTANCE = 160;
export const TRACK_SEGMENTS = 1200;
export const TRACK_LENGTH = TRACK_SEGMENTS * SEGMENT_LENGTH;
export const RUNWAY_SEGMENTS = 36; // flat asphalt strip at the end of the valley
export const MAX_SPEED = 6200; // world units per second at full throttle
export const STALL_SPEED = 2100; // below this the wings stop flying
export const LAND_SPEED_MAX = 2700; // fastest touchdown that still counts
export const CLIMB_RATE = 1500; // world units per second of climb at full pitch
export const SINK_RATE = 430; // sink per second when stalled or out of fuel
export const BANK_RATE = 1.9; // lateral road-widths per second at full bank
export const FUEL_DRAIN = 0.85; // fuel per second at full throttle
export const RING_FUEL_BONUS = 12;
export const RING_SCORE = 100;
export const LANDING_BONUS = 250;
export const SMOOTH_BONUS = 100; // extra for a gentle touchdown
export const WALL_HEIGHT = 900; // how high the valley walls rise
export const RING_RADIUS = 620; // world units; a generous hoop to thread

// The valley floor alternates these two greens, the walls these two rocks.
export const PALETTE = {
  skyTop: '#2f5d8f',
  skyMid: '#7fa8c9',
  skyLow: '#f2c98a',
  sun: '#ffe9b0',
  groundA: '#5d8a4a',
  groundB: '#547e44',
  rockA: '#8a7a68',
  rockB: '#7d6e5e',
  snow: '#e8eef2',
  tree: '#2e5d33',
  treeDark: '#24492a',
  trunk: '#5a4632',
  runway: '#3a3f45',
  runwayLine: '#f4f1e6',
  ring: '#ffc93c',
  ringPassed: '#7ee787',
  ringMissed: '#8b949e',
};

// Three sorties over the same valley, each with a different goal.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread all 12 gold rings, then put her down on the strip.',
    rings: 12,
    fuel: 100,
    timeLimit: 0,
    gusts: false,
    mustLand: false,
  },
  {
    id: 'delivery',
    name: 'Ridge Delivery',
    blurb: 'Six rings, tight fuel — the strip is the mission. Land it.',
    rings: 6,
    fuel: 68,
    timeLimit: 0,
    gusts: false,
    mustLand: true,
  },
  {
    id: 'storm',
    name: 'Storm Dash',
    blurb: '90 seconds, crosswind gusts, rings buy you time. Go.',
    rings: 8,
    fuel: 100,
    timeLimit: 90,
    gusts: true,
    mustLand: false,
  },
];

export function knots(speed) {
  return Math.round(speed / 20);
}

export function feet(altitude) {
  return Math.max(0, Math.round(altitude));
}

export function headingDegrees(heading) {
  return ((Math.round(heading) % 360) + 360) % 360;
}
