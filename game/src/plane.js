// The Kestrel-9 herself, drawn from behind and slightly above: cream
// fuselage, teal wings, a spinning prop disc at the nose, nav lights lit.
// Banking rolls her, climbing lifts her nose; the shadow below her tells the
// pilot how high she really is.
export function drawPlaneShadow(ctx, x, y, scale, altitude) {
  const squash = Math.max(0.25, 1 - altitude / 5200);
  const width = 150 * scale * squash;
  ctx.save();
  ctx.globalAlpha = 0.32 * squash;
  ctx.fillStyle = '#101418';
  ctx.beginPath();
  ctx.ellipse(x, y, width, width * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPlane(ctx, x, y, size, bank, pitch, time, speedRatio) {
  ctx.save();
  ctx.translate(x, y);
  // Roll with the bank, and lift the nose a touch when climbing.
  ctx.rotate(bank * 0.55);
  ctx.translate(0, pitch * size * 0.06);
  ctx.scale(size, size);

  // Prop disc: a translucent circle at the nose, seen face-on from behind,
  // with the blades spinning inside it.
  const propSpin = time * (18 + speedRatio * 40);
  ctx.save();
  ctx.translate(0, -0.55);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#dfe6ea';
  ctx.beginPath();
  ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#3a3f45';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.4 * Math.cos(propSpin), -0.4 * Math.sin(propSpin));
  ctx.lineTo(0.4 * Math.cos(propSpin), 0.4 * Math.sin(propSpin));
  ctx.moveTo(-0.4 * Math.cos(propSpin + Math.PI / 2), -0.4 * Math.sin(propSpin + Math.PI / 2));
  ctx.lineTo(0.4 * Math.cos(propSpin + Math.PI / 2), 0.4 * Math.sin(propSpin + Math.PI / 2));
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#3a3f45';
  ctx.beginPath();
  ctx.arc(0, 0, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main wing: teal, with a cream tip on each side and a red/green nav light.
  ctx.fillStyle = '#1f7a6d';
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.28);
  ctx.quadraticCurveTo(-0.7, -0.42, -0.28, -0.34);
  ctx.lineTo(0.28, -0.34);
  ctx.quadraticCurveTo(0.7, -0.42, 0.95, -0.28);
  ctx.quadraticCurveTo(0.6, -0.16, 0.2, -0.18);
  ctx.lineTo(-0.2, -0.18);
  ctx.quadraticCurveTo(-0.6, -0.16, -0.95, -0.28);
  ctx.fill();
  ctx.fillStyle = '#f4efe2';
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.28);
  ctx.quadraticCurveTo(-0.86, -0.36, -0.72, -0.35);
  ctx.lineTo(-0.7, -0.24);
  ctx.quadraticCurveTo(-0.84, -0.22, -0.95, -0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.95, -0.28);
  ctx.quadraticCurveTo(0.86, -0.36, 0.72, -0.35);
  ctx.lineTo(0.7, -0.24);
  ctx.quadraticCurveTo(0.84, -0.22, 0.95, -0.28);
  ctx.fill();

  // Fuselage: cream body tapering to the tail, seen from behind.
  const body = ctx.createLinearGradient(-0.22, 0, 0.22, 0);
  body.addColorStop(0, '#d8cdb4');
  body.addColorStop(0.5, '#f7f2e4');
  body.addColorStop(1, '#d8cdb4');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.5);
  ctx.quadraticCurveTo(-0.26, 0.1, -0.17, 0.52);
  ctx.quadraticCurveTo(0, 0.62, 0.17, 0.52);
  ctx.quadraticCurveTo(0.26, 0.1, 0.2, -0.5);
  ctx.quadraticCurveTo(0, -0.62, -0.2, -0.5);
  ctx.fill();

  // Canopy hump and the pilot's windscreen glint.
  ctx.fillStyle = '#274b5f';
  ctx.beginPath();
  ctx.ellipse(0, -0.28, 0.13, 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-0.04, -0.31, 0.05, 0.03, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Tail: fin above, stabilisers out to the sides.
  ctx.fillStyle = '#1f7a6d';
  ctx.beginPath();
  ctx.moveTo(-0.05, 0.34);
  ctx.lineTo(0.05, 0.34);
  ctx.lineTo(0.09, 0.62);
  ctx.lineTo(-0.09, 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.5);
  ctx.lineTo(0.34, 0.5);
  ctx.lineTo(0.3, 0.6);
  ctx.lineTo(-0.3, 0.6);
  ctx.closePath();
  ctx.fill();

  // Registration stripe on the tail cone.
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(-0.2, 0.08, 0.4, 0.05);

  // Nav lights: port red, starboard green, tail white blinking.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(-0.95, -0.28, 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4dff88';
  ctx.beginPath();
  ctx.arc(0.95, -0.28, 0.035, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0.6, 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // Exhaust puffs at full throttle.
  if (speedRatio > 0.75) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#cfd6da';
    const puff = (time * 30) % 1;
    ctx.beginPath();
    ctx.arc(-0.16, 0.55 + puff * 0.3, 0.04 + puff * 0.05, 0, Math.PI * 2);
    ctx.arc(0.16, 0.55 + ((time * 30 + 0.5) % 1) * 0.3, 0.04 + puff * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
