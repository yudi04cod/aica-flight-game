// Keyboard and mouse: arrows/WASD fly the plane, W/S work the throttle,
// Space is the airbrake, and the mouse steers too — hold the pointer left or
// right of centre to bank, above or below to pitch.
export function createInput(canvas) {
  const keys = {};
  const mouse = { x: 0, y: 0, active: false, down: false };
  const pressed = new Set();

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!keys[event.code]) pressed.add(event.code);
    keys[event.code] = true;
  }

  function keyUp(event) {
    keys[event.code] = false;
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) / rect.width - 0.5;
    mouse.y = (event.clientY - rect.top) / rect.height - 0.5;
    mouse.active = true;
  }

  function mouseDown(event) {
    mouse.down = true;
    mouseMove(event);
  }

  function mouseUp() {
    mouse.down = false;
  }

  function mouseLeave() {
    mouse.active = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mouseleave', mouseLeave);

  function held(code) {
    return !!keys[code];
  }

  return {
    // -1 (full left) .. 1 (full right), keyboard first, mouse as a nudge.
    bank() {
      let value = 0;
      if (held('ArrowLeft') || held('KeyA')) value -= 1;
      if (held('ArrowRight') || held('KeyD')) value += 1;
      if (value === 0 && mouse.active) value = Math.max(-1, Math.min(1, mouse.x * 2.4));
      return value;
    },
    // -1 (climb) .. 1 (descend): Up is climb, Down is descend.
    pitch() {
      let value = 0;
      if (held('ArrowUp')) value -= 1;
      if (held('ArrowDown')) value += 1;
      if (value === 0 && mouse.active) value = Math.max(-1, Math.min(1, mouse.y * 2.4));
      return value;
    },
    throttleUp() {
      return held('KeyW') || held('ShiftLeft') || held('ShiftRight') || held('KeyE');
    },
    throttleDown() {
      return held('KeyS') || held('ControlLeft') || held('ControlRight') || held('KeyQ');
    },
    airbrake() {
      return held('Space');
    },
    // True once per physical press; the game drains it each frame it reads.
    wasPressed(code) {
      return pressed.has(code);
    },
    consume(code) {
      pressed.delete(code);
    },
    consumeAny(codes) {
      for (const code of codes) {
        if (pressed.has(code)) {
          pressed.delete(code);
          return code;
        }
      }
      return null;
    },
    mouseClicked() {
      if (!mouse.down) return false;
      mouse.down = false;
      return true;
    },
    get mouse() {
      return mouse;
    },
  };
}
