import { useRef, useEffect, useState } from 'react';
import { Question, Difficulty } from '../utils/questionExtractor';
import { RefreshCw } from 'lucide-react';
import GameHUD from './GameHUD';
import QuestionModal from './QuestionModal';
import {
  playGameSound, getDifficultySettings,
  createExplosion, updateParticles, drawParticles, Particle
} from '../utils/gameUtils';

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

const W = 600;
const H = 400;
const PADDLE_W = 90;
const PADDLE_H = 12;
const BALL_R = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = (W - 40) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_PAD = 4;

interface Brick {
  x: number;
  y: number;
  hp: number;
  color: string;
  points: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'multiball' | 'extralife' | 'widepaddle' | 'slowball' | 'fireball';
  speed: number;
  icon: string;
  color: string;
  label: string;
}

export default function BreakoutGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER' | 'WIN'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [activePowerUps, setActivePowerUps] = useState<Map<string, number>>(new Map());

  const gameData = useRef({
    paddle: { x: W / 2 - PADDLE_W / 2, y: H - 30, baseWidth: PADDLE_W, width: PADDLE_W },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    score: 0,
    lives: settings.lives,
    combo: 0,
    keys: {} as Record<string, boolean>,
    mouseX: W / 2,
    widePaddleTimer: 0,
    fireBallTimer: 0,
    slowBallTimer: 0
  });

  const POWERUP_DEFS: Record<string, { icon: string; color: string; label: string }> = {
    multiball: { icon: '×3', color: '#06b6d4', label: '3× Top' },
    extralife: { icon: '❤️', color: '#ef4444', label: '+3 Can' },
    widepaddle: { icon: '↔', color: '#f59e0b', label: 'Geniş Palet' },
    slowball: { icon: '🐢', color: '#a855f7', label: 'Yavaş Top' },
    fireball: { icon: '🔥', color: '#dc2626', label: 'Ateş Topu' }
  };

  const initBricks = () => {
    const bricks: Brick[] = [];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#a855f7'];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: 20 + c * BRICK_W,
          y: 50 + r * (BRICK_H + BRICK_PAD),
          hp: r === 0 ? 2 : 1,
          color: colors[r],
          points: (BRICK_ROWS - r) * 10
        });
      }
    }
    return bricks;
  };

  const createBall = (x: number, y: number, vx: number, vy: number): Ball => ({ x, y, vx, vy });

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.bricks = initBricks();
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.combo = 0;
      gameData.current.particles = [];
      setScore(0); setLives(settings.lives); setCombo(0);
    } else {
      gameData.current.lives = 1;
      gameData.current.combo = 0;
      setLives(1); setCombo(0);
    }
    gameData.current.paddle = { x: W / 2 - PADDLE_W / 2, y: H - 30, baseWidth: PADDLE_W, width: PADDLE_W };
    gameData.current.balls = [createBall(W / 2, H - 50, 4 * settings.speedMultiplier, -4 * settings.speedMultiplier)];
    gameData.current.powerUps = [];
    gameData.current.widePaddleTimer = 0;
    gameData.current.fireBallTimer = 0;
    gameData.current.slowBallTimer = 0;
    setActivePowerUps(new Map());
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = true;
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => { gameData.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (gameState === 'PLAYING') {
        const p = gameData.current.paddle;
        const keys = gameData.current.keys;

        // Paddle movement
        if (keys['ArrowLeft'] || keys['a']) p.x -= 8;
        if (keys['ArrowRight'] || keys['d']) p.x += 8;
        p.x += (gameData.current.mouseX - p.width / 2 - p.x) * 0.18;
        p.x = Math.max(0, Math.min(W - p.width, p.x));

        // Powerup timers
        if (gameData.current.widePaddleTimer > 0) {
          gameData.current.widePaddleTimer--;
          p.width = p.baseWidth * 1.8;
          if (gameData.current.widePaddleTimer <= 0) {
            p.width = p.baseWidth;
          }
        }

        const speedMult = gameData.current.slowBallTimer > 0 ? 0.5 : 1;
        if (gameData.current.slowBallTimer > 0) gameData.current.slowBallTimer--;

        if (gameData.current.fireBallTimer > 0) gameData.current.fireBallTimer--;

        // Update active powerup display
        const apu = new Map<string, number>();
        if (gameData.current.widePaddleTimer > 0) apu.set('Geniş Palet', gameData.current.widePaddleTimer / 60);
        if (gameData.current.slowBallTimer > 0) apu.set('Yavaş Top', gameData.current.slowBallTimer / 60);
        if (gameData.current.fireBallTimer > 0) apu.set('Ateş Topu', gameData.current.fireBallTimer / 60);
        setActivePowerUps(apu);

        // Ball movement
        for (let bi = gameData.current.balls.length - 1; bi >= 0; bi--) {
          const b = gameData.current.balls[bi];
          b.x += b.vx * speedMult;
          b.y += b.vy * speedMult;

          // Wall collisions
          if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx *= -1; }
          if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx *= -1; }
          if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy *= -1; }

          // Bottom = lose this ball
          if (b.y - BALL_R > H) {
            gameData.current.balls.splice(bi, 1);
          }
        }

        // All balls lost = lose life
        if (gameData.current.balls.length === 0) {
          handleLifeLost();
        }

        // Ball-paddle collision
        gameData.current.balls.forEach(b => {
          if (b.y + BALL_R > p.y && b.y + BALL_R < p.y + PADDLE_H + 5 &&
              b.x > p.x && b.x < p.x + p.width && b.vy > 0) {
            b.vy *= -1;
            const hitPos = (b.x - p.x) / p.width - 0.5;
            b.vx = hitPos * 8;
          }
        });

        // Ball-brick collisions
        for (let bi = 0; bi < gameData.current.balls.length; bi++) {
          const b = gameData.current.balls[bi];
          for (let i = gameData.current.bricks.length - 1; i >= 0; i--) {
            const br = gameData.current.bricks[i];
            if (b.x + BALL_R > br.x && b.x - BALL_R < br.x + BRICK_W &&
                b.y + BALL_R > br.y && b.y - BALL_R < br.y + BRICK_H) {
              br.hp--;

              const isFire = gameData.current.fireBallTimer > 0;
              if (br.hp <= 0 || isFire) {
                gameData.current.particles = [
                  ...gameData.current.particles,
                  ...createExplosion(br.x + BRICK_W / 2, br.y + BRICK_H / 2, br.color, 10)
                ];

                gameData.current.combo++;
                const comboBonus = Math.max(1, gameData.current.combo - 1) * 5;
                const points = br.points + (gameData.current.combo > 1 ? comboBonus : 0);
                gameData.current.score += points;
                setScore(gameData.current.score);
                setCombo(gameData.current.combo);

                if (gameData.current.score > highScore) setHighScore(gameData.current.score);
                if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);
                else playGameSound('brick', soundEnabled);

                // Drop power-up chance reduced to 10%
                if (Math.random() < 0.1) {
                  const types: PowerUp['type'][] = ['multiball', 'extralife', 'widepaddle', 'slowball', 'fireball'];
                  const type = types[Math.floor(Math.random() * types.length)];
                  const def = POWERUP_DEFS[type];
                  gameData.current.powerUps.push({
                    x: br.x + BRICK_W / 2,
                    y: br.y,
                    type,
                    speed: 2,
                    icon: def.icon,
                    color: def.color,
                    label: def.label
                  });
                }

                if (isFire) {
                  gameData.current.bricks.splice(i, 1);
                } else {
                  gameData.current.bricks.splice(i, 1);
                  // Reflect ball
                  const overlapX = Math.min(b.x + BALL_R - br.x, br.x + BRICK_W - (b.x - BALL_R));
                  const overlapY = Math.min(b.y + BALL_R - br.y, br.y + BRICK_H - (b.y - BALL_R));
                  if (overlapX < overlapY) b.vx *= -1;
                  else b.vy *= -1;
                }

                if (gameData.current.bricks.length === 0) {
                  setGameState('WIN');
                  return;
                }
              } else {
                playGameSound('brick', soundEnabled);
                const overlapX = Math.min(b.x + BALL_R - br.x, br.x + BRICK_W - (b.x - BALL_R));
                const overlapY = Math.min(b.y + BALL_R - br.y, br.y + BRICK_H - (b.y - BALL_R));
                if (overlapX < overlapY) b.vx *= -1;
                else b.vy *= -1;
              }
              break;
            }
          }
        }

        // Update powerups
        for (let i = gameData.current.powerUps.length - 1; i >= 0; i--) {
          const pw = gameData.current.powerUps[i];
          pw.y += pw.speed;

          if (pw.y > H + 20) {
            gameData.current.powerUps.splice(i, 1);
            continue;
          }

          // Collect
          if (pw.x > p.x && pw.x < p.x + p.width && pw.y + 10 > p.y && pw.y < p.y + PADDLE_H + 5) {
            gameData.current.powerUps.splice(i, 1);
            activatePowerUp(pw.type);
          }
        }

        gameData.current.particles = updateParticles(gameData.current.particles);

        // Draw bricks
        gameData.current.bricks.forEach(br => {
          ctx.fillStyle = br.color;
          ctx.fillRect(br.x, br.y, BRICK_W - 2, BRICK_H);
          if (br.hp > 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(br.x, br.y, BRICK_W - 2, 4);
          }
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(br.x, br.y, BRICK_W - 2, 2);
        });

        drawParticles(ctx, gameData.current.particles);

        // Draw powerups
        gameData.current.powerUps.forEach(pw => {
          ctx.save();
          ctx.translate(pw.x, pw.y);
          ctx.shadowColor = pw.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = pw.color;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pw.icon, 0, 0);
          ctx.restore();
        });

        // Draw paddle
        if (skin === 'BREAKOUT_NEON') {
          ctx.shadowColor = '#d946ef'; // fuchsia-500
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#d946ef';
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.width, PADDLE_H, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fdf4ff';
          ctx.fillRect(p.x + 10, p.y + 2, p.width - 20, PADDLE_H - 4);
        } else if (skin === 'BREAKOUT_SHIELD') {
          ctx.fillStyle = '#1d4ed8'; // blue-700
          ctx.beginPath();
          ctx.ellipse(p.x + p.width / 2, p.y + PADDLE_H / 2, p.width / 2, PADDLE_H, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444'; // red-500
          ctx.beginPath();
          ctx.ellipse(p.x + p.width / 2, p.y + PADDLE_H / 2, p.width / 3, PADDLE_H - 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f8fafc'; // white center
          ctx.beginPath();
          ctx.ellipse(p.x + p.width / 2, p.y + PADDLE_H / 2, p.width / 6, PADDLE_H - 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Default
          const padGrad = ctx.createLinearGradient(0, p.y, 0, p.y + PADDLE_H);
          padGrad.addColorStop(0, '#60a5fa');
          padGrad.addColorStop(1, '#3b82f6');
          ctx.fillStyle = padGrad;
          ctx.fillRect(p.x, p.y, p.width, PADDLE_H);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(p.x, p.y, p.width, 2);
        }

        // Draw balls
        gameData.current.balls.forEach(b => {
          const isFire = gameData.current.fireBallTimer > 0;
          ctx.shadowColor = isFire ? '#ef4444' : '#fbbf24';
          ctx.shadowBlur = isFire ? 20 : 15;
          ctx.fillStyle = isFire ? '#ef4444' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
          ctx.fill();

          if (isFire) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R - 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if ((gameState === 'GAME_OVER' || gameState === 'WIN') && onGameOver) {
      onGameOver(score);
    }
  }, [gameState, score, onGameOver]);

  const activatePowerUp = (type: string) => {
    playGameSound('powerup', soundEnabled);
    switch (type) {
      case 'multiball': {
        // 3x balls: split each current ball into 3
        const currentBalls = [...gameData.current.balls];
        gameData.current.balls = [];
        currentBalls.forEach(b => {
          gameData.current.balls.push(b);
          gameData.current.balls.push(createBall(b.x, b.y, -b.vx * 0.8, -Math.abs(b.vy) * 0.8));
          gameData.current.balls.push(createBall(b.x, b.y, b.vx * 0.8, -Math.abs(b.vy) * 0.8));
        });
        break;
      }
      case 'extralife':
        gameData.current.lives += 3;
        setLives(gameData.current.lives);
        break;
      case 'widepaddle':
        gameData.current.widePaddleTimer = 600; // 10 seconds
        break;
      case 'slowball':
        gameData.current.slowBallTimer = 600;
        break;
      case 'fireball':
        gameData.current.fireBallTimer = 480; // 8 seconds
        break;
    }
  };

  const handleLifeLost = () => {
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
      gameData.current.balls = [createBall(W / 2, H - 50, 4 * settings.speedMultiplier, -4 * settings.speedMultiplier)];
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
          score={score} highScore={highScore} lives={lives} maxLives={Math.max(lives, settings.lives)}
          combo={combo} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
          onBack={onBack} difficulty={difficulty}
        />

        {/* Active power-ups bar */}
        {activePowerUps.size > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {Array.from(activePowerUps.entries()).map(([name, seconds]) => (
              <div key={name} className="bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                {name}: {Math.ceil(seconds)}s
              </div>
            ))}
          </div>
        )}

        <div className="relative border-4 border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner" style={{ maxHeight: '70vh' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={() => gameState === 'START' && handleStart()}
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              gameData.current.mouseX = ((e.clientX - rect.left) / rect.width) * W;
            }}
            onTouchMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const touch = e.touches[0];
              gameData.current.mouseX = ((touch.clientX - rect.left) / rect.width) * W;
            }}
            className="w-full h-auto max-h-[70vh] cursor-pointer"
            style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4 text-center backdrop-blur-sm z-30 overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase mb-1">🧱 TUĞLA KIRMA</h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mb-3 max-w-xs">
                Tuğlaları kır, güçlendirmeleri topla!
              </p>
              
              {/* Compact powerups for mobile */}
              <div className="grid grid-cols-3 gap-1.5 mb-4 max-w-sm w-full text-[9px] sm:text-[10px] text-slate-300">
                <div className="bg-cyan-500/10 border border-cyan-500/20 p-1.5 rounded-lg">
                  <span className="text-cyan-400 font-black text-sm">×3</span><br/>3× Top
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-1.5 rounded-lg">
                  <span className="text-sm">❤️</span><br/>+3 Can
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg">
                  <span className="text-amber-400 font-black text-sm">↔</span><br/>Geniş
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 p-1.5 rounded-lg">
                  <span className="text-sm">🐢</span><br/>Yavaş
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-1.5 rounded-lg col-span-2">
                  <span className="text-orange-400 font-black text-sm">🔥</span><br/>Ateş Topu
                </div>
              </div>

              <button
                onClick={handleStart}
                className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300 text-slate-950 font-black px-8 py-3 rounded-2xl border-b-4 border-emerald-700 shadow-lg active:border-b-0 active:translate-y-1 transition-all text-base tracking-wider z-40 touch-manipulation cursor-pointer"
              >
                OYUNA BAŞLA 🎮
              </button>
            </div>
          )}

          {gameState === 'QUESTION' && currentQuestion && (
            <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
          )}

          {gameState === 'WIN' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center backdrop-blur-md">
              <div className="text-emerald-400 font-black text-4xl tracking-widest mb-2 animate-bounce">🏆 KAZANDIN!</div>
              <div className="text-amber-400 font-mono text-2xl font-black mb-6">Skor: {score}</div>
              <button onClick={handleStart} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl">
                <RefreshCw className="w-4 h-4" /> Yeni Tur
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center backdrop-blur-md">
              <div className="text-red-500 font-black text-3xl tracking-widest mb-1 animate-bounce">GAME OVER</div>
              <div className="text-amber-400 font-mono text-xl font-black mb-1">Skor: {score}</div>
              <p className="text-xs text-slate-400 mb-6">En İyi: {highScore}</p>
              <button onClick={handleStart} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl">
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Tekrar Oyna
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🧱 Tuğla Kırma</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-4">
          <p>🖱️ <strong className="text-white">Hareket:</strong> Mouse, Sol/Sağ ok veya A/D</p>
          <p>🎯 <strong className="text-white">Amaç:</strong> Tüm tuğlaları kır</p>
          <p>🔴 <strong className="text-red-300">Kırmızı tuğla:</strong> 2 vuruşa dayanır</p>
          <p>🔥 <strong className="text-orange-300">Combo:</strong> Pedala değmeden kırarsan bonus!</p>
        </div>

        <h5 className="text-xs font-black text-amber-300 uppercase mb-2 flex items-center gap-1">
          ⚡ Güçlendirmeler
        </h5>
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-2 rounded-lg">
            <span className="text-cyan-300 font-black text-sm w-8 text-center">×</span>
            <div>
              <div className="text-cyan-300 font-bold">3× Top</div>
              <div className="text-[10px] text-slate-400">Her topu 3'e böler</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2.5 py-2 rounded-lg">
            <span className="text-sm w-8 text-center">❤️</span>
            <div>
              <div className="text-red-300 font-bold">+3 Can</div>
              <div className="text-[10px] text-slate-400">3 can kazan</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 rounded-lg">
            <span className="text-amber-300 font-black text-sm w-8 text-center">↔</span>
            <div>
              <div className="text-amber-300 font-bold">Geniş Palet</div>
              <div className="text-[10px] text-slate-400">10 saniye 2× geniş</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-2.5 py-2 rounded-lg">
            <span className="text-sm w-8 text-center">🐢</span>
            <div>
              <div className="text-purple-300 font-bold">Yavaş Top</div>
              <div className="text-[10px] text-slate-400">10 saniye yarı hız</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-2.5 py-2 rounded-lg">
            <span className="text-sm w-8 text-center">🔥</span>
            <div>
              <div className="text-orange-300 font-bold">Ateş Topu</div>
              <div className="text-[10px] text-slate-400">8 saniye tuğlalardan direkt geçer!</div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-[10px] text-slate-500 italic">
          💡 Güçlendirmeler tuğla kırıldığında %20 ihtimalle düşer
        </div>
      </div>
    </div>
  );
}
