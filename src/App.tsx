import { useState } from "react";
import Game from "./components/Game.tsx";
import Home from "./components/Home.tsx";
import { generate, type Level, type Size } from "./lib/sudoku.ts";
import { loadGame, saveGame, type SavedGame } from "./lib/storage.ts";

function newGame(size: Size, level: Level): SavedGame {
  const p = generate(size, level);
  return {
    size,
    level,
    puzzle: p.puzzle,
    solution: p.solution,
    values: p.puzzle.slice(),
    hinted: [],
    hints: 0,
    mistakes: 0,
    elapsed: 0,
    history: [],
  };
}

export default function App() {
  const [game, setGame] = useState<SavedGame | null>(null);

  const start = (size: Size, level: Level) => {
    const g = newGame(size, level);
    saveGame(g);
    setGame(g);
    window.scrollTo(0, 0);
  };

  if (game) {
    return (
      <Game
        // key 換掉＝整局重來（再玩一題）
        key={game.puzzle.join("") + game.solution.join("")}
        initial={game}
        onHome={() => setGame(null)}
        onNext={() => start(game.size, game.level)}
      />
    );
  }
  return <Home onStart={start} onResume={() => setGame(loadGame())} />;
}
