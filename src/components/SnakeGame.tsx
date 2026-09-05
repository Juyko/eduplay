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

const GRID_SIZE = 24;
const COLS = 20;
const ROWS = 15;

export default function SnakeGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const gameData = useRef({
    snake: [{ x: 10, y: 7 }],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 15, y: 7, color: '#f59e0b', special: false },
    speed: 8 / settings.speedMultiplier, // Reverted back to 8 for old fast speed
    frameCount: 0,
    score: 0,
    lives: settings.lives,
    combo: 0,
    touchStartPos: { x: 0, y: 0 }
  });

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.snake = [{ x: 10, y: 7 }];
      gameData.current.direction = { x: 1, y: 0 };
      gameData.current.nextDirection = { x: 1, y: 0 };
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.combo = 0;
      setScore(0);
      setLives(settings.lives);
      setCombo(0);
      placeFood();
    } else {
      // Revive: reset snake but keep score
      gameData.current.snake = [{ x: 10, y: 7 }];
      gameData.current.direction = { x: 1, y: 0 };
      gameData.current.nextDirection = { x: 1, y: 0 };
      gameData.current.lives = 1;
      gameData.current.combo = 0;
      setLives(1);
      setCombo(0);
    }
  };

  const placeFood = () => {
    const isSpecial = Math.random() < 0.15;
    let x = 0, y = 0;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (gameData.current.snake.some(s => s.x === x && s.y === y));

    gameData.current.food = {
      x, y,
      color: isSpecial ? '#a855f7' : '#f59e0b',
      special: isSpecial
    };
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const dir = gameData.current.direction;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir.y !== 1) {
        gameData.current.nextDirection = { x: 0, y: -1 };
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir.y !== -1) {
        gameData.current.nextDirection = { x: 0, y: 1 };
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir.x !== 1) {
        gameData.current.nextDirection = { x: -1, y: 0 };
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir.x !== -1) {
        gameData.current.nextDirection = { x: 1, y: 0 };
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let lastFrameTime = 0;

    const render = (time: number) => {
      if (!lastFrameTime) lastFrameTime = time;
      const dt = time - lastFrameTime;
      if (dt < 16.666) {
        raf = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = time - (dt % 16.666);
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
      }

      if (gameState === 'PLAYING') {
        gameData.current.frameCount++;

        if (gameData.current.frameCount >= gameData.current.speed) {
          gameData.current.frameCount = 0;
          gameData.current.direction = gameData.current.nextDirection;

          const head = gameData.current.snake[0];
          const newHead = {
            x: head.x + gameData.current.direction.x,
            y: head.y + gameData.current.direction.y
          };

          // Wall collision
          if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
            handleDeath();
          }
          // Self collision
          else if (gameData.current.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            handleDeath();
          } else {
            gameData.current.snake.unshift(newHead);

            // Food check
            if (newHead.x === gameData.current.food.x && newHead.y === gameData.current.food.y) {
              const isSpecial = gameData.current.food.special;
              const points = isSpecial ? 50 : 10;
              gameData.current.combo++;
              const comboBonus = Math.max(1, gameData.current.combo - 1) * 5;
              const totalPoints = points + (gameData.current.combo > 1 ? comboBonus : 0);

              gameData.current.score += totalPoints;
              setScore(gameData.current.score);
              setCombo(gameData.current.combo);

              if (gameData.current.score > highScore) setHighScore(gameData.current.score);

              playGameSound(isSpecial ? 'powerup' : 'eat', soundEnabled);
              if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);

              placeFood();

              // Speed up gradually
              if (gameData.current.score % 50 === 0 && gameData.current.speed > 3) {
                gameData.current.speed = Math.max(3, gameData.current.speed - 0.5);
              }
            } else {
              gameData.current.snake.pop();
            }
          }
        }

        // Draw food
        if (skin === 'SNAKE_FIRE') {
          // Fireball food
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(gameData.current.food.x * GRID_SIZE + GRID_SIZE / 2, gameData.current.food.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fcd34d';
          ctx.beginPath();
          ctx.arc(gameData.current.food.x * GRID_SIZE + GRID_SIZE / 2, gameData.current.food.y * GRID_SIZE + GRID_SIZE / 2 + 2, GRID_SIZE / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (skin === 'SNAKE_BONE') {
          // Bone skull food
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(gameData.current.food.x * GRID_SIZE + 2, gameData.current.food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(gameData.current.food.x * GRID_SIZE + 6, gameData.current.food.y * GRID_SIZE + 6, 4, 4);
          ctx.fillRect(gameData.current.food.x * GRID_SIZE + 14, gameData.current.food.y * GRID_SIZE + 6, 4, 4);
        } else {
          // Apple
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(
            gameData.current.food.x * GRID_SIZE + GRID_SIZE / 2,
            gameData.current.food.y * GRID_SIZE + GRID_SIZE / 2,
            GRID_SIZE / 2 - 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(
            gameData.current.food.x * GRID_SIZE + GRID_SIZE / 2 + 2,
            gameData.current.food.y * GRID_SIZE + GRID_SIZE / 2 - 6,
            4, 2, Math.PI / 4, 0, Math.PI * 2
          );
          ctx.fill();
        }

        // Draw snake
        gameData.current.snake.forEach((seg, index) => {
          const x = seg.x * GRID_SIZE;
          const y = seg.y * GRID_SIZE;
          
          let segmentColor = '#10b981';
          if (skin === 'SNAKE_FIRE') {
            segmentColor = index === 0 ? '#dc2626' : (index % 2 === 0 ? '#ea580c' : '#f97316');
          } else if (skin === 'SNAKE_BONE') {
            segmentColor = '#f1f5f9';
          } else {
            segmentColor = index === 0 ? '#059669' : '#10b981';
          }
          
          ctx.fillStyle = segmentColor;

          if (skin === 'SNAKE_BONE' && index > 0) {
            // Draw bone links
            ctx.fillRect(x + 4, y + 4, GRID_SIZE - 8, GRID_SIZE - 8);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(x + 8, y + 8, GRID_SIZE - 16, GRID_SIZE - 16);
          } else {
            ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
          }

          if (index === 0) {
            // Eyes
            ctx.fillStyle = skin === 'SNAKE_BONE' ? '#ef4444' : '#fff';
            const dir = gameData.current.direction;
            const eyeOffset = 4;
            const cx = seg.x * GRID_SIZE + GRID_SIZE / 2;
            const cy = seg.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.beginPath();
            ctx.arc(cx - dir.y * eyeOffset + dir.x * 2, cy + dir.x * eyeOffset + dir.y * 2, 2, 0, Math.PI * 2);
            ctx.arc(cx + dir.y * eyeOffset + dir.x * 2, cy - dir.x * eyeOffset + dir.y * 2, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
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

  const handleDeath = () => {
    gameData.current.lives--;
    setLives(gameData.current.lives);
    setCombo(0);
    gameData.current.combo = 0;
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
      // Reset snake position but keep score
      gameData.current.snake = [{ x: 15, y: 10 }];
      gameData.current.direction = { x: 1, y: 0 };
      gameData.current.nextDirection = { x: 1, y: 0 };
    }
  };

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

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto items-center lg:items-stretch">
      <div className="flex-1 w-full bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl flex flex-col max-w-4xl">
        <GameHUD
          score={score} highScore={highScore} lives={lives} maxLives={settings.lives}
          combo={combo} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
          onBack={onBack} difficulty={difficulty}
        />

        <div className="relative border-4 border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner" style={{ maxHeight: '70vh' }}>
          <canvas
            ref={canvasRef}
            width={COLS * GRID_SIZE}
            height={ROWS * GRID_SIZE}
            onClick={() => gameState === 'START' && handleStart()}
            onTouchStart={(e) => {
              if (gameState !== 'PLAYING') return;
              const touch = e.touches[0];
              gameData.current.touchStartPos = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchMove={(e) => {
              if (gameState !== 'PLAYING') return;
              e.preventDefault();
              const touch = e.touches[0];
              const dx = touch.clientX - gameData.current.touchStartPos.x;
              const dy = touch.clientY - gameData.current.touchStartPos.y;
              const minSwipe = 12;

              if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

              if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && gameData.current.direction.x !== -1) {
                  gameData.current.nextDirection = { x: 1, y: 0 };
                } else if (dx < 0 && gameData.current.direction.x !== 1) {
                  gameData.current.nextDirection = { x: -1, y: 0 };
                }
              } else {
                if (dy > 0 && gameData.current.direction.y !== -1) {
                  gameData.current.nextDirection = { x: 0, y: 1 };
                } else if (dy < 0 && gameData.current.direction.y !== 1) {
                  gameData.current.nextDirection = { x: 0, y: -1 };
                }
              }
              gameData.current.touchStartPos = { x: touch.clientX, y: touch.clientY };
            }}
            className="w-full h-auto max-h-[70vh] cursor-pointer touch-none"
            style={{ imageRendering: 'pixelated' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
                🐍 YILAN OYUNU
              </h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Yemleri topla, kuyruğunu uzat. Mor yıldız yemler 5x bonus verir!
              </p>
              <button onClick={handleStart} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl transition active:scale-95">
                Oyuna Başla
              </button>
            </div>
          )}

          {gameState === 'QUESTION' && currentQuestion && (
            <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center backdrop-blur-md">
              <div className="text-red-500 font-black text-3xl tracking-widest mb-1 animate-bounce">GAME OVER</div>
              <div className="text-amber-400 font-mono text-xl font-black mb-1">Skor: {score}</div>
              <p className="text-xs text-slate-400 mb-6">En İyi: {highScore}</p>
              <button onClick={handleStart} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl transition">
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls - Snake */}
        <div className="mt-4 sm:hidden">
          <div className="flex justify-center gap-3">
            <div className="grid grid-cols-3 gap-1 w-28">
              <div></div>
              <button onTouchStart={() => { if (gameData.current.direction.y !== 1) gameData.current.nextDirection = { x: 0, y: -1 }; }} className="bg-slate-800 active:bg-slate-700 p-3 rounded-xl text-slate-200 font-bold text-xl active:scale-95">▲</button>
              <div></div>
              <button onTouchStart={() => { if (gameData.current.direction.x !== 1) gameData.current.nextDirection = { x: -1, y: 0 }; }} className="bg-slate-800 active:bg-slate-700 p-3 rounded-xl text-slate-200 font-bold text-xl active:scale-95">◀</button>
              <button onTouchStart={() => { if (gameData.current.direction.y !== -1) gameData.current.nextDirection = { x: 0, y: 1 }; }} className="bg-slate-800 active:bg-slate-700 p-3 rounded-xl text-slate-200 font-bold text-xl active:scale-95">▼</button>
              <button onTouchStart={() => { if (gameData.current.direction.x !== -1) gameData.current.nextDirection = { x: 1, y: 0 }; }} className="bg-slate-800 active:bg-slate-700 p-3 rounded-xl text-slate-200 font-bold text-xl active:scale-95">▶</button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🐍 Yılan Kuralları</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>🎮 <strong className="text-white">Hareket:</strong> Yön tuşları veya WASD</p>
          <p>🍎 <strong className="text-amber-300">Sarı yem:</strong> +10 puan</p>
          <p>⭐ <strong className="text-purple-300">Mor yıldız:</strong> +50 puan (özel)</p>
          <p>🔥 <strong className="text-orange-300">Combo:</strong> Üst üste yem yedikçe bonus puan!</p>
          <p>💀 <strong className="text-red-300">Ölüm:</strong> Duvara veya kendine çarparsan</p>
          <p>💡 <strong className="text-emerald-300">Diriliş:</strong> Canların bittiğinde dosyadan soru sorulur</p>
        </div>
      </div>
    </div>
  );
}
