// Everything the pilot sees: dawn sky, sun, drifting clouds, two ranges of
// far mountains, then the valley floor segment by segment, far to near, with
// pines, gold rings and the strip at the end. The plane and HUD are drawn
// over it by main.js and hud.js.
import {
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  DRAW_DISTANCE,
  MAX_SPEED,
  PALETTE,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  TRACK_SEGMENTS,
  VIEW,
  WALL_HEIGHT,
} from './config.js';
import { findSegment, groundAt, projectPoint, treesOn } from './track.js';
import { clamp, lerp } from './random.js';
import { drawPlane, drawPlaneShadow } from './plane.js';

const TRACK_LENGTH = TRACK_SEGMENTS * SEGMENT_LENGTH;

function drawSky(ctx, width, height, heading, time) {
  // The gradient ends at the projection horizon (half the canvas height),
  // where the far terrain begins — no bare band of sky below the mountains.
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.5);
  // Low sun, fixed to the heading so turning swings it across the sky.
  const sunX = width * 0.5 + Math.sin((heading * Math.PI) / 180) * width * 0.32;
  const sunY = height * 0.3 + Math.sin(time * 0.05) * 4;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  glow.addColorStop(0, 'rgba(255,233,176,0.95)');
  glow.addColorStop(0.25, 'rgba(255,220,150,0.45)');
  glow.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountainRange(ctx, width, height, horizonY, offset, colour, base, jag) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  const step = width / 26;
  for (let x = 0; x <= width; x += step) {
    const n = Math.sin((x + offset) * 0.004 + jag) * 0.5 + Math.sin((x + offset) * 0.011 + jag * 2) * 0.5;
    ctx.lineTo(x, horizonY - base - n * base * 0.55);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(ctx, cloud, width, height, heading, time) {
  // Clouds sit far away: their screen x slides with the heading only.
  const drift = ((cloud.z * 0.02 + time * cloud.drift) % 2600) - 1300;
  const x = width / 2 + (cloud.x * width * 0.16 + drift * 0.22 - Math.sin((heading * Math.PI) / 180) * width * 0.2);
  const y = height * 0.12 + (cloud.y - 5200) / 7800 * height * 0.2;
  const s = cloud.size / 700;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y, 90 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 46 * s, y + 6 * s, 52 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 48 * s, y + 7 * s, 56 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx, x, baseY, height, lean, dark) {
  ctx.fillStyle = dark ? PALETTE.treeDark : PALETTE.tree;
  const w = height * 0.42;
  ctx.beginPath();
  ctx.moveTo(x + lean * height * 0.1, baseY - height);
  ctx.lineTo(x - w / 2, baseY - height * 0.45);
  ctx.lineTo(x - w * 0.28, baseY - height * 0.45);
  ctx.lineTo(x - w * 0.62, baseY);
  ctx.lineTo(x + w * 0.62, baseY);
  ctx.lineTo(x + w * 0.28, baseY - height * 0.45);
  ctx.lineTo(x + w / 2, baseY - height * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.trunk;
  ctx.fillRect(x - height * 0.03, baseY - height * 0.06, height * 0.06, height * 0.06);
}

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawRing(ctx, ring, segment, width, height, cameraY, time) {
  const p = segment.p1;
  const scale = p.screen.scale;
  const centreX = p.screen.x + ring.x * p.screen.w;
  const ringWorldY = segment.p1.world.y + ring.altitude;
  const centreY = height / 2 - (scale * (ringWorldY - cameraY) * height) / 2;
  const radius = Math.max(4, ring.radius * scale * (width / 2));
  if (centreY < -radius || centreY > height + radius) return;
  const pulse = 1 + Math.sin(time * 3 + ring.segment) * 0.04;
  const colour = ring.passed ? PALETTE.ringPassed : ring.missed ? PALETTE.ringMissed : PALETTE.ring;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(3, radius * 0.16);
  ctx.shadowColor = colour;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(centreX, centreY, radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, radius * 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(centreX, centreY, radius * pulse * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRunwayMarkings(ctx, segment, width, height) {
  const p1 = segment.p1;
  const p2 = segment.p2;
  // Asphalt strip: narrower than the valley floor, centred on the corridor.
  const half1 = p1.screen.w * 0.3;
  const half2 = p2.screen.w * 0.3;
  ctx.fillStyle = PALETTE.runway;
  polygon(ctx, [
    [p1.screen.x - half1, p1.screen.y],
    [p1.screen.x + half1, p1.screen.y],
    [p2.screen.x + half2, p2.screen.y],
    [p2.screen.x - half2, p2.screen.y],
  ]);
  // Centreline dashes on every other segment.
  if (segment.index % 2 === 0) {
    const dashHalf1 = p1.screen.w * 0.02;
    const dashHalf2 = p2.screen.w * 0.02;
    ctx.fillStyle = PALETTE.runwayLine;
    polygon(ctx, [
      [p1.screen.x - dashHalf1, p1.screen.y],
      [p1.screen.x + dashHalf1, p1.screen.y],
      [p2.screen.x + dashHalf2, p2.screen.y],
      [p2.screen.x - dashHalf2, p2.screen.y],
    ]);
  }
  // Threshold bars on the first runway segment.
  if (segment.index % TRACK_SEGMENTS === TRACK_SEGMENTS - 36) {
    ctx.fillStyle = PALETTE.runwayLine;
    for (let i = -2; i <= 2; i += 1) {
      const barHalf = p1.screen.w * 0.035;
      const cx = p1.screen.x + i * p1.screen.w * 0.11;
      polygon(ctx, [
        [cx - barHalf, p1.screen.y],
        [cx + barHalf, p1.screen.y],
        [cx + barHalf * 0.9, p1.screen.y - 4],
        [cx - barHalf * 0.9, p1.screen.y - 4],
      ]);
    }
  }
  // Edge lights, glowing amber, on the strip's shoulders.
  const glow = Math.sin(Date.now() / 300) > 0 ? 1 : 0.55;
  ctx.fillStyle = `rgba(255,190,80,${glow})`;
  ctx.beginPath();
  ctx.arc(p1.screen.x - half1 - 4, p1.screen.y - 2, 3, 0, Math.PI * 2);
  ctx.arc(p1.screen.x + half1 + 4, p1.screen.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Render one frame of the world. `world` carries flight state; `time` is the
// wall clock for animation; `shotMode` freezes the world for screenshots.
export function renderWorld(ctx, world, width, height, time) {
  const track = world.track;
  const playerSegment = findSegment(track, world.position);
  const playerPercent = (world.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const playerY = lerp(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
  const cameraY = playerY + world.altitude + CAMERA_HEIGHT;
  const horizonY = height * 0.5;

  drawSky(ctx, width, height, world.heading, time);
  // Distant ground: the valley floor and walls never cover the whole width
  // at the horizon, so the lower half gets a base tone first — never void.
  ctx.fillStyle = '#46543f';
  ctx.fillRect(0, horizonY, width, height - horizonY);
  const mountainOffset = world.heading * 6 + world.position * 0.004;
  drawMountainRange(ctx, width, height, horizonY + 6, mountainOffset * 0.5, 'rgba(96,110,140,0.85)', 150, 1.3);
  drawMountainRange(ctx, width, height, horizonY + 10, mountainOffset, 'rgba(70,84,110,0.95)', 92, 4.1);
  for (const cloud of track.clouds) drawCloud(ctx, cloud, width, height, world.heading, time);

  // Project the visible ribbon, far to near, clipping each segment against
  // the highest ground already drawn so hills hide what is behind them.
  const baseSegment = findSegment(track, world.position);
  const basePercent = (world.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  let maxY = height;
  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  const playerX = world.lateral * ROAD_WIDTH;

  for (let n = 0; n < DRAW_DISTANCE; n += 1) {
    const segment = track.segments[(baseSegment.index + n) % TRACK_SEGMENTS];
    segment.looped = segment.index < baseSegment.index;
    segment.clip = maxY;
    const zOffset = segment.looped ? TRACK_LENGTH : 0;
    projectPoint(segment.p1, playerX - x, cameraY, world.position - zOffset, width, height);
    projectPoint(segment.p2, playerX - x - dx, cameraY, world.position - zOffset, width, height);
    x += dx;
    dx += segment.curve;

    if (
      segment.p1.camera.z <= CAMERA_DEPTH ||
      segment.p2.screen.y >= segment.p1.screen.y ||
      segment.p2.screen.y >= maxY
    ) {
      continue;
    }

    renderSegment(ctx, segment, width, height, cameraY, time);
    maxY = segment.p1.screen.y;
  }

  // The plane's shadow on the ground below, then the plane herself.
  const groundPoint = {
    world: { x: playerX, y: playerY, z: world.position + 400 },
    camera: {},
    screen: {},
  };
  projectPoint(groundPoint, playerX, cameraY, world.position, width, height);
  const planeScreenX = width / 2 + world.lateral * 26 - world.bank * 30;
  const planeScreenY = height * 0.66;
  const shadowScale = clamp(1 - world.altitude / 6000, 0.15, 1);
  if (groundPoint.screen.y > horizonY && groundPoint.screen.y < height) {
    drawPlaneShadow(ctx, groundPoint.screen.x, groundPoint.screen.y, 1.1, world.altitude);
  }
  const size = 150 + world.speed / MAX_SPEED * 26;
  drawPlane(ctx, planeScreenX, planeScreenY, size, world.bank, world.pitch, time, world.speed / 6200);
}

function renderSegment(ctx, segment, width, height, cameraY, time) {
  const p1 = segment.p1;
  const p2 = segment.p2;
  const shade = segment.index % 2 === 0;
  const wallRise1 = WALL_HEIGHT * p1.screen.scale * (height / 2);
  const wallRise2 = WALL_HEIGHT * p2.screen.scale * (height / 2);

  // Valley walls, left and right, rising off the floor's edges.
  ctx.fillStyle = shade ? PALETTE.rockA : PALETTE.rockB;
  polygon(ctx, [
    [p1.screen.x - p1.screen.w, p1.screen.y],
    [p1.screen.x - p1.screen.w * 1.55, p1.screen.y - wallRise1],
    [p2.screen.x - p2.screen.w * 1.55, p2.screen.y - wallRise2],
    [p2.screen.x - p2.screen.w, p2.screen.y],
  ]);
  polygon(ctx, [
    [p1.screen.x + p1.screen.w, p1.screen.y],
    [p1.screen.x + p1.screen.w * 1.55, p1.screen.y - wallRise1],
    [p2.screen.x + p2.screen.w * 1.55, p2.screen.y - wallRise2],
    [p2.screen.x + p2.screen.w, p2.screen.y],
  ]);
  // Snow caps on the wall tops, high segments only.
  if (p1.world.y > 3400) {
    ctx.fillStyle = PALETTE.snow;
    polygon(ctx, [
      [p1.screen.x - p1.screen.w * 1.55, p1.screen.y - wallRise1],
      [p1.screen.x - p1.screen.w * 1.32, p1.screen.y - wallRise1 * 0.72],
      [p2.screen.x - p2.screen.w * 1.32, p2.screen.y - wallRise2 * 0.72],
      [p2.screen.x - p2.screen.w * 1.55, p2.screen.y - wallRise2],
    ]);
    polygon(ctx, [
      [p1.screen.x + p1.screen.w * 1.55, p1.screen.y - wallRise1],
      [p1.screen.x + p1.screen.w * 1.32, p1.screen.y - wallRise1 * 0.72],
      [p2.screen.x + p2.screen.w * 1.32, p2.screen.y - wallRise2 * 0.72],
      [p2.screen.x + p2.screen.w * 1.55, p2.screen.y - wallRise2],
    ]);
  }

  // Valley floor.
  ctx.fillStyle = shade ? PALETTE.groundA : PALETTE.groundB;
  polygon(ctx, [
    [p1.screen.x - p1.screen.w, p1.screen.y],
    [p1.screen.x + p1.screen.w, p1.screen.y],
    [p2.screen.x + p2.screen.w, p2.screen.y],
    [p2.screen.x - p2.screen.w, p2.screen.y],
  ]);

  if (segment.runway) {
    drawRunwayMarkings(ctx, segment, width, height);
  }

  // Pines along the floor's edges.
  for (const tree of treesOn(segment)) {
    const treeX = p1.screen.x + tree.offset * p1.screen.w;
    const treeH = tree.height * p1.screen.scale * (height / 2);
    if (treeH < 3 || p1.screen.y > segment.clip + 4) continue;
    drawPine(ctx, treeX, p1.screen.y, treeH, tree.lean, segment.index % 3 === 0);
  }

  // The gold ring, if this segment holds one.
  if (segment.ring) {
    drawRing(ctx, segment.ring, segment, width, height, cameraY, time);
  }
}

export { VIEW, groundAt };
