// 產題器自動檢查：每種盤面×難度各出 COUNT 題，逐題驗證
// 驗證用的解題邏輯是這裡另外寫的，不共用 src/lib/sudoku.ts 的解題器
import { CLUE_RANGE, LEVELS, LEVEL_NAME, SIZES, generate, type Level, type Size } from "../src/lib/sudoku.ts";

const COUNT = Number(process.argv[2] ?? 200);

function shape(n: number): [number, number] {
  return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3];
}

// 第 i 格的所有同列、同行、同宮格子
function peersOf(n: number): number[][] {
  const [br, bc] = shape(n);
  const out: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const set = new Set<number>();
    for (let j = 0; j < n * n; j++) {
      if (j === i) continue;
      const r2 = Math.floor(j / n);
      const c2 = j % n;
      const sameBox = Math.floor(r / br) === Math.floor(r2 / br) && Math.floor(c / bc) === Math.floor(c2 / bc);
      if (r2 === r || c2 === c || sameBox) set.add(j);
    }
    out.push([...set]);
  }
  return out;
}

function unitsOf(n: number): number[][] {
  const [br, bc] = shape(n);
  const units: number[][] = [];
  for (let r = 0; r < n; r++) units.push([...Array(n).keys()].map((c) => r * n + c));
  for (let c = 0; c < n; c++) units.push([...Array(n).keys()].map((r) => r * n + c));
  for (let r0 = 0; r0 < n; r0 += br)
    for (let c0 = 0; c0 < n; c0 += bc) {
      const u: number[] = [];
      for (let r = r0; r < r0 + br; r++) for (let c = c0; c < c0 + bc; c++) u.push(r * n + c);
      units.push(u);
    }
  return units;
}

function candidates(g: number[], i: number, n: number, peers: number[][]): number[] {
  const used = new Set(peers[i].map((j) => g[j]));
  return [...Array(n).keys()].map((k) => k + 1).filter((d) => !used.has(d));
}

// 樸素回溯，依序填，數到 2 個解就停
function countSols(grid: number[], n: number, peers: number[][]): number {
  const g = grid.slice();
  let count = 0;
  const rec = (pos: number): void => {
    if (count >= 2) return;
    while (pos < g.length && g[pos]) pos++;
    if (pos === g.length) {
      count++;
      return;
    }
    for (const d of candidates(g, pos, n, peers)) {
      g[pos] = d;
      rec(pos + 1);
      g[pos] = 0;
    }
  };
  rec(0);
  return count;
}

function singlesSolve(grid: number[], n: number, peers: number[][], units: number[][], hidden: boolean): boolean {
  const g = grid.slice();
  for (;;) {
    let moved = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const c = candidates(g, i, n, peers);
      if (c.length === 0) return false;
      if (c.length === 1) {
        g[i] = c[0];
        moved = true;
      }
    }
    if (!moved && hidden) {
      for (const u of units)
        for (let d = 1; d <= n; d++) {
          if (u.some((i) => g[i] === d)) continue;
          const spots = u.filter((i) => !g[i] && candidates(g, i, n, peers).includes(d));
          if (spots.length === 1) {
            g[spots[0]] = d;
            moved = true;
          }
        }
    }
    if (g.every((v) => v)) return true;
    if (!moved) return false;
  }
}

function validSolution(sol: number[], n: number, units: number[][]): boolean {
  return units.every((u) => new Set(u.map((i) => sol[i])).size === n) && sol.every((v) => v >= 1 && v <= n);
}

let failures = 0;
const rows: string[] = [];
for (const n of SIZES as Size[]) {
  const peers = peersOf(n);
  const units = unitsOf(n);
  for (const level of LEVELS as Level[]) {
    const [lo, hi] = CLUE_RANGE[n][level];
    const errs: Record<string, number> = {};
    const bad = (k: string) => (errs[k] = (errs[k] ?? 0) + 1);
    let maxMs = 0;
    let totalMs = 0;
    let clueSum = 0;
    for (let k = 0; k < COUNT; k++) {
      const t0 = performance.now();
      const p = generate(n, level);
      const ms = performance.now() - t0;
      maxMs = Math.max(maxMs, ms);
      totalMs += ms;
      const clues = p.puzzle.filter((v) => v).length;
      clueSum += clues;
      if (p.puzzle.length !== n * n || p.solution.length !== n * n) bad("長度");
      if (!validSolution(p.solution, n, units)) bad("解答不合法");
      if (p.puzzle.some((v, i) => v && v !== p.solution[i])) bad("提示與解答不符");
      if (countSols(p.puzzle, n, peers) !== 1) bad("不是唯一解");
      if (clues < lo || clues > hi) bad(`提示數超出 ${lo}-${hi}`);
      if (level === "easy" && !singlesSolve(p.puzzle, n, peers, units, false)) bad("初階解不出（唯一候選）");
      if (level === "mid" && !singlesSolve(p.puzzle, n, peers, units, true)) bad("中階解不出（唯一候選＋唯一位置）");
      if (ms > 500) bad("出題超過 0.5 秒");
    }
    const errText = Object.entries(errs).map(([k, v]) => `${k}×${v}`).join("、");
    failures += Object.values(errs).reduce((a, b) => a + b, 0);
    rows.push(
      `${n}×${n} ${LEVEL_NAME[level]}｜平均提示 ${(clueSum / COUNT).toFixed(1)}｜平均 ${(totalMs / COUNT).toFixed(1)}ms 最慢 ${maxMs.toFixed(0)}ms｜${errText || "OK"}`,
    );
  }
}
console.log(rows.join("\n"));
console.log(failures ? `\n共 ${failures} 個錯誤` : `\n全部通過（${SIZES.length * LEVELS.length * COUNT} 題）`);
process.exit(failures ? 1 : 0);
