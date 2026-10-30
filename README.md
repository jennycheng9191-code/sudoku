# 數獨樂園

給幼兒園～國小小朋友玩的數獨網頁：4×4／6×6／9×9 三種盤面 × 初階／中階／高階。

線上：https://jennycheng9191-code.github.io/sudoku/

## 維運

- 題目由 `src/lib/sudoku.ts` 即時產生，每題唯一解；調難度改 `CLUE_RANGE`
- 改完跑 `node tools/check_sudoku.ts`（每種組合 200 題自動驗證），全綠再 push
- push 到 main → GitHub Actions 自動建置部署
- 進度存在訪客瀏覽器 localStorage（key 前綴 `sudoku-`）
