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

export default function FlappyBirdGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'READY' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const gameData = useRef({
    bird: { x: 100, y: 200, r: 14, vy: 0, gravity: 0.4, jumpPower: -7 },
    pipes: [] as { x: number; topH: number; bottomY: number; w: number; speed: number; passed: boolean }[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    lastFlap: 0,
    frame: 0,
    score: 0,
    lives: settings.lives,
    combo: 0,
    invincibleTimer: 0,
    bgOffset: 0
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
      gameData.current.invincibleTimer = 120;
    }
    gameData.current.bird = { x: 100, y: 200, r: 14, vy: 0, gravity: 0.4, jumpPower: -7 };
    gameData.current.pipes = [];
    gameData.current.particles = [];
  };

  const flap = () => {
    if (gameData.current.frame - gameData.current.lastFlap > 5) {
      gameData.current.bird.vy = gameData.current.bird.jumpPower;
      gameData.current.lastFlap = gameData.current.frame;
      playGameSound('flap', soundEnabled);
    }
  };

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w')) {
        if (gameState === 'PLAYING') {
          flap();
        } else if (gameState === 'READY') {
          setGameState('PLAYING');
          flap();
        }
      }
      gameData.current.keys[e.key] = true;
      if ([' ', 'ArrowUp'].includes(e.key)) e.preventDefault();
    };
    const handleUp = (e: KeyboardEvent) => { gameData.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [gameState]);

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

      // Sky background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#3730a3');
      grad.addColorStop(1, '#7c3aed');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant clouds
      for (let i = 0; i < 5; i++) {
        const x = ((i * 150 - gameData.current.bgOffset * 0.3) % (canvas.width + 100)) - 50;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(x, 60 + i * 20, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, 55 + i * 20, 20, 0, Math.PI * 2);
        ctx.arc(x + 45, 60 + i * 20, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      if (gameState === 'PLAYING') {
        gameData.current.bgOffset += 1;
        const b = gameData.current.bird;

        b.vy += b.gravity;
        b.y += b.vy;

        if (b.y + b.r >= canvas.height) {
          b.y = canvas.height - b.r;
          b.vy = 0;
          handleHit();
        } else if (b.y - b.r <= 0) {
          b.y = b.r;
          b.vy = 0;
        }

        // Spawn pipes
        const pipeRate = Math.max(80, 130 - Math.floor(gameData.current.score / 50));
        if (gameData.current.frame % Math.floor(pipeRate / settings.spawnRate) === 0) {
          const minH = 50;
          const maxH = 200;
          const gap = 140 - Math.min(40, gameData.current.score / 5);
          const topH = Math.random() * (maxH - minH) + minH;
          gameData.current.pipes.push({
            x: canvas.width + 20,
            topH,
            bottomY: topH + gap,
            w: 55,
            speed: (3 + gameData.current.score / 200) * settings.speedMultiplier,
            passed: false
          });
        }

        for (let i = gameData.current.pipes.length - 1; i >= 0; i--) {
          const p = gameData.current.pipes[i];
          p.x -= p.speed;

          if (!p.passed && p.x + p.w < b.x) {
            p.passed = true;
            gameData.current.combo++;
            const bonus = Math.max(1, gameData.current.combo - 1) * 5;
            gameData.current.score += 10 + (gameData.current.combo > 1 ? bonus : 0);
            setScore(gameData.current.score);
            setCombo(gameData.current.combo);
            if (gameData.current.score > highScore) setHighScore(gameData.current.score);
            if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);
          }

          if (p.x + p.w < 0) {
            gameData.current.pipes.splice(i, 1);
            continue;
          }

          if (gameData.current.invincibleTimer === 0) {
            const hitTop = b.x + b.r > p.x && b.x - b.r < p.x + p.w && b.y - b.r < p.topH;
            const hitBot = b.x + b.r > p.x && b.x - b.r < p.x + p.w && b.y + b.r > p.bottomY;
            if (hitTop || hitBot) {
              gameData.current.particles = [
                ...gameData.current.particles,
                ...createExplosion(b.x, b.y, '#f59e0b', 18)
              ];
              gameData.current.pipes.splice(i, 1);
              handleHit();
            }
          }
        }

        gameData.current.particles = updateParticles(gameData.current.particles);

        // Draw pipes
        gameData.current.pipes.forEach(p => {
          // Top pipe
          const pgrad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
          pgrad.addColorStop(0, '#059669');
          pgrad.addColorStop(0.5, '#10b981');
          pgrad.addColorStop(1, '#059669');
          ctx.fillStyle = pgrad;
          ctx.fillRect(p.x, 0, p.w, p.topH);
          // Cap
          ctx.fillStyle = '#34d399';
          ctx.fillRect(p.x - 4, p.topH - 14, p.w + 8, 14);
          // Bottom pipe
          ctx.fillStyle = pgrad;
          ctx.fillRect(p.x, p.bottomY, p.w, canvas.height - p.bottomY);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(p.x - 4, p.bottomY, p.w + 8, 14);
        });

        drawParticles(ctx, gameData.current.particles);

        // Draw bird
        if (gameData.current.invincibleTimer === 0 || gameData.current.frame % 10 < 5) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, b.vy * 0.1)));

          if (skin === 'FLAPPY_BAT') {
            // Bat
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.beginPath();
            ctx.arc(0, 0, b.r, 0, Math.PI * 2);
            ctx.fill();
            // Ears
            ctx.beginPath();
            ctx.moveTo(-8, -b.r);
            ctx.lineTo(-4, -b.r - 8);
            ctx.lineTo(0, -b.r);
            ctx.moveTo(8, -b.r);
            ctx.lineTo(4, -b.r - 8);
            ctx.lineTo(0, -b.r);
            ctx.fill();
            // Wing
            ctx.fillStyle = '#0f172a';
            const wingY = Math.sin(gameData.current.frame * 0.4) * 10;
            ctx.beginPath();
            ctx.moveTo(-b.r, 0);
            ctx.lineTo(-b.r - 12, wingY - 8);
            ctx.lineTo(-b.r - 4, wingY + 4);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(4, -2, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (skin === 'FLAPPY_COPTER') {
            // Copter
            ctx.fillStyle = '#f97316'; // orange-500
            ctx.beginPath();
            ctx.ellipse(0, 0, b.r + 4, b.r - 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.fillRect(-b.r - 10, -2, 10, 4);
            // Propeller
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(-2, -b.r - 6, 4, 6);
            const propW = Math.cos(gameData.current.frame * 0.5) * 16;
            ctx.fillRect(-propW, -b.r - 8, propW * 2, 2);
            // Window
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(4, -2, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Default Bird
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(0, 0, b.r, 0, Math.PI * 2);
            ctx.fill();
            // Wing
            ctx.fillStyle = '#ca8a04';
            ctx.beginPath();
            ctx.ellipse(-4, 0, 8, 5, Math.sin(gameData.current.frame * 0.2) * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(4, -4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Beak
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(16, 2);
            ctx.lineTo(8, 6);
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

  const handleHit = () => {
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
      gameData.current.invincibleTimer = 90;
      gameData.current.bird.y = 200;
      gameData.current.bird.vy = 0;
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
      gameData.current.lives = 1;
      setLives(1);
      gameData.current.invincibleTimer = 180; // 3 seconds invincibility
      // Small bump upwards so they don't immediately fall to their death before reacting
      gameData.current.bird.vy = gameData.current.bird.jumpPower; 
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
              if (gameState === 'START') {
                handleStart();
                setTimeout(() => flap(), 80);
              } else if (gameState === 'READY') {
                setGameState('PLAYING');
                flap();
              } else if (gameState === 'PLAYING') {
                flap();
              }
            }}
            className="w-full h-auto max-h-[70vh] cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">🐦 KANATLI KUŞ</h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Kanat çırp, borulardan geç. Skor arttıkça boşluklar daralır!
              </p>
              <button
                onClick={() => {
                  handleStart();
                  setTimeout(() => flap(), 50);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl transition active:scale-95"
              >
                Oyuna Başla
              </button>
            </div>
          )}

          {gameState === 'READY' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 p-6 text-center backdrop-blur-sm">
              <h2 className="text-3xl font-black text-amber-400 tracking-widest uppercase mb-2 animate-bounce">HAZIR!</h2>
              <p className="text-lg text-white font-medium">
                Devam etmek için tıkla veya zıpla
              </p>
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

        {/* Mobile tap to flap */}
        <div className="mt-4 sm:hidden">
          <button
            onTouchStart={() => {
              if (gameState === 'PLAYING') flap();
              else if (gameState === 'READY') { setGameState('PLAYING'); flap(); }
            }}
            className="w-full py-6 bg-indigo-600 active:bg-indigo-500 rounded-2xl text-white font-black text-lg border-4 border-indigo-500/50 shadow-lg touch-manipulation"
          >
            KANAT ÇIRP ✈️
          </button>
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🐦 Flappy Bird</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>🔼 <strong className="text-white">Uç:</strong> Boşluk / Üst Ok / Tıkla</p>
          <p>🚧 <strong className="text-emerald-300">Borular:</strong> Aralarından geç</p>
          <p>📉 <strong className="text-amber-300">Zorluk:</strong> Skor arttıkça boşluklar daralır</p>
          <p>🔥 <strong className="text-orange-300">Combo:</strong> Üst üste başarılarda bonus</p>
        </div>
      </div>
    </div>
  );
}
