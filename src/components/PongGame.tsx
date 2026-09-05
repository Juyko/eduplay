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

const W = 600;
const H = 400;
const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_R = 8;

export default function PongGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const gameData = useRef({
    player: { x: 20, y: H / 2 - PADDLE_H / 2, speed: 7 },
    ai: { x: W - 20 - PADDLE_W, y: H / 2 - PADDLE_H / 2, speed: 3.5 * settings.speedMultiplier },
    ball: { x: W / 2, y: H / 2, vx: 5 * settings.speedMultiplier, vy: 3 * settings.speedMultiplier },
    trail: [] as { x: number; y: number; alpha: number }[],
    keys: {} as Record<string, boolean>,
    mouseY: H / 2,
    score: 0,
    lives: settings.lives,
    combo: 0,
    rally: 0
  });

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.combo = 0;
      setScore(0); setLives(settings.lives); setCombo(0);
    } else {
      gameData.current.lives = 1;
      setLives(1);
    }
    gameData.current.ball = { x: W / 2, y: H / 2, vx: 5 * settings.speedMultiplier * (Math.random() > 0.5 ? 1 : -1), vy: 3 * settings.speedMultiplier * (Math.random() > 0.5 ? 1 : -1) };
    gameData.current.player.y = H / 2 - PADDLE_H / 2;
    gameData.current.ai.y = H / 2 - PADDLE_H / 2;
    gameData.current.trail = [];
    gameData.current.rally = 0;
  };

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) e.preventDefault();
    };
    const handleUp = (e: KeyboardEvent) => { gameData.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
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
      if (skin === 'PONG_ICE') {
        ctx.fillStyle = '#e0f2fe'; // sky-100
      } else {
        ctx.fillStyle = '#0a0e1a';
      }
      ctx.fillRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      if (gameState === 'PLAYING') {
        const p = gameData.current.player;
        const ai = gameData.current.ai;
        const b = gameData.current.ball;
        const k = gameData.current.keys;

        // Player movement
        if (k['ArrowUp'] || k['w']) p.y -= p.speed;
        if (k['ArrowDown'] || k['s']) p.y += p.speed;
        // Mouse
        p.y += (gameData.current.mouseY - PADDLE_H / 2 - p.y) * 0.15;
        p.y = Math.max(0, Math.min(H - PADDLE_H, p.y));

        // AI movement (follows ball with delay)
        const aiTarget = b.y - PADDLE_H / 2;
        if (ai.y < aiTarget - 10) ai.y += ai.speed;
        else if (ai.y > aiTarget + 10) ai.y -= ai.speed;
        ai.y = Math.max(0, Math.min(H - PADDLE_H, ai.y));

        // Ball movement
        b.x += b.vx;
        b.y += b.vy;

        // Trail
        gameData.current.trail.push({ x: b.x, y: b.y, alpha: 1 });
        gameData.current.trail = gameData.current.trail.filter(t => {
          t.alpha -= 0.08;
          return t.alpha > 0;
        });

        // Wall bounce
        if (b.y - BALL_R < 0 || b.y + BALL_R > H) {
          b.vy *= -1;
          b.y = Math.max(BALL_R, Math.min(H - BALL_R, b.y));
          playGameSound('flap', soundEnabled);
        }

        // Paddle collision - Player
        if (b.x - BALL_R < p.x + PADDLE_W && b.x + BALL_R > p.x &&
            b.y > p.y && b.y < p.y + PADDLE_H && b.vx < 0) {
          b.vx *= -1.05; // Speed up slightly
          b.x = p.x + PADDLE_W + BALL_R;
          const hitPos = (b.y - p.y) / PADDLE_H - 0.5;
          b.vy = hitPos * 8;
          gameData.current.rally++;
          playGameSound('brick', soundEnabled);
        }

        // Paddle collision - AI
        if (b.x + BALL_R > ai.x && b.x - BALL_R < ai.x + PADDLE_W &&
            b.y > ai.y && b.y < ai.y + PADDLE_H && b.vx > 0) {
          b.vx *= -1.05;
          b.x = ai.x - BALL_R;
          const hitPos = (b.y - ai.y) / PADDLE_H - 0.5;
          b.vy = hitPos * 8;
          gameData.current.rally++;
          playGameSound('brick', soundEnabled);
        }

        // Limit ball speed
        const maxSpeed = 12 * settings.speedMultiplier;
        b.vx = Math.max(-maxSpeed, Math.min(maxSpeed, b.vx));
        b.vy = Math.max(-maxSpeed, Math.min(maxSpeed, b.vy));

        // Score - ball passed AI (player scores)
        if (b.x > W + BALL_R) {
          gameData.current.rally = 0;
          gameData.current.combo++;
          const bonus = gameData.current.combo > 1 ? gameData.current.combo * 5 : 0;
          gameData.current.score += 10 + bonus;
          setScore(gameData.current.score);
          setCombo(gameData.current.combo);
          if (gameData.current.score > highScore) setHighScore(gameData.current.score);
          if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);
          else playGameSound('powerup', soundEnabled);
          // Reset ball
          b.x = W / 2;
          b.y = H / 2;
          b.vx = 5 * settings.speedMultiplier;
          b.vy = 3 * settings.speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        }

        // Lose - ball passed player
        if (b.x < -BALL_R) {
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
            b.x = W / 2;
            b.y = H / 2;
            b.vx = 5 * settings.speedMultiplier;
            b.vy = 3 * settings.speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
          }
        }

        // Draw trail
        gameData.current.trail.forEach(t => {
          ctx.globalAlpha = t.alpha * 0.5;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(t.x, t.y, BALL_R * t.alpha, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw paddles
        if (skin === 'PONG_NEON') {
          ctx.shadowColor = '#d946ef'; // fuchsia
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#fdf4ff';
          ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);

          ctx.shadowColor = '#22c55e'; // green
          ctx.fillStyle = '#f0fdf4';
          ctx.fillRect(ai.x, ai.y, PADDLE_W, PADDLE_H);
        } else if (skin === 'PONG_ICE') {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#38bdf8'; // sky-400
          ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(p.x + 2, p.y + 2, PADDLE_W - 4, PADDLE_H - 4);

          ctx.fillStyle = '#f87171';
          ctx.fillRect(ai.x, ai.y, PADDLE_W, PADDLE_H);
          ctx.fillStyle = '#fef2f2';
          ctx.fillRect(ai.x + 2, ai.y + 2, PADDLE_W - 4, PADDLE_H - 4);
        } else {
          // Default Player paddle (glow)
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);

          // AI paddle
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(ai.x, ai.y, PADDLE_W, PADDLE_H);
        }
        ctx.shadowBlur = 0;

        // Draw ball
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rally counter
        if (gameData.current.rally > 3) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`RALLY: ${gameData.current.rally}`, W / 2, 30);
        }
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
            width={W}
            height={H}
            onClick={() => gameState === 'START' && handleStart()}
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              gameData.current.mouseY = ((e.clientY - rect.top) / rect.height) * H;
            }}
            onTouchMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const touch = e.touches[0];
              gameData.current.mouseY = ((touch.clientY - rect.top) / rect.height) * H;
            }}
            className="w-full h-auto max-h-[70vh] cursor-pointer"
            style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">🏓 PONG</h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Bilgisayara karşı oyna! Topu rakibin sahasından geçir, kaçırma!
              </p>
              <div className="flex gap-8 mb-5 text-xs">
                <div className="text-blue-400">
                  <div className="w-3 h-12 bg-blue-500 rounded mx-auto mb-1"></div>
                  <span>Siz</span>
                </div>
                <div className="text-red-400">
                  <div className="w-3 h-12 bg-red-500 rounded mx-auto mb-1"></div>
                  <span>Rakip</span>
                </div>
              </div>
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
              <button onClick={handleStart} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl">
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Tekrar Oyna
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🏓 Pong Kuralları</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>🖱️ <strong className="text-white">Hareket:</strong> Mouse veya ↑↓ tuşları</p>
          <p>🎯 <strong className="text-blue-300">Amaç:</strong> Topu rakibin sahasından geçir</p>
          <p>⚡ <strong className="text-amber-300">Rally:</strong> Her vuruşta hız artar</p>
          <p>🔥 <strong className="text-orange-300">Combo:</strong> Üst üste skorlarda bonus</p>
          <p>💀 <strong className="text-red-300">Ölüm:</strong> Top senin sahana geçerse</p>
        </div>
      </div>
    </div>
  );
}
