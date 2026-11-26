// Kestrel Ridge Run — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ beside it into the
// output directory and writes /output/dossier.json with the vendored make.fun
// library, exactly as the scorer rebuilds it. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The copy walks in sorted order and refuses anything the gate would refuse
// (a screenshot over 256 KiB, more than 4 of them, a game/ over the caps),
// so a bad hand-in fails loudly here instead of silently at the gate.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const SCREENSHOT_MAX_BYTES = 262144;
const SCREENSHOT_MAX_COUNT = 4;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;

function fail(message) {
  throw new Error(`kestrel hand-in: ${message}`);
}

// Clear a directory's contents without removing the directory itself: the
// grader mounts /output as a volume, and removing a mount point fails
// (EBUSY), so the directory itself must stay put and only its entries go.
function clearDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

// Copy one tree, entries in sorted order so the walk is deterministic, and
// count what it holds on the way so the caps are checked before the dossier.
function copyTree(source, target, counts) {
  mkdirSync(target, { recursive: true });
  const entries = readdirSync(source, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isSymbolicLink()) fail(`refusing symlink ${from}`);
    if (entry.isDirectory()) {
      counts.entries += 1;
      copyTree(from, to, counts);
    } else if (entry.isFile()) {
      const bytes = statSync(from).size;
      counts.entries += 1;
      counts.bytes += bytes;
      copyFileSync(from, to);
    } else {
      fail(`refusing special file ${from}`);
    }
  }
}

function handIn() {
  const gameSource = join(here, 'game');
  const shotsSource = join(here, 'screenshots');
  if (!existsSync(gameSource)) fail('game/ is missing beside main.ts');
  if (!existsSync(join(gameSource, 'index.html'))) fail('game/index.html is missing');

  // The screenshots the dossier will carry: 3 or 4, each within its cap.
  const shotNames = existsSync(shotsSource)
    ? readdirSync(shotsSource).filter((name) => !name.startsWith('.')).sort()
    : [];
  if (shotNames.length < 3 || shotNames.length > SCREENSHOT_MAX_COUNT) {
    fail(`need 3 or 4 screenshots, found ${shotNames.length}`);
  }
  for (const name of shotNames) {
    const bytes = statSync(join(shotsSource, name)).size;
    if (bytes > SCREENSHOT_MAX_BYTES) fail(`screenshot ${name} is ${bytes} bytes, over 256 KiB`);
  }

  // A clean output directory: stale files from an earlier run must not leak in.
  // Clear only the contents — never remove the output directory itself.
  clearDir(out);

  const gameCounts = { entries: 0, bytes: 0 };
  copyTree(gameSource, join(out, 'game'), gameCounts);
  if (gameCounts.entries > GAME_MAX_FILES) fail(`game/ holds ${gameCounts.entries} entries, over 993`);
  if (gameCounts.bytes > GAME_MAX_BYTES) fail(`game/ is ${gameCounts.bytes} bytes, over 48 MiB`);

  const shotsCounts = { entries: 0, bytes: 0 };
  copyTree(shotsSource, join(out, 'screenshots'), shotsCounts);

  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  });
  // The grader runs this program twice and demands identical bytes, so prove
  // it here: rebuild the dossier from what was just written and refuse to
  // hand in a result that does not reproduce itself. buildDossier returns
  // bytes, so the comparison is on bytes, never on object identity.
  const dossierAgain = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  });
  if (!Buffer.from(dossier).equals(Buffer.from(dossierAgain))) {
    fail('dossier is not deterministic across builds');
  }
  writeFileSync(join(out, 'dossier.json'), dossier);

  const dossierPath = join(out, 'dossier.json');
  const dossierBytes = statSync(dossierPath).size;
  console.log(
    `kestrel hand-in: game ${gameCounts.entries} entries, ${gameCounts.bytes} bytes; ` +
      `screenshots ${shotNames.map((name) => basename(name)).join(', ')}; ` +
      `dossier ${dossierBytes} bytes -> ${dirname(dossierPath)}`,
  );
}

handIn();
