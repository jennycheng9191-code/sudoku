// 數獨產題與解題：盤面用長度 n*n 的陣列，0＝空格，1..n＝數字

export type Size = 4 | 6 | 9;
export type Level = "easy" | "mid" | "hard";

export const SIZES: Size[] = [4, 6, 9];
export const LEVELS: Level[] = ["easy", "mid", "hard"];
export const LEVEL_NAME: Record<Level, string> = { easy: "初階", mid: "中階", hard: "高階" };

// 各盤面×難度保留的提示格數（含頭尾）；要調難度改這張表就好
export const CLUE_RANGE: Record<Size, Record<Level, [number, number]>> = {
  4: { easy: [10, 11], mid: [7, 8], hard: [5, 6] },
  6: { easy: [22, 24], mid: [16, 18], hard: [12, 14] },
  9: { easy: [40, 44], mid: [32, 36], hard: [28, 32] },
};

export interface Puzzle {
  size: Size;
  level: Level;
  puzzle: number[];
  solution: number[];
}

// ---------- 盤面幾何 ----------

export interface Geo {
  n: number;
  boxRows: number; // 一個宮有幾列
  boxCols: number; // 一個宮有幾行
  row: number[]; // 每格在第幾列
  col: number[];
  box: number[];
  units: number[][]; // 所有列、行、宮（各 n 格）
}

const geoCache = new Map<number, Geo>();

export function boxShape(n: Size): [number, number] {
  return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3];
}

export function geo(n: Size): Geo {
  const hit = geoCache.get(n);
  if (hit) return hit;
  const [boxRows, boxCols] = boxShape(n);
  const row: number[] = [];
  const col: number[] = [];
  const box: number[] = [];
  const units: number[][] = Array.from({ length: n * 3 }, () => []);
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const b = Math.floor(r / boxRows) * (n / boxCols) + Math.floor(c / boxCols);
    row.push(r);
    col.push(c);
    box.push(b);
    units[r].push(i);
    units[n + c].push(i);
    units[2 * n + b].push(i);
  }
  const g = { n, boxRows, boxCols, row, col, box, units };
  geoCache.set(n, g);
  return g;
}

// ---------- 位元工具：數字 d 對應 1 << (d-1) ----------

function popcount(m: number): number {
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}

function bitToDigit(bit: number): number {
  return 31 - Math.clz32(bit) + 1;
}

// 列／行／宮已用數字的遮罩；盤面本身有衝突時回傳 null
function masks(cells: number[], g: Geo) {
  const rm = new Array(g.n).fill(0);
  const cm = new Array(g.n).fill(0);
  const bm = new Array(g.n).fill(0);
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    if ((rm[g.row[i]] | cm[g.col[i]] | bm[g.box[i]]) & bit) return null;
    rm[g.row[i]] |= bit;
    cm[g.col[i]] |= bit;
    bm[g.box[i]] |= bit;
  }
  return { rm, cm, bm };
}

// ---------- 回溯解題（找最少候選的格子先填） ----------

function search(cells: number[], n: Size, onSolved: () => boolean, order?: (m: number) => number[]): void {
  const g = geo(n);
  const full = (1 << n) - 1;
  const ms = masks(cells, g);
  if (!ms) return;
  const { rm, cm, bm } = ms;
  const empties = cells.flatMap((v, i) => (v ? [] : [i]));

  const rec = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestCnt = 99;
    for (const i of empties) {
      if (cells[i]) continue;
      const m = full & ~(rm[g.row[i]] | cm[g.col[i]] | bm[g.box[i]]);
      const c = popcount(m);
      if (c === 0) return false;
      if (c < bestCnt) {
        best = i;
        bestMask = m;
        bestCnt = c;
        if (c === 1) break;
      }
    }
    if (best < 0) return onSolved();
    const bits = order ? order(bestMask) : lowBits(bestMask);
    const r = g.row[best];
    const c = g.col[best];
    const b = g.box[best];
    for (const bit of bits) {
      cells[best] = bitToDigit(bit);
      rm[r] |= bit;
      cm[c] |= bit;
      bm[b] |= bit;
      if (rec()) return true;
      rm[r] &= ~bit;
      cm[c] &= ~bit;
      bm[b] &= ~bit;
    }
    cells[best] = 0;
    return false;
  };
  rec();
}

function lowBits(m: number): number[] {
  const out: number[] = [];
  while (m) {
    const bit = m & -m;
    out.push(bit);
    m ^= bit;
  }
  return out;
}

// 數解的個數，數到 limit 就停（判斷唯一解用 limit=2）
export function countSolutions(grid: number[], n: Size, limit = 2): number {
  let count = 0;
  search(grid.slice(), n, () => ++count >= limit);
  return count;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 隨機填滿一個合法的完整盤面
export function fillRandom(n: Size, rand: () => number = Math.random): number[] {
  const cells = new Array(n * n).fill(0);
  let done: number[] = [];
  search(
    cells,
    n,
    () => {
      done = cells.slice();
      return true;
    },
    (m) => shuffle(lowBits(m), rand),
  );
  return done;
}

// ---------- 人類解法：只用「唯一候選」（＋「唯一位置」）能不能解完 ----------

// hidden=false：只用「這格只剩一個數字能填」
// hidden=true ：再加上「這個數字在這列／行／宮只剩一個位置」
export function solvableBySingles(grid: number[], n: Size, hidden: boolean): boolean {
  const g = geo(n);
  const full = (1 << n) - 1;
  const cells = grid.slice();
  const ms = masks(cells, g);
  if (!ms) return false;
  const { rm, cm, bm } = ms;
  const place = (i: number, bit: number) => {
    cells[i] = bitToDigit(bit);
    rm[g.row[i]] |= bit;
    cm[g.col[i]] |= bit;
    bm[g.box[i]] |= bit;
  };
  const cand = (i: number) => full & ~(rm[g.row[i]] | cm[g.col[i]] | bm[g.box[i]]);

  for (;;) {
    let progress = false;
    let left = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      const m = cand(i);
      if (m === 0) return false;
      if ((m & (m - 1)) === 0) {
        place(i, m);
        progress = true;
      } else left++;
    }
    if (left === 0) return true;
    if (!progress && hidden) {
      for (const unit of g.units) {
        for (let bit = 1; bit <= full; bit <<= 1) {
          let spot = -1;
          let hits = 0;
          for (const i of unit) {
            if (cells[i] === bitToDigit(bit)) {
              hits = -1;
              break;
            }
            if (!cells[i] && cand(i) & bit) {
              spot = i;
              hits++;
            }
          }
          if (hits === 1) {
            place(spot, bit);
            progress = true;
          }
        }
      }
    }
    if (!progress) return false;
  }
}

// 這個挖空後的盤面符不符合該難度的解法要求
function fitsLevel(puzzle: number[], n: Size, level: Level): boolean {
  // 單純推理能解完＝必定唯一解，不必另外數解
  if (level === "easy") return solvableBySingles(puzzle, n, false);
  if (level === "mid") return solvableBySingles(puzzle, n, true);
  return countSolutions(puzzle, n, 2) === 1;
}

// ---------- 出題 ----------

export function generate(n: Size, level: Level, rand: () => number = Math.random): Puzzle {
  const [lo, hi] = CLUE_RANGE[n][level];
  let best: Puzzle | null = null;
  let bestClues = Infinity;
  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = fillRandom(n, rand);
    const target = lo + Math.floor(rand() * (hi - lo + 1));
    const puzzle = solution.slice();
    let clues = n * n;
    for (const i of shuffle([...puzzle.keys()], rand)) {
      if (clues <= target) break;
      const v = puzzle[i];
      puzzle[i] = 0;
      if (fitsLevel(puzzle, n, level)) clues--;
      else puzzle[i] = v;
    }
    const result = { size: n, level, puzzle, solution };
    if (clues <= hi) return result;
    // 挖不到區間內：留最接近的一份，全部嘗試都失敗時退而求其次
    if (clues < bestClues) {
      best = result;
      bestClues = clues;
    }
  }
  return best!;
}
