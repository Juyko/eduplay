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

export default function DinoGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin = 'DINO_DEFAULT', onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const gameData = useRef({
    dino: { x: 50, y: 320, w: 36, h: 44, vy: 0, gravity: 0.55, isJumping: false, jumpPower: -11.5, ducking: false },
    obstacles: [] as { x: number; y: number; w: number; h: number; speed: number; passed: boolean; type: 'cactus' | 'bird' }[],
    clouds: [] as { x: number; y: number; speed: number }[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    frame: 0,
    score: 0,
    lives: settings.lives,
    combo: 0,
    invincibleTimer: 0,
    groundOffset: 0,
    speed: 5
  });

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.combo = 0;
      setScore(0); setLives(settings.lives); setCombo(0);
      gameData.current.speed = 5 * settings.speedMultiplier;
    } else {
      gameData.current.lives = 1;
      setLives(1);
      gameData.current.invincibleTimer = 120;
    }
    gameData.current.dino = { x: 50, y: 320, w: 36, h: 44, vy: 0, gravity: 0.55, isJumping: false, jumpPower: -11.5, ducking: false };
    gameData.current.obstacles = [];
    gameData.current.particles = [];
    if (gameData.current.clouds.length === 0) {
      for (let i = 0; i < 4; i++) {
        gameData.current.clouds.push({
          x: Math.random() * 600,
          y: 40 + Math.random() * 80,
          speed: 0.5 + Math.random() * 0.5
        });
      }
    }
  };

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = true;
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
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
      gameData.current.frame++;
      if (gameData.current.invincibleTimer > 0) gameData.current.invincibleTimer--;

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#334155');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clouds
      gameData.current.clouds.forEach(c => {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
        ctx.arc(c.x + 18, c.y - 4, 14, 0, Math.PI * 2);
        ctx.arc(c.x + 32, c.y, 18, 0, Math.PI * 2);
        ctx.fill();
        if (gameState === 'PLAYING') {
          c.x -= c.speed;
          if (c.x < -50) c.x = canvas.width + 50;
        }
      });

      // Ground
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 364, canvas.width, 36);
      // Ground stripes (parallax)
      ctx.fillStyle = '#64748b';
      for (let i = 0; i < 20; i++) {
        const x = ((i * 50 - gameData.current.groundOffset) % (canvas.width + 50)) - 25;
        ctx.fillRect(x, 368, 30, 2);
      }

      if (gameState === 'PLAYING') {
        gameData.current.groundOffset += gameData.current.speed;
        const d = gameData.current.dino;
        const k = gameData.current.keys;

        // Jump
        if ((k[' '] || k['ArrowUp'] || k['w']) && !d.isJumping) {
          d.vy = d.jumpPower;
          d.isJumping = true;
          playGameSound('jump', soundEnabled);
        }
        // Duck
        d.ducking = (k['ArrowDown'] || k['s']) && !d.isJumping;

        d.vy += d.gravity;
        d.y += d.vy;

        if (d.y >= 320) {
          d.y = 320;
          d.vy = 0;
          d.isJumping = false;
        }

        // Speed up over time (faster acceleration)
        gameData.current.speed = Math.min(25, 6 * settings.speedMultiplier + gameData.current.score / 60);

        // Spawn obstacles
        const spawnRate = Math.max(50, 110 - Math.floor(gameData.current.score / 100));
        if (gameData.current.frame % Math.floor(spawnRate / settings.spawnRate) === 0) {
          const isBird = gameData.current.score > 100 && Math.random() < 0.3;
          if (isBird) {
            gameData.current.obstacles.push({
              x: canvas.width + 20,
              y: 280 + Math.random() * 30,
              w: 30,
              h: 24,
              speed: gameData.current.speed,
              passed: false,
              type: 'bird'
            });
          } else {
            // 1 to 3 cacti in a group
            const count = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            const h = 30 + Math.random() * 35;
            gameData.current.obstacles.push({
              x: canvas.width + 20,
              y: 364 - h,
              w: count * 22, // wider bounding box for multiple cacti
              h,
              speed: gameData.current.speed,
              passed: false,
              type: 'cactus'
            });
          }
        }

        // Update obstacles
        for (let i = gameData.current.obstacles.length - 1; i >= 0; i--) {
          const o = gameData.current.obstacles[i];
          o.x -= o.speed;

          if (!o.passed && o.x + o.w < d.x) {
            o.passed = true;
            gameData.current.combo++;
            const bonus = Math.max(1, gameData.current.combo - 1) * 5;
            gameData.current.score += 10 + (gameData.current.combo > 1 ? bonus : 0);
            setScore(gameData.current.score);
            setCombo(gameData.current.combo);
            if (gameData.current.score > highScore) setHighScore(gameData.current.score);
            if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);
          }

          if (o.x + o.w < 0) {
            gameData.current.obstacles.splice(i, 1);
            continue;
          }

          // Collision
          if (gameData.current.invincibleTimer === 0) {
            const dh = d.ducking ? d.h - 14 : d.h;
            const dy = d.ducking ? d.y + 14 : d.y;
            if (d.x < o.x + o.w && d.x + d.w > o.x && dy < o.y + o.h && dy + dh > o.y) {
              gameData.current.particles = [
                ...gameData.current.particles,
                ...createExplosion(d.x + d.w / 2, d.y + d.h / 2, '#6366f1', 16)
              ];
              gameData.current.obstacles.splice(i, 1);
              gameData.current.lives--;
              gameData.current.combo = 0;
              setLives(gameData.current.lives);
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
                gameData.current.invincibleTimer = 90;
              }
            }
          }
        }

        gameData.current.particles = updateParticles(gameData.current.particles);

        // Draw obstacles
        gameData.current.obstacles.forEach(o => {
          if (o.type === 'cactus') {
            const count = Math.round(o.w / 22);
            for (let c = 0; c < count; c++) {
              const cx = o.x + c * 22;
              // Alternating slight height changes for visual variety
              const ch = o.h - (c % 2 === 1 ? 8 : 0);
              const cy = o.y + (c % 2 === 1 ? 8 : 0);
              
              ctx.fillStyle = '#10b981';
              ctx.fillRect(cx, cy, 18, ch);
              ctx.fillStyle = '#059669';
              ctx.fillRect(cx + 2, cy + 4, 3, ch - 8);
              ctx.fillRect(cx + 18 - 5, cy + 8, 3, ch - 12);
            }
          } else {
            // Bird
            ctx.fillStyle = '#f59e0b';
            const flap = Math.sin(gameData.current.frame * 0.2) * 4;
            ctx.beginPath();
            ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.moveTo(o.x + o.w / 2, o.y + o.h / 2);
            ctx.lineTo(o.x + o.w / 2 - 8, o.y + o.h / 2 + flap);
            ctx.lineTo(o.x + o.w / 2 + 8, o.y + o.h / 2 + flap);
            ctx.fill();
          }
        });

        drawParticles(ctx, gameData.current.particles);

        // Draw Dino
        if (gameData.current.invincibleTimer === 0 || gameData.current.frame % 10 < 5) {
          ctx.save();
          
          let bodyColor = '#6366f1';
          let legColor = '#4f46e5';
          let tailColor = '#3b82f6';
          
          if (skin === 'DINO_GOLD') {
            bodyColor = '#f59e0b';
            legColor = '#d97706';
            tailColor = '#fbbf24';
          } else if (skin === 'DINO_NINJA') {
            bodyColor = '#0f172a';
            legColor = '#020617';
            tailColor = '#1e293b';
          }

          if (d.ducking) {
            // Ducking sprite (lower & wider)
            ctx.fillStyle = bodyColor;
            ctx.fillRect(d.x - 4, d.y + 14, d.w + 12, d.h - 14);
            ctx.fillStyle = '#fff';
            ctx.fillRect(d.x + d.w - 4, d.y + 18, 4, 4);
            
            // Ninja bandana while ducking
            if (skin === 'DINO_NINJA') {
              ctx.fillStyle = '#ef4444'; // Red bandana
              ctx.fillRect(d.x + d.w - 8, d.y + 16, 12, 4);
              ctx.fillRect(d.x - 8, d.y + 16, 6, 4); // tail of bandana
            }
          } else {
            // Standing dino
            ctx.fillStyle = bodyColor;
            // Body
            ctx.fillRect(d.x, d.y + 16, d.w - 8, d.h - 16);
            // Head
            ctx.fillRect(d.x + d.w - 16, d.y, 16, 22);
            // Eye
            ctx.fillStyle = '#fff';
            ctx.fillRect(d.x + d.w - 6, d.y + 6, 4, 4);
            
            // Ninja bandana while standing
            if (skin === 'DINO_NINJA') {
              ctx.fillStyle = '#ef4444'; // Red bandana
              ctx.fillRect(d.x + d.w - 16, d.y + 4, 16, 4);
              ctx.fillRect(d.x + d.w - 22, d.y + 4, 6, 4); // tail of bandana
            }

            // Legs (animated)
            ctx.fillStyle = legColor;
            const legOffset = d.isJumping ? 0 : Math.floor(gameData.current.frame / 6) % 2 === 0 ? 0 : 4;
            ctx.fillRect(d.x + 4, d.y + d.h - 6, 6, 6 + legOffset);
            ctx.fillRect(d.x + d.w - 14, d.y + d.h - 6, 6, 6 + (4 - legOffset));
            // Tail
            ctx.fillStyle = tailColor;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y + 18);
            ctx.lineTo(d.x - 10, d.y + 14);
            ctx.lineTo(d.x, d.y + 28);
            ctx.fill();
          }
          ctx.restore();
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
      gameData.current.lives = 1;
      setLives(1);
      gameData.current.invincibleTimer = 180; // 3 seconds invincibility
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
            width={600}
            height={400}
            onClick={() => {
              if (gameState === 'START') handleStart();
              else if (gameState === 'PLAYING' && !gameData.current.dino.isJumping) {
                gameData.current.dino.vy = gameData.current.dino.jumpPower;
                gameData.current.dino.isJumping = true;
                playGameSound('jump', soundEnabled);
              }
            }}
            className="w-full h-auto max-h-[70vh] cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">🦖 DİNOZOR KOŞUSU</h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Kaktüsleri ZIPLA, kuşların altından EĞİL! 100 puandan sonra kuşlar gelir.
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
              <button onClick={handleStart} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl">
                <RefreshCw className="w-4 h-4 text-emerald-400" /> Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls for Dino */}
        <div className="mt-4 flex justify-center gap-6 sm:hidden select-none">
          <button
            onTouchStart={() => {
              const d = gameData.current.dino;
              if (!d.isJumping) {
                d.vy = d.jumpPower;
                d.isJumping = true;
                playGameSound('jump', soundEnabled);
              }
            }}
            className="w-20 h-20 bg-indigo-600 active:bg-indigo-500 rounded-full text-white font-black text-xl flex flex-col items-center justify-center border-4 border-indigo-500/50 shadow-md active:scale-95 transition-transform"
          >
            <span>▲</span>
            <span className="text-[10px] uppercase">Zıpla</span>
          </button>
          
          <button
            onTouchStart={() => {
              gameData.current.keys['ArrowDown'] = true;
              if (gameData.current.dino) gameData.current.dino.ducking = true;
            }}
            onTouchEnd={() => {
              gameData.current.keys['ArrowDown'] = false;
              if (gameData.current.dino) gameData.current.dino.ducking = false;
            }}
            className="w-20 h-20 bg-slate-800 active:bg-slate-700 rounded-full text-slate-200 font-black text-xl flex flex-col items-center justify-center border-4 border-slate-700/50 shadow-md active:scale-95 transition-transform"
          >
            <span>▼</span>
            <span className="text-[10px] uppercase">Eğil</span>
          </button>
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🦖 Dino Game</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>⬆️ <strong className="text-white">Zıpla:</strong> Boşluk / Üst Ok / Tıkla</p>
          <p>⬇️ <strong className="text-white">Eğil:</strong> Aşağı Ok / S</p>
          <p>🌵 <strong className="text-emerald-300">Kaktüs:</strong> Üzerinden zıpla</p>
          <p>🦅 <strong className="text-amber-300">Kuş:</strong> Altından eğilerek geç</p>
          <p>🔥 <strong className="text-orange-300">Hız:</strong> Skor arttıkça hızlanır</p>
        </div>
      </div>
    </div>
  );
}
