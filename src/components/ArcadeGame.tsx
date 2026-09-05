import { useRef, useEffect, useState } from 'react';
import { Question, Difficulty } from '../utils/questionExtractor';
import { RefreshCw, Zap } from 'lucide-react';
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

export default function ArcadeGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const gameData = useRef({
    player: { x: 280, y: 350, width: 32, height: 32, speed: 6 },
    lasers: [] as { x: number; y: number; w: number; h: number; speed: number }[],
    asteroids: [] as { x: number; y: number; r: number; speed: number; rot: number; vrot: number }[],
    powerups: [] as { x: number; y: number; type: 'shield' | 'multi'; speed: number }[],
    stars: [] as { x: number; y: number; r: number; speed: number }[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    frame: 0,
    score: 0,
    lives: settings.lives,
    combo: 0,
    invincibleTimer: 0,
    multiShotTimer: 0,
    shake: 0,
    lastKill: 0
  });

  const initGame = (revive = false) => {
    if (!revive) {
      gameData.current.score = 0;
      gameData.current.lives = settings.lives;
      gameData.current.combo = 0;
      setScore(0); setLives(settings.lives); setCombo(0);
    } else {
      gameData.current.lives = 1;
      gameData.current.combo = 0;
      setLives(1); setCombo(0);
      gameData.current.invincibleTimer = 120;
    }
    gameData.current.player = { x: 280, y: 350, width: 32, height: 32, speed: 6 };
    gameData.current.lasers = [];
    gameData.current.asteroids = [];
    gameData.current.powerups = [];
    gameData.current.particles = [];
    gameData.current.keys = {};
    gameData.current.multiShotTimer = 0;
    gameData.current.shake = 0;

    if (gameData.current.stars.length === 0) {
      const stars = [];
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random() * 600,
          y: Math.random() * 400,
          r: Math.random() * 2 + 0.5,
          speed: Math.random() * 1.5 + 0.5
        });
      }
      gameData.current.stars = stars;
    }
  };

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
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
      if (gameData.current.multiShotTimer > 0) gameData.current.multiShotTimer--;

      // Screen shake
      let shakeX = 0, shakeY = 0;
      if (gameData.current.shake > 0) {
        shakeX = (Math.random() - 0.5) * gameData.current.shake;
        shakeY = (Math.random() - 0.5) * gameData.current.shake;
        gameData.current.shake *= 0.85;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0e1a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = '#fff';
      gameData.current.stars.forEach(s => {
        ctx.globalAlpha = 0.3 + Math.sin(gameData.current.frame * 0.05 + s.x) * 0.3;
        ctx.fillRect(s.x, s.y, s.r, s.r);
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      });
      ctx.globalAlpha = 1;

      if (gameState === 'PLAYING') {
        const p = gameData.current.player;
        const k = gameData.current.keys;
        if (k['ArrowLeft'] || k['a'] || k['A']) p.x -= p.speed;
        if (k['ArrowRight'] || k['d'] || k['D']) p.x += p.speed;
        if (k['ArrowUp'] || k['w'] || k['W']) p.y -= p.speed;
        if (k['ArrowDown'] || k['s'] || k['S']) p.y += p.speed;
        p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));

        // Shoot
        if ((k[' '] || k['f']) && gameData.current.frame % 8 === 0) {
          if (gameData.current.multiShotTimer > 0) {
            gameData.current.lasers.push({ x: p.x + p.width / 2 - 2, y: p.y, w: 4, h: 12, speed: 9 });
            gameData.current.lasers.push({ x: p.x + 4, y: p.y + 8, w: 4, h: 12, speed: 9 });
            gameData.current.lasers.push({ x: p.x + p.width - 8, y: p.y + 8, w: 4, h: 12, speed: 9 });
          } else {
            gameData.current.lasers.push({ x: p.x + p.width / 2 - 2, y: p.y, w: 4, h: 12, speed: 9 });
          }
          playGameSound('laser', soundEnabled);
        }

        // Spawn asteroids
        const spawnInterval = Math.max(20, (50 - Math.floor(gameData.current.score / 200)) / settings.spawnRate);
        if (gameData.current.frame % Math.floor(spawnInterval) === 0) {
          gameData.current.asteroids.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30,
            r: 15 + Math.random() * 15,
            speed: (2 + Math.random() * 2 + gameData.current.score / 800) * settings.speedMultiplier,
            rot: 0,
            vrot: (Math.random() - 0.5) * 0.1
          });
        }

        // Powerup spawn
        if (gameData.current.frame % 600 === 0 && Math.random() < 0.5) {
          gameData.current.powerups.push({
            x: Math.random() * (canvas.width - 30) + 15,
            y: -20,
            type: Math.random() < 0.5 ? 'shield' : 'multi',
            speed: 2
          });
        }

        // Update lasers
        gameData.current.lasers = gameData.current.lasers.filter(l => {
          l.y -= l.speed;
          return l.y > -20;
        });

        // Update asteroids & collisions
        for (let i = gameData.current.asteroids.length - 1; i >= 0; i--) {
          const a = gameData.current.asteroids[i];
          a.y += a.speed;
          a.rot += a.vrot;

          if (a.y > canvas.height + a.r) {
            gameData.current.asteroids.splice(i, 1);
            gameData.current.combo = 0;
            setCombo(0);
            continue;
          }

          // Laser hit
          let destroyed = false;
          for (let j = gameData.current.lasers.length - 1; j >= 0; j--) {
            const l = gameData.current.lasers[j];
            if (Math.hypot(l.x - a.x, l.y - a.y) < a.r) {
              gameData.current.particles = [
                ...gameData.current.particles,
                ...createExplosion(a.x, a.y, '#ef4444', 14)
              ];
              gameData.current.asteroids.splice(i, 1);
              gameData.current.lasers.splice(j, 1);

              gameData.current.combo++;
              const comboBonus = Math.max(1, gameData.current.combo - 1) * 5;
              gameData.current.score += 10 + (gameData.current.combo > 1 ? comboBonus : 0);
              setScore(gameData.current.score);
              setCombo(gameData.current.combo);
              if (gameData.current.score > highScore) setHighScore(gameData.current.score);

              if (gameData.current.combo > 2) playGameSound('combo', soundEnabled);
              else playGameSound('explosion', soundEnabled);
              gameData.current.shake = 4;
              gameData.current.lastKill = gameData.current.frame;
              destroyed = true;
              break;
            }
          }
          if (destroyed) continue;

          // Player collision
          if (gameData.current.invincibleTimer === 0) {
            const px = p.x + p.width / 2, py = p.y + p.height / 2;
            if (Math.hypot(px - a.x, py - a.y) < a.r + p.width / 2 - 4) {
              gameData.current.particles = [
                ...gameData.current.particles,
                ...createExplosion(px, py, '#3b82f6', 20)
              ];
              gameData.current.asteroids.splice(i, 1);
              gameData.current.lives--;
              gameData.current.combo = 0;
              setLives(gameData.current.lives);
              setCombo(0);
              playGameSound('hit', soundEnabled);
              gameData.current.shake = 12;

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

        // Powerups
        for (let i = gameData.current.powerups.length - 1; i >= 0; i--) {
          const pw = gameData.current.powerups[i];
          pw.y += pw.speed;
          if (pw.y > canvas.height + 20) {
            gameData.current.powerups.splice(i, 1);
            continue;
          }
          // Collect
          if (Math.abs(pw.x - (p.x + p.width / 2)) < 20 && Math.abs(pw.y - (p.y + p.height / 2)) < 20) {
            gameData.current.powerups.splice(i, 1);
            if (pw.type === 'shield') {
              gameData.current.invincibleTimer = 240;
            } else {
              gameData.current.multiShotTimer = 360;
            }
            playGameSound('powerup', soundEnabled);
          }
        }

        gameData.current.particles = updateParticles(gameData.current.particles);

        // Draw lasers with glow
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#10b981';
        gameData.current.lasers.forEach(l => ctx.fillRect(l.x, l.y, l.w, l.h));
        ctx.shadowBlur = 0;

        // Draw asteroids
        gameData.current.asteroids.forEach(a => {
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(a.rot);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          // Irregular asteroid shape
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const r = a.r * (0.85 + Math.sin(i * 2.3) * 0.15);
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Crater
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.arc(-a.r / 4, -a.r / 4, a.r / 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Draw particles
        drawParticles(ctx, gameData.current.particles);

        // Draw powerups
        gameData.current.powerups.forEach(pw => {
          ctx.save();
          ctx.translate(pw.x, pw.y);
          ctx.rotate(gameData.current.frame * 0.05);
          ctx.shadowColor = pw.type === 'shield' ? '#06b6d4' : '#a855f7';
          ctx.shadowBlur = 15;
          ctx.fillStyle = pw.type === 'shield' ? '#06b6d4' : '#a855f7';
          ctx.fillRect(-12, -12, 24, 24);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pw.type === 'shield' ? 'S' : 'M', 0, 0);
          ctx.restore();
        });
        ctx.shadowBlur = 0;

        // Draw player ship
        if (gameData.current.invincibleTimer === 0 || gameData.current.frame % 10 < 5) {
          ctx.save();
          ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

          // Shield aura
          if (gameData.current.invincibleTimer > 30) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 + Math.sin(gameData.current.frame * 0.2) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.width / 2 + 6, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Multi-shot indicator
          if (gameData.current.multiShotTimer > 0) {
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;
          }

          if (skin === 'SPACE_UFO') {
            // Draw UFO
            ctx.fillStyle = '#10b981'; // emerald
            ctx.beginPath();
            ctx.ellipse(0, 0, p.width / 2, p.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Cockpit
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(0, -5, p.width / 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (skin === 'SPACE_XJET') {
            // Draw X-JET
            ctx.fillStyle = '#0891b2'; // cyan
            ctx.beginPath();
            ctx.moveTo(0, -p.height / 2);
            ctx.lineTo(p.width / 2, p.height / 2);
            ctx.lineTo(0, p.height / 2 - 10);
            ctx.lineTo(-p.width / 2, p.height / 2);
            ctx.closePath();
            ctx.fill();
            
            // Blue thrusters
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-p.width / 2 + 4, p.height / 2 - 5, 6, 8 + Math.random() * 4);
            ctx.fillRect(p.width / 2 - 10, p.height / 2 - 5, 6, 8 + Math.random() * 4);
          } else {
            // Default
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(0, -p.height / 2);
            ctx.lineTo(p.width / 2, p.height / 2);
            ctx.lineTo(p.width / 4, p.height / 3);
            ctx.lineTo(-p.width / 4, p.height / 3);
            ctx.lineTo(-p.width / 2, p.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Cockpit
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(0, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Engine flame
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(-4, p.height / 2);
            ctx.lineTo(0, p.height / 2 + 8 + Math.random() * 4);
            ctx.lineTo(4, p.height / 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      ctx.restore();

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
            width={600}
            height={400}
            onClick={() => gameState === 'START' && handleStart()}
            className="w-full h-auto max-h-[70vh] cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <Zap className="w-16 h-16 text-amber-400 animate-pulse mb-3" />
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">🚀 UZAY MACERASI</h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Asteroidleri vur, S (kalkan) ve M (çoklu atış) güçlendirmelerini topla!
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

        {/* Enhanced Mobile Controls for Arcade */}
        <div className="mt-4 flex gap-6 justify-center items-center sm:hidden select-none">
          <div className="relative w-36 h-36 bg-slate-800/40 rounded-full border border-slate-700/60 p-2">
            <button
              onTouchStart={() => gameData.current.keys['ArrowUp'] = true}
              onTouchEnd={() => gameData.current.keys['ArrowUp'] = false}
              className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-11 bg-slate-700 active:bg-slate-600 text-slate-200 font-black rounded-xl flex items-center justify-center border border-slate-600"
            >
              ▲
            </button>
            <button
              onTouchStart={() => gameData.current.keys['ArrowDown'] = true}
              onTouchEnd={() => gameData.current.keys['ArrowDown'] = false}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-11 bg-slate-700 active:bg-slate-600 text-slate-200 font-black rounded-xl flex items-center justify-center border border-slate-600"
            >
              ▼
            </button>
            <button
              onTouchStart={() => gameData.current.keys['ArrowLeft'] = true}
              onTouchEnd={() => gameData.current.keys['ArrowLeft'] = false}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-slate-700 active:bg-slate-600 text-slate-200 font-black rounded-xl flex items-center justify-center border border-slate-600"
            >
              ◀
            </button>
            <button
              onTouchStart={() => gameData.current.keys['ArrowRight'] = true}
              onTouchEnd={() => gameData.current.keys['ArrowRight'] = false}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-slate-700 active:bg-slate-600 text-slate-200 font-black rounded-xl flex items-center justify-center border border-slate-600"
            >
              ▶
            </button>
            <div className="absolute inset-0 m-auto w-6 h-6 bg-slate-800 rounded-full border border-slate-600"></div>
          </div>

          <button
            onTouchStart={() => gameData.current.keys[' '] = true}
            onTouchEnd={() => gameData.current.keys[' '] = false}
            className="w-24 h-24 bg-emerald-600 active:bg-emerald-500 rounded-full text-white font-black text-lg border-4 border-emerald-500/50 shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            ATEŞ
          </button>
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">🚀 Uzay Macerası</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>🎮 <strong className="text-white">Hareket:</strong> Yön tuşları / WASD</p>
          <p>💥 <strong className="text-white">Ateş:</strong> Boşluk / F</p>
          <p>🛡️ <strong className="text-cyan-300">S Kalkan:</strong> 4sn dokunulmazlık</p>
          <p>💜 <strong className="text-purple-300">M Multi:</strong> 6sn üçlü atış</p>
          <p>🔥 <strong className="text-orange-300">Combo:</strong> Üst üste vuruşlarda bonus puan</p>
          <p>💡 <strong className="text-emerald-300">Diriliş:</strong> Canın bittiğinde dosyadan soru gelir</p>
        </div>
      </div>
    </div>
  );
}
