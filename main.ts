// Token Radar's builder. Reads the frozen DefiLlama snapshot, scores every pre-token protocol it may
// rank, writes the board and the dashboard's data, copies the page and the screenshots into the output
// directory, and packs the dossier the judge reads. Run with node main.ts (Node 22.18 or later):
//
//   INPUT_SNAPSHOT=/input/snapshot.json OUTPUT_DIR=/output node main.ts
//
// With no environment set it reads ./input/snapshot.json relative to this file's parent's parent and
// writes ./out, so a fresh clone runs end to end in one command.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRadar, parseSnapshot, boardIssue, dataScript, MODEL } from './lib/model.ts';
import type { BoardRow, Snapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = dirname(fileURLToPath(import.meta.url));
const input = process.env.INPUT_SNAPSHOT ?? resolve(here, '..', 'input', 'snapshot.json');
const out = resolve(process.env.OUTPUT_DIR ?? join(here, 'out'));
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 8, max_bytes: 512 * 1024 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** The snapshot out of the input path, with the gate's own refusal on anything else. */
function readSnapshot(path: string): Snapshot {
  if (!existsSync(path)) {
    process.stderr.write(`token radar: no snapshot at ${path} (set INPUT_SNAPSHOT)\n`);
    process.exit(1);
  }
  try {
    return parseSnapshot(readFileSync(path, 'utf8'));
  } catch (err) {
    process.stderr.write(`token radar: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

/** Copy one directory's plain files into `to`, returning the names it copied. */
function copyFiles(from: string, to: string): string[] {
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const snapshot = readSnapshot(input);
const { board, radar } = buildRadar(snapshot, MODEL);

// The board is judged by the same checks the gate runs: coverage, rank order, one shared implied value.
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify(board, null, 2)}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));
const dashboardOut = join(out, 'dashboard');
copyFiles(join(here, 'dashboard'), dashboardOut);
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));

const watchCount = snapshot.watchlist.length;
const impliedTop = board.length > 0 ? board[0]!.implied_value_usd : 0;
const impliedTotal = board.reduce((n: number, r: BoardRow) => n + r.implied_value_usd, 0);
process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${watchCount} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: implied value of row 1 $${impliedTop.toLocaleString('en-US')}, all rows $${impliedTotal.toLocaleString('en-US')}\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${dashboardOut}, ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
