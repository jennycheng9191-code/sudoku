import { useEffect, useRef, useState } from "react";
import { LEVEL_NAME, geo } from "../lib/sudoku.ts";
import { addRecord, formatTime, loadRecords, loadSettings, recordKey, saveGame, saveSettings, type SavedGame } from "../lib/storage.ts";
import Toggle from "./Toggle.tsx";

type Board = Omit<SavedGame, "elapsed">;
interface Win {
  stars: number;
  ms: number;
  newBest: boolean;
}

// 格子數字大小：盤面越大字越小，手機上 9×9 約 28px
// cqw＝盤面寬度的百分比：電腦版盤面隨螢幕高度縮小時，字也跟著縮，最下排才不會被擠出框
const CELL_FONT: Record<number, string> = { 4: "min(14vw, 64px, 18cqw)", 6: "min(10vw, 46px, 13cqw)", 9: "min(7.2vw, 34px, 9cqw)" };

export default function Game({ initial, onHome, onNext }: { initial: SavedGame; onHome: () => void; onNext: () => void }) {
  const { elapsed: initialElapsed, ...initialBoard } = initial;
  const [b, setB] = useState<Board>(initialBoard);
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [sel, setSel] = useState(-1);
  const [check, setCheck] = useState(loadSettings().instantCheck);
  const [note, setNote] = useState("");
  const [win, setWin] = useState<Win | null>(null);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  const n = b.size;
  const g = geo(n);
  const locked = (i: number) => b.puzzle[i] !== 0 || b.hinted.includes(i);

  // 計時：分頁切到背景時不算
  useEffect(() => {
    if (win) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const d = now - last;
      last = now;
      if (document.visibilityState === "visible") setElapsed((e) => e + d);
    }, 500);
    return () => clearInterval(id);
  }, [win]);

  // 每次變動都存，關掉再開可以接著玩
  useEffect(() => {
    if (!win) saveGame({ ...b, elapsed });
  }, [b, elapsed, win]);

  const commit = (next: Board) => {
    setB(next);
    if (next.values.every((v, i) => v === next.solution[i])) {
      const ms = elapsedRef.current;
      const stars = 1 + (next.hints === 0 ? 1 : 0) + (next.mistakes === 0 ? 1 : 0);
      const old = loadRecords()[recordKey(next.size, next.level)];
      addRecord(next.size, next.level, ms, stars);
      saveGame(null);
      setNote("");
      setSel(-1);
      setWin({ stars, ms, newBest: !!old && old.bestMs !== null && ms < old.bestMs });
    } else if (!check && next.values.every((v) => v)) {
      setNote("格子都填滿了，可是有地方不對喔");
    } else {
      setNote("");
    }
  };

  const put = (d: number) => {
    if (win || sel < 0 || locked(sel) || b.values[sel] === d) return;
    const values = b.values.slice();
    values[sel] = d;
    const wrong = d !== 0 && d !== b.solution[sel];
    commit({
      ...b,
      values,
      mistakes: b.mistakes + (wrong ? 1 : 0),
      history: [...b.history, { i: sel, prev: b.values[sel] }],
    });
  };

  const undo = () => {
    const last = b.history[b.history.length - 1];
    if (win || !last) return;
    const values = b.values.slice();
    values[last.i] = last.prev;
    setSel(last.i);
    commit({ ...b, values, history: b.history.slice(0, -1) });
  };

  const hint = () => {
    if (win) return;
    const needs = (i: number) => !locked(i) && b.values[i] !== b.solution[i];
    let target = sel >= 0 && needs(sel) ? sel : -1;
    if (target < 0) {
      const todo = b.values.flatMap((_, i) => (needs(i) ? [i] : []));
      if (!todo.length) return;
      target = todo[Math.floor(Math.random() * todo.length)];
    }
    const values = b.values.slice();
    values[target] = b.solution[target];
    setSel(target);
    commit({
      ...b,
      values,
      hinted: [...b.hinted, target],
      hints: b.hints + 1,
      // 提示過的格子鎖住，上一步不能再把它改回去
      history: b.history.filter((h) => h.i !== target),
    });
  };

  // 鍵盤：數字填入、退格擦掉、方向鍵移動
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const d = Number(e.key);
      if (Number.isInteger(d) && d >= 1 && d <= n) put(d);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") put(0);
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const cur = sel < 0 ? 0 : sel;
        let r = g.row[cur];
        let c = g.col[cur];
        if (sel >= 0) {
          if (e.key === "ArrowUp") r = (r + n - 1) % n;
          if (e.key === "ArrowDown") r = (r + 1) % n;
          if (e.key === "ArrowLeft") c = (c + n - 1) % n;
          if (e.key === "ArrowRight") c = (c + 1) % n;
        }
        setSel(r * n + c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selVal = sel >= 0 ? b.values[sel] : 0;
  const counts = new Array(n + 1).fill(0);
  // 數字鍵變淡＝這個數字已經填滿 n 個；開標紅時填錯的不算，免得誤導
  b.values.forEach((v, i) => {
    if (!check || v === b.solution[i]) counts[v]++;
  });
  const color = `var(--s${n})`;

  return (
    // 盤面以外約佔 290px 高；矮螢幕（筆電）把整頁縮窄，數字鍵才不會掉到畫面外
    <main className="page" style={{ maxWidth: "max(340px, min(560px, calc(100dvh - 290px)))" }}>
      <div className="topbar">
        <button type="button" className="back" onClick={onHome}>
          ← 首頁
        </button>
        <span className="game-title">
          <span className="num">
            {n}×{n}
          </span>{" "}
          {LEVEL_NAME[b.level]}
        </span>
        <Toggle
          on={check}
          label="標紅"
          onChange={(v) => {
            setCheck(v);
            saveSettings({ instantCheck: v });
            if (v) setNote("");
          }}
        />
      </div>

      <div className="status">
        <span>
          ⏱ <b className="num">{formatTime(elapsed)}</b>
        </span>
        <span>
          💡 提示 <b className="num">{b.hints}</b>
        </span>
        {check && (
          <span>
            ✗ 填錯 <b className="num">{b.mistakes}</b>
          </span>
        )}
      </div>

      <div className="board" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
        {b.values.map((v, i) => {
          const r = g.row[i];
          const c = g.col[i];
          const thickR = c < n - 1 && (c + 1) % g.boxCols === 0;
          const thickB = r < n - 1 && (r + 1) % g.boxRows === 0;
          const isGiven = b.puzzle[i] !== 0;
          const isHint = b.hinted.includes(i);
          const showWrong = check && v !== 0 && !isGiven && !isHint && v !== b.solution[i];
          const cls = ["cell", "num"];
          if (i === sel) cls.push("sel");
          else if (v && v === selVal) cls.push("same");
          else if (sel >= 0 && (g.row[sel] === r || g.col[sel] === c || g.box[sel] === g.box[i])) cls.push("peer");
          if (showWrong) cls.push("wrong");
          const vCls = isGiven ? "v-given" : isHint ? "v-hint" : showWrong ? "v-wrong" : "v-entry";
          return (
            <button
              key={i}
              type="button"
              className={cls.join(" ")}
              style={{
                fontSize: CELL_FONT[n],
                borderRightWidth: c < n - 1 ? (thickR ? 3 : 1) : 0,
                borderBottomWidth: r < n - 1 ? (thickB ? 3 : 1) : 0,
                borderRightColor: thickR ? "var(--grid-bold)" : undefined,
                borderBottomColor: thickB ? "var(--grid-bold)" : undefined,
              }}
              aria-label={`第 ${r + 1} 列第 ${c + 1} 行${v ? `，${v}` : "，空格"}`}
              onClick={() => setSel(i)}
            >
              <span className={vCls}>{v || ""}</span>
            </button>
          );
        })}
      </div>

      <div className="pad" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gap: n === 9 ? 4 : 8 }}>
        {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
          <button
            key={d}
            type="button"
            className={`pad-btn num${counts[d] >= n ? " used" : ""}`}
            style={n === 9 ? { fontSize: 26, height: 54 } : undefined}
            onClick={() => put(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="actions">
        <button type="button" className="act-btn" onClick={undo} disabled={!b.history.length}>
          <span className="icon">↶</span>上一步
        </button>
        <button type="button" className="act-btn" onClick={() => put(0)} disabled={sel < 0 || locked(sel) || !b.values[sel]}>
          <span className="icon">⌫</span>擦掉
        </button>
        <button type="button" className="act-btn" onClick={hint}>
          <span className="icon">💡</span>提示一格
        </button>
      </div>

      <p className="note">{note}</p>

      {win && (
        <div className="overlay" role="dialog" aria-label="完成">
          <div className="win">
            <h2>完成了！</h2>
            <div className="big-stars">
              {[0, 1, 2].map((k) => (
                <span key={k} className={k < win.stars ? "star-on" : "star-off"} style={{ animationDelay: `${0.15 + k * 0.2}s` }}>
                  ★
                </span>
              ))}
            </div>
            <p>
              用時 <b className="num">{formatTime(win.ms)}</b>
            </p>
            <p>
              提示 <span className="num">{b.hints}</span> 次・填錯 <span className="num">{b.mistakes}</span> 次
            </p>
            {win.newBest && <p className="best">🎉 新紀錄！</p>}
            {win.stars < 3 && <p style={{ fontSize: 15 }}>不用提示、不填錯，就能拿三顆星</p>}
            <div className="win-btns">
              <button type="button" style={{ background: color, color: "var(--on-s)" }} onClick={onNext}>
                再玩一題
              </button>
              <button type="button" style={{ background: "#f3ead8" }} onClick={onHome}>
                回首頁
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
