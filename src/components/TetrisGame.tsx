import { useRef, useEffect, useState } from 'react';
import { Question, Difficulty } from '../utils/questionExtractor';
import { RefreshCw } from 'lucide-react';
import GameHUD from './GameHUD';
import QuestionModal from './QuestionModal';
import { playGameSound, getDifficultySettings } from '../utils/gameUtils';

interface Props {
  questions: Question[];
  onBack: () => void;
  highScore: number;
  setHighScore: (s: number) => void;
  difficulty: Difficulty;
  addCoins?: (amount: number) => void;
  skin?: string;
  onGameOver?: (score: number) => void;
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
const W = COLS * BLOCK;
const H = ROWS * BLOCK;

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const SHAPES: Record<string, { shape: number[][]; color: string }> = {
  I: { shape: [[1,1,1,1]], color: '#06b6d4' },
  O: { shape: [[1,1],[1,1]], color: '#fbbf24' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#10b981' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ef4444' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f97316' }
};

const SHAPE_KEYS = Object.keys(SHAPES);

export default function TetrisGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [nextPieceKey, setNextPieceKey] = useState<string>('I');
  const [lines, setLines] = useState(0);

  const gameData = useRef({
    board: [] as (string | null)[][],
    current: null as Piece | null,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[],
    dropTimer: 0,
    dropInterval: 50,
    score: 0,
    lives: settings.lives,
    lines: 0,
    combo: 0
  });

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    if (skin === 'TETRIS_RETRO') {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, 2);
      ctx.fillRect(x + 1, y + 1, 2, BLOCK - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 1, y + BLOCK - 3, BLOCK - 2, 2);
      ctx.fillRect(x + BLOCK - 3, y + 1, 2, BLOCK - 2);
    } else if (skin === 'TETRIS_CRYSTAL') {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 8, y + 2);
      ctx.lineTo(x + 2, y + 8);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 1, y + BLOCK - 4, BLOCK - 2, 3);
    }
  };

  const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  const getRandomPiece = (): Piece => {
    const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    const { shape, color } = SHAPES[key];
    return {
      shape: shape.map(row => [...row]),
      color,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0
    };
  };

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.board = createBoard();
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.lines = 0;
      gameData.current.combo = 0;
      setScore(0);
      setLives(settings.lives);
      setCombo(0);
      setLines(0);
    } else {
      gameData.current.lives = 1;
      setLives(1);
      // Clear bottom rows
      for (let i = 0; i < 5; i++) {
        gameData.current.board.pop();
        gameData.current.board.unshift(Array(COLS).fill(null));
      }
    }
    gameData.current.current = getRandomPiece();
    gameData.current.dropTimer = 0;
    gameData.current.dropInterval = 50 / settings.speedMultiplier;
    gameData.current.particles = [];
    setNextPieceKey(SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)]);
  };

  const collides = (piece: Piece, dx: number, dy: number, newShape?: number[][]): boolean => {
    const shape = newShape || piece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nx = piece.x + c + dx;
          const ny = piece.y + r + dy;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && gameData.current.board[ny][nx]) return true;
        }
      }
    }
    return false;
  };

  const rotatePiece = (piece: Piece): number[][] => {
    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];
    for (let c = 0; c < cols; c++) {
      rotated.push([]);
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c].push(shape[r][c]);
      }
    }
    return rotated;
  };

  const lockPiece = () => {
    const piece = gameData.current.current;
    if (!piece) return;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] && piece.y + r >= 0) {
          gameData.current.board[piece.y + r][piece.x + c] = piece.color;
        }
      }
    }

    playGameSound('brick', soundEnabled);
    clearLines();
    spawnPiece();
  };

  const clearLines = () => {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (gameData.current.board[r].every(cell => cell !== null)) {
        // Add particles
        for (let c = 0; c < COLS; c++) {
          const color = gameData.current.board[r][c] || '#fff';
          for (let i = 0; i < 3; i++) {
            gameData.current.particles.push({
              x: c * BLOCK + BLOCK / 2,
              y: r * BLOCK + BLOCK / 2,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 30 + Math.random() * 20,
              color,
              size: 3 + Math.random() * 3
            });
          }
        }
        gameData.current.board.splice(r, 1);
        gameData.current.board.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || 800;
      gameData.current.score += points;
      gameData.current.lines += cleared;
      gameData.current.combo++;
      setScore(gameData.current.score);
      setLines(gameData.current.lines);
      setCombo(gameData.current.combo);
      if (gameData.current.score > highScore) setHighScore(gameData.current.score);
      if (cleared > 1) playGameSound('combo', soundEnabled);
      else playGameSound('powerup', soundEnabled);

      // Speed up
      gameData.current.dropInterval = Math.max(8, 50 / settings.speedMultiplier - gameData.current.lines * 0.5);
    }
  };

  const spawnPiece = () => {
    const piece = getRandomPiece();
    gameData.current.current = piece;

    if (collides(piece, 0, 0)) {
      handleLifeLost();
    }
  };

  const handleLifeLost = () => {
    gameData.current.lives--;
    setLives(gameData.current.lives);
    gameData.current.combo = 0;
    setCombo(0);
    playGameSound('hit', soundEnabled);

    if (gameData.current.lives <= 0) {
      if (questions.length > 0) {
        const q = questions[Math.floor(Math.random() * questions.length)];
        setCurrentQuestion(q);
        setGameState('QUESTION');
      } else {
        setGameState('GAME_OVER');
      }
    } else {
      // Clear board partially and continue
      for (let i = 0; i < 5; i++) {
        gameData.current.board.pop();
        gameData.current.board.unshift(Array(COLS).fill(null));
      }
      gameData.current.current = getRandomPiece();
    }
  };

  const moveDown = () => {
    const piece = gameData.current.current;
    if (!piece) return;

    if (!collides(piece, 0, 1)) {
      piece.y++;
    } else {
      lockPiece();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || !gameData.current.current) return;

      const piece = gameData.current.current;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (!collides(piece, -1, 0)) piece.x--;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (!collides(piece, 1, 0)) piece.x++;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (!collides(piece, 0, 1)) piece.y++;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W': {
          const rotated = rotatePiece(piece);
          if (!collides(piece, 0, 0, rotated)) {
            piece.shape = rotated;
          } else if (!collides(piece, -1, 0, rotated)) {
            piece.x--;
            piece.shape = rotated;
          } else if (!collides(piece, 1, 0, rotated)) {
            piece.x++;
            piece.shape = rotated;
          }
          playGameSound('flap', soundEnabled);
          break;
        }
        case ' ':
          // Hard drop
          while (!collides(piece, 0, 1)) {
            piece.y++;
          }
          lockPiece();
          break;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, soundEnabled]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let lastTime = 0;

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // Background
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(W, r * BLOCK);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, H);
        ctx.stroke();
      }

      if (gameState === 'PLAYING') {
        // Update drop timer
        gameData.current.dropTimer += deltaTime / 16.67; // Convert to frames
        if (gameData.current.dropTimer >= gameData.current.dropInterval) {
          gameData.current.dropTimer = 0;
          moveDown();
        }

        // Update particles
        gameData.current.particles = gameData.current.particles
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 1
          }))
          .filter(p => p.life > 0);
      }

      // Draw board
      gameData.current.board.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            drawBlock(ctx, c * BLOCK, r * BLOCK, cell);
          }
        });
      });

      // Draw particles
      gameData.current.particles.forEach(p => {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw current piece
      const piece = gameData.current.current;
      if (piece && gameState === 'PLAYING') {
        // Ghost piece
        let ghostY = piece.y;
        while (!collides(piece, 0, ghostY - piece.y + 1)) ghostY++;
        ctx.globalAlpha = 0.25;
        piece.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell) {
              ctx.fillStyle = piece.color;
              ctx.fillRect((piece.x + c) * BLOCK + 1, (ghostY + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
            }
          });
        });
        ctx.globalAlpha = 1;

        // Actual piece
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = skin === 'TETRIS_RETRO' ? 0 : 10;
        piece.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell) {
              drawBlock(ctx, (piece.x + c) * BLOCK, (piece.y + r) * BLOCK, piece.color);
            }
          });
        });
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'GAME_OVER' && onGameOver) {
      onGameOver(score);
    }
  }, [gameState, score, onGameOver]);

  const handleStart = () => {
    initGame();
    setGameState('PLAYING');
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      playGameSound('correct', soundEnabled);
      if (addCoins) addCoins(10);
      initGame(true);
      setGameState('PLAYING');
    } else {
      playGameSound('wrong', soundEnabled);
      setGameState('GAME_OVER');
    }
  };

  // Next piece preview
  const nextPieceShape = SHAPES[nextPieceKey]?.shape || [[1]];
  const nextPieceColor = SHAPES[nextPieceKey]?.color || '#fff';

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto items-center lg:items-stretch">
      <div className="flex-1 w-full bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl flex flex-col max-w-4xl">
        <GameHUD
          score={score}
          highScore={highScore}
          lives={lives}
          maxLives={Math.max(lives, settings.lives)}
          combo={combo}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          onBack={onBack}
          difficulty={difficulty}
        />

        <div className="flex gap-4 justify-center">
          <div className="relative border-4 border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner" style={{ maxHeight: '70vh' }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onClick={() => gameState === 'START' && handleStart()}
              className="w-auto h-auto max-h-[70vh] cursor-pointer"
              style={{ imageRendering: 'pixelated' }}
            />

            {gameState === 'START' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
                <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">🧩 TETRİS</h2>
                <p className="text-sm text-slate-300 font-medium mb-5 max-w-xs">
                  Blokları yerleştir, satırları tamamla!
                </p>
                <button
                  onClick={handleStart}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl transition active:scale-95"
                >
                  Oyuna Başla
                </button>
              </div>
            )}

            {gameState === 'QUESTION' && currentQuestion && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 p-4">
                <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
              </div>
            )}

            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center backdrop-blur-md">
                <div className="text-red-500 font-black text-3xl tracking-widest mb-1 animate-bounce">GAME OVER</div>
                <div className="text-amber-400 font-mono text-xl font-black mb-1">Skor: {score}</div>
                <p className="text-xs text-slate-400 mb-6">En İyi: {highScore}</p>
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" /> Tekrar Oyna
                </button>
              </div>
            )}
          </div>

          {/* Side panel - hidden on mobile */}
          <div className="hidden sm:flex flex-col gap-3">
            <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 text-center">Sıradaki</div>
              <div className="flex justify-center" style={{ width: nextPieceShape[0].length * 16, height: nextPieceShape.length * 16 }}>
                {nextPieceShape.map((row, r) =>
                  row.map((cell, c) =>
                    cell ? (
                      <div
                        key={`${r}-${c}`}
                        className="absolute rounded-sm"
                        style={{
                          left: c * 16,
                          top: r * 16,
                          width: 14,
                          height: 14,
                          backgroundColor: nextPieceColor
                        }}
                      />
                    ) : null
                  )
                )}
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Satırlar</div>
              <div className="text-xl font-black text-amber-400 font-mono">{lines}</div>
            </div>
          </div>
        </div>

        {/* Mobile controls for Tetris */}
        <div className="mt-4 flex flex-col items-center gap-3 sm:hidden select-none">
          <div className="flex gap-4">
            <button
              onTouchStart={() => {
                const piece = gameData.current.current;
                if (piece && !collides(piece, -1, 0)) piece.x--;
              }}
              className="bg-slate-800 active:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 w-16 h-16 rounded-xl font-bold flex items-center justify-center text-xl shadow-md"
            >
              ◀
            </button>
            <button
              onTouchStart={() => {
                const piece = gameData.current.current;
                if (piece) {
                  const rotated = rotatePiece(piece);
                  if (!collides(piece, 0, 0, rotated)) piece.shape = rotated;
                  else if (!collides(piece, -1, 0, rotated)) { piece.x--; piece.shape = rotated; }
                  else if (!collides(piece, 1, 0, rotated)) { piece.x++; piece.shape = rotated; }
                  playGameSound('flap', soundEnabled);
                }
              }}
              className="bg-indigo-600 active:bg-indigo-500 active:scale-95 border border-indigo-500 text-white w-16 h-16 rounded-full font-bold flex items-center justify-center text-xl shadow-md"
            >
              ⟳
            </button>
            <button
              onTouchStart={() => {
                const piece = gameData.current.current;
                if (piece && !collides(piece, 1, 0)) piece.x++;
              }}
              className="bg-slate-800 active:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 w-16 h-16 rounded-xl font-bold flex items-center justify-center text-xl shadow-md"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onTouchStart={() => {
                const piece = gameData.current.current;
                if (piece && !collides(piece, 0, 1)) piece.y++;
              }}
              className="bg-slate-800 active:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 px-6 py-3 rounded-xl font-bold text-sm"
            >
              Yavaş İndir ▼
            </button>
            <button
              onTouchStart={() => {
                const piece = gameData.current.current;
                if (piece) {
                  while (!collides(piece, 0, 1)) piece.y++;
                  lockPiece();
                }
              }}
              className="bg-emerald-600 active:bg-emerald-500 active:scale-95 border border-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md"
            >
              Hızlı Düşür ⚡
            </button>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🧩 Tetris</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>←→ <strong className="text-white">Hareket:</strong> Sol/Sağ veya A/D</p>
          <p>↓ <strong className="text-white">Hızlı:</strong> Aşağı veya S</p>
          <p>↑ <strong className="text-white">Döndür:</strong> Yukarı veya W</p>
          <p>␣ <strong className="text-white">Düşür:</strong> Boşluk</p>
          <p>🎯 <strong className="text-emerald-300">Amaç:</strong> Satırları tamamla</p>
          <p>⚡ <strong className="text-amber-300">Hız:</strong> Her satırda artar</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 text-[9px]">
          {Object.entries(SHAPES).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: val.color }}></div>
              <span className="text-slate-300">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
