// 進度存在訪客瀏覽器的 localStorage，key 前綴 sudoku- 避免跟同網域其他站衝突
import type { Level, Size } from "./sudoku.ts";

export interface SavedGame {
  size: Size;
  level: Level;
  puzzle: number[];
  solution: number[];
  values: number[];
  hinted: number[]; // 用「提示一格」填的格子，鎖住不能改
  hints: number;
  mistakes: number;
  elapsed: number; // 毫秒
  history: { i: number; prev: number }[];
}

export interface Record_ {
  done: number;
  bestMs: number | null;
  bestStars: number;
}

export interface Settings {
  instantCheck: boolean;
}

const KEY_GAME = "sudoku-game";
const KEY_RECORDS = "sudoku-records";
const KEY_SETTINGS = "sudoku-settings";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 無痕模式或儲存空間被擋：照常玩，只是不存
  }
}

export const loadGame = () => read<SavedGame | null>(KEY_GAME, null);
export const saveGame = (g: SavedGame | null) => write(KEY_GAME, g);

export const recordKey = (size: Size, level: Level) => `${size}-${level}`;
export const loadRecords = () => read<Record<string, Record_>>(KEY_RECORDS, {});

export function addRecord(size: Size, level: Level, ms: number, stars: number): Record_ {
  const all = loadRecords();
  const k = recordKey(size, level);
  const old = all[k] ?? { done: 0, bestMs: null, bestStars: 0 };
  const next = {
    done: old.done + 1,
    bestMs: old.bestMs === null ? ms : Math.min(old.bestMs, ms),
    bestStars: Math.max(old.bestStars, stars),
  };
  all[k] = next;
  write(KEY_RECORDS, all);
  return next;
}

export const loadSettings = () => read<Settings>(KEY_SETTINGS, { instantCheck: true });
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
