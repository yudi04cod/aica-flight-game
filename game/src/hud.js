// The instruments and the screens: airspeed, altitude, heading tape, fuel,
// throttle, the artificial horizon, and the title / pause / crash / landed
// panels. Everything is drawn on the canvas so the screenshots show it all.
import { MISSIONS, feet, headingDegrees, knots } from './config.js';
import { SCREEN_CRASHED, SCREEN_DONE, SCREEN_LANDED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function panel(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(10,18,26,${alpha || 0.62})`;
  ctx.strokeStyle = 'rgba(140,220,255,0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bigNumber(ctx, x, y, value, unit, label) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(value), x, y);
  ctx.fillStyle = '#9fd8ef';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(unit, x, y + 22);
  ctx.fillStyle = '#7fb3cc';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(label, x, y - 34);
  ctx.restore();
}

function drawCompass(ctx, width, heading) {
  const cx = width / 2;
  const y = 30;
  ctx.save();
  panel(ctx, cx - 190, 12, 380, 52, 0.55);
  ctx.beginPath();
  ctx.rect(cx - 184, 16, 368, 44);
  ctx.clip();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  const points = [
    [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
    [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
  ];
  for (let d = -360; d <= 720; d += 15) {
    const diff = ((d - heading + 540) % 360) - 180;
    const x = cx + diff * 2.1;
    if (x < cx - 200 || x > cx + 200) continue;
    const isCardinal = points.some(([deg]) => deg === ((d % 360) + 360) % 360);
    const label = points.find(([deg]) => deg === ((d % 360) + 360) % 360);
    ctx.fillStyle = isCardinal ? '#ffd166' : '#9fd8ef';
    ctx.fillText(label ? label[1] : String(((d % 360) + 360) % 360), x, y + 8);
    ctx.fillRect(x - 1, y + 16, 2, isCardinal ? 10 : 6);
  }
  ctx.restore();
  // Centre caret.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(cx, 66);
  ctx.lineTo(cx - 7, 56);
  ctx.lineTo(cx + 7, 56);
  ctx.closePath();
  ctx.fill();
}

function drawArtificialHorizon(ctx, x, y, radius, bank, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(bank * 0.55);
  ctx.translate(0, pitch * radius * 0.35);
  ctx.fillStyle = '#4a90c2';
  ctx.fillRect(-radius, -radius * 2, radius * 2, radius * 2);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-radius, 0, radius * 2, radius * 2);
  ctx.fillStyle = '#f4f1e6';
  ctx.fillRect(-radius, -2, radius * 2, 4);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings: the plane symbol never rolls.
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - radius - 4, y - 2, 16, 4);
  ctx.fillRect(x + radius - 12, y - 2, 16, 4);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFuelAndThrottle(ctx, x, y, fuel, throttle, speedRatio) {
  panel(ctx, x, y, 250, 96, 0.62);
  ctx.save();
  ctx.fillStyle = '#7fb3cc';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', x + 14, y + 24);
  ctx.fillText('THROTTLE', x + 14, y + 62);
  // Fuel bar: green to amber to flashing red.
  const fuelW = 150 * Math.max(0, fuel / 100);
  ctx.fillStyle = '#22303c';
  ctx.fillRect(x + 86, y + 12, 150, 16);
  ctx.fillStyle = fuel < 20 ? (Math.sin(Date.now() / 160) > 0 ? '#ff5a4d' : '#ff8a7a') : fuel < 45 ? '#ffb347' : '#7ee787';
  ctx.fillRect(x + 86, y + 12, fuelW, 16);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${Math.round(fuel)}%`, x + 86, y + 24 + 0);
  ctx.fillStyle = '#22303c';
  ctx.fillRect(x + 86, y + 50, 150, 16);
  ctx.fillStyle = '#4dc3ff';
  ctx.fillRect(x + 86, y + 50, 150 * throttle, 16);
  ctx.fillStyle = '#eaf6ff';
  ctx.fillText(`${Math.round(throttle * 100)}%`, x + 86, y + 62);
  ctx.restore();
}

function drawHud(ctx, world, width, height) {
  // Top-left: airspeed. Top-right: altitude. Top-centre: heading tape.
  panel(ctx, 16, 12, 170, 96, 0.62);
  bigNumber(ctx, 101, 62, knots(world.speed), 'KT', 'AIRSPEED');
  panel(ctx, width - 186, 12, 170, 96, 0.62);
  bigNumber(ctx, width - 101, 62, feet(world.altitude), 'FT', 'ALTITUDE');
  const vs = Math.round(world.verticalSpeed * 3);
  ctx.save();
  ctx.fillStyle = vs > 60 ? '#7ee787' : vs < -60 ? '#ff8a7a' : '#9fd8ef';
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(vs > 60 ? `▲ +${vs} FPM` : vs < -60 ? `▼ ${vs} FPM` : '— LEVEL —', width - 101, 100);
  ctx.restore();
  drawCompass(ctx, width, headingDegrees(world.heading));

  // Bottom-left: fuel and throttle. Bottom-centre: artificial horizon.
  drawFuelAndThrottle(ctx, 16, height - 116, world.fuel, world.throttle, world.speed / 6200);
  drawArtificialHorizon(ctx, width / 2, height - 62, 44, world.bank, world.pitch);

  // Bottom-right: mission, score and rings.
  panel(ctx, width - 266, height - 116, 250, 96, 0.62);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7fb3cc';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(world.mission.name.toUpperCase(), width - 252, height - 92);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, width - 252, height - 62);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`◉ RINGS ${world.ringsHit}/${world.track.rings.length}`, width - 252, height - 34);
  if (world.mission.timeLimit > 0) {
    ctx.fillStyle = world.timeLeft < 15 ? '#ff8a7a' : '#eaf6ff';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(world.timeLeft)}s`, width - 72, height - 62);
  }
  ctx.restore();

  // Centre message line.
  if (world.message) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(10,18,26,0.6)';
    const w = ctx.measureText(world.message).width + 36;
    roundRect(ctx, width / 2 - w / 2, height * 0.2 - 26, w, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillText(world.message, width / 2, height * 0.2 + 8);
    ctx.restore();
  }

  // Stall and gust warnings.
  if (world.speed < 2100 && world.screen === SCREEN_PLAY) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.sin(Date.now() / 150) > 0 ? '#ff5a4d' : '#ffb3ab';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('⚠ STALL — ADD THROTTLE', width / 2, height * 0.3);
    ctx.restore();
  }
  if (world.mission.gusts && Math.abs(world.gust) > 0.3 && world.screen === SCREEN_PLAY) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fd8ef';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(world.gust > 0 ? 'GUST → PUSHING RIGHT' : '← GUST PUSHING LEFT', width / 2, height * 0.34);
    ctx.restore();
  }
}

function drawTitle(ctx, world, width, height, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,16,24,0.45)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('KESTREL RIDGE RUN', width / 2, 150);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A bush-plane sortie over the Meridian valley', width / 2, 190);
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#9fd8ef';
  ctx.fillText('Thread the gold rings. Mind the fuel. Put her down on the strip.', width / 2, 218);

  MISSIONS.forEach((mission, index) => {
    const y = 280 + index * 92;
    const selected = world.missionIndex === index;
    ctx.save();
    ctx.fillStyle = selected ? 'rgba(255,209,102,0.18)' : 'rgba(10,18,26,0.62)';
    ctx.strokeStyle = selected ? '#ffd166' : 'rgba(140,220,255,0.4)';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    roundRect(ctx, width / 2 - 330, y, 660, 76, 12);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${index + 1} · ${mission.name}`, width / 2 - 308, y + 32);
    ctx.fillStyle = '#eaf6ff';
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(mission.blurb, width / 2 - 308, y + 58);
    ctx.restore();
  });

  const blink = Math.sin(time * 3.5) > -0.2;
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press ENTER or click to fly — keys 1–3 pick a mission', width / 2, 590);
  }
  ctx.fillStyle = '#9fd8ef';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('← → bank · ↑ ↓ climb / descend · W / S throttle · Space airbrake · mouse steers too', width / 2, 640);
  ctx.fillText('P pause · R restart · M mute', width / 2, 668);
  if (world.best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Best score this session: ${world.best}`, width / 2, 712);
  }
  ctx.restore();
}

function drawEndPanel(ctx, world, width, height, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,16,24,0.55)';
  ctx.fillRect(0, 0, width, height);
  panel(ctx, width / 2 - 320, height / 2 - 170, 640, 340, 0.85);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(title, width / 2, height / 2 - 104);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 - 52 + i * 34));
  ctx.fillStyle = '#9fd8ef';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press ENTER to fly again · R restarts · T returns to the title', width / 2, height / 2 + 128);
  ctx.restore();
}

export function drawScreen(ctx, world, width, height, time) {
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world, width, height, time);
    return;
  }
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED) {
    drawHud(ctx, world, width, height);
    if (world.screen === SCREEN_PAUSED) {
      ctx.save();
      ctx.fillStyle = 'rgba(8,16,24,0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eaf6ff';
      ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('PAUSED', width / 2, height / 2 - 10);
      ctx.font = '20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Press P to keep flying', width / 2, height / 2 + 32);
      ctx.restore();
    }
    return;
  }
  if (world.screen === SCREEN_CRASHED) {
    drawHud(ctx, world, width, height);
    drawEndPanel(ctx, world, width, height, 'CRASHED', [
      `The ridge wins this one. Score ${world.score} · rings ${world.ringsHit}/${world.track.rings.length}`,
      'Too low, too slow, or too far past the valley wall.',
    ], '#ff6b5e');
    return;
  }
  if (world.screen === SCREEN_LANDED) {
    drawHud(ctx, world, width, height);
    drawEndPanel(ctx, world, width, height, 'TOUCHDOWN!', [
      `A clean landing on the Meridian strip. Score ${world.score}`,
      `Rings ${world.ringsHit}/${world.track.rings.length} · fuel ${Math.round(world.fuel)}% left`,
      world.landedSmooth ? 'Smooth as silk — gentle touchdown bonus earned.' : 'Down safe, if not exactly gentle.',
    ], '#7ee787');
    return;
  }
  if (world.screen === SCREEN_DONE) {
    drawHud(ctx, world, width, height);
    drawEndPanel(ctx, world, width, height, 'SORTIE OVER', [
      `Final score ${world.score} · rings ${world.ringsHit}/${world.track.rings.length}`,
      world.mission.mustLand ? 'The delivery needed a landing — the strip is behind you.' : 'You flew the valley to its end.',
    ], '#ffd166');
  }
}
