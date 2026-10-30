import { useState } from "react";
import { LEVELS, LEVEL_NAME, SIZES, type Level, type Size } from "../lib/sudoku.ts";
import { formatTime, loadGame, loadRecords, loadSettings, recordKey, saveSettings } from "../lib/storage.ts";
import Stars from "./Stars.tsx";
import Toggle from "./Toggle.tsx";

const SIZE_NAME: Record<Size, string> = { 4: "小試身手", 6: "漸入佳境", 9: "正式挑戰" };

export default function Home({ onStart, onResume }: { onStart: (s: Size, l: Level) => void; onResume: () => void }) {
  const saved = loadGame();
  const records = loadRecords();
  const [check, setCheck] = useState(loadSettings().instantCheck);

  return (
    <main className="page">
      <h1 className="title">數獨樂園</h1>
      <p className="subtitle">每一列、每一行、每一宮，數字都不能重複</p>

      {saved && (
        <button type="button" className="resume" style={{ background: `var(--s${saved.size})` }} onClick={onResume}>
          <span>▶ 繼續上一局</span>
          <span>
            <span className="num">
              {saved.size}×{saved.size}
            </span>{" "}
            {LEVEL_NAME[saved.level]}・<span className="num">{formatTime(saved.elapsed)}</span>
          </span>
        </button>
      )}

      {SIZES.map((size) => (
        <section key={size} className="size-card">
          <div className="size-head">
            <span className="size-badge num" style={{ background: `var(--s${size})` }}>
              {size}×{size}
            </span>
            <span className="size-name">{SIZE_NAME[size]}</span>
          </div>
          <div className="levels">
            {LEVELS.map((level) => {
              const rec = records[recordKey(size, level)];
              return (
                <button
                  key={level}
                  type="button"
                  className="level-btn"
                  style={{ background: `var(--s${size})` }}
                  onClick={() => onStart(size, level)}
                >
                  {LEVEL_NAME[level]}
                  <span className="level-rec">
                    {rec ? (
                      <>
                        <Stars n={rec.bestStars} /> <span className="num">{formatTime(rec.bestMs ?? 0)}</span>
                      </>
                    ) : (
                      "還沒玩過"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="settings-row">
        <Toggle
          on={check}
          label="填錯馬上標紅"
          onChange={(v) => {
            setCheck(v);
            saveSettings({ instantCheck: v });
          }}
        />
      </div>
    </main>
  );
}
