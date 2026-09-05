import { useRef, useEffect, useState } from 'react';
import { Question, Difficulty } from '../utils/questionExtractor';
import { RefreshCw, Scissors } from 'lucide-react';
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

export default function BombGame({ questions, onBack, highScore, setHighScore, difficulty, addCoins, skin, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settings = getDifficultySettings(difficulty);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(settings.lives); // Always 1
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'QUESTION' | 'GAME_OVER' | 'VICTORY'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Re-render UI based on these refs occasionally, or just rely on state for big updates
  const [displayTime, setDisplayTime] = useState(0);
  const [displayWires, setDisplayWires] = useState(3);

  const gameData = useRef({
    timeRemaining: 30000, // ms
    maxTime: 30000,
    lastTime: 0,
    wiresLeft: 3,
    score: 0,
    particles: [] as Particle[],
    isExploding: false,
    bombPulse: 0,
    beatMultiplier: 1,
    level: 1
  });

  const initGame = () => {
    gameData.current.score = 0;
    gameData.current.level = 1;
    gameData.current.timeRemaining = 30000;
    gameData.current.maxTime = 30000;
    gameData.current.wiresLeft = 3;
    gameData.current.particles = [];
    gameData.current.isExploding = false;
    gameData.current.lastTime = performance.now();
    
    setScore(0);
    setLives(1);
    setDisplayTime(30000);
    setDisplayWires(3);
  };

  const nextBomb = () => {
    gameData.current.level++;
    // Decrease time by 2 seconds per level, minimum 10 seconds
    const newMax = Math.max(10000, 30000 - (gameData.current.level - 1) * 2000);
    gameData.current.maxTime = newMax;
    gameData.current.timeRemaining = newMax;
    
    // Increase wires by 1 per level (starts at 3)
    const newWires = 2 + gameData.current.level;
    gameData.current.wiresLeft = newWires;
    gameData.current.lastTime = performance.now();
    
    setDisplayWires(newWires);
    setGameState('PLAYING');
  };

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
      const deltaT = time - (gameData.current.lastTime || time);
      gameData.current.lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid pattern
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for(let i=0; i<canvas.width; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for(let i=0; i<canvas.height; i+=40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      if (gameState === 'PLAYING' || gameState === 'QUESTION') {
        gameData.current.timeRemaining -= deltaT;
        
        if (gameData.current.timeRemaining <= 0 && !gameData.current.isExploding) {
          gameData.current.timeRemaining = 0;
          gameData.current.isExploding = true;
          // Explode
          gameData.current.particles = createExplosion(canvas.width/2, canvas.height/2, '#ef4444', 80);
          playGameSound('explosion', soundEnabled);
          setGameState('GAME_OVER');
          setLives(0);
        }

        // Update UI displays (throttle it roughly)
        if (time % 100 < 20) {
          setDisplayTime(Math.max(0, gameData.current.timeRemaining));
        }
      }

      // Draw Bomb
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (!gameData.current.isExploding && gameState !== 'START') {
        // Pulse effect based on time remaining
        const dangerFactor = 1 - (gameData.current.timeRemaining / gameData.current.maxTime); // 0 to 1
        const pulseRate = 0.005 + (dangerFactor * 0.02);
        gameData.current.bombPulse += pulseRate * deltaT;
        
        const scale = 1 + Math.sin(gameData.current.bombPulse) * (0.05 + dangerFactor * 0.1);
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Bomb Body & Features
        if (skin === 'BOMB_TNT') {
          // TNT Bundle
          ctx.fillStyle = '#ef4444'; // red-500
          for (let i = -1; i <= 1; i++) {
            ctx.fillRect(-50, -45 + i * 35, 100, 30);
          }
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          for (let i = -1; i <= 1; i++) {
            ctx.strokeRect(-50, -45 + i * 35, 100, 30);
          }
          ctx.fillStyle = '#000';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('TNT', 0, 0);
          
          // Black bands
          ctx.fillStyle = '#111';
          ctx.fillRect(-30, -50, 15, 100);
          ctx.fillRect(15, -50, 15, 100);
        } else if (skin === 'BOMB_NUKE') {
          // Nuke
          ctx.fillStyle = '#475569'; // slate-600
          ctx.beginPath();
          ctx.ellipse(0, 0, 70, 90, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#fbbf24'; // amber-400
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          // Radiation triangles
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 30, i * Math.PI * 2 / 3 + 0.2, (i + 1) * Math.PI * 2 / 3 - 0.2);
            ctx.fill();
          }
          
          ctx.fillStyle = '#cbd5e1'; // fins
          ctx.fillRect(-20, -110, 40, 30);
          ctx.beginPath();
          ctx.moveTo(-20, -110);
          ctx.lineTo(-50, -120);
          ctx.lineTo(-20, -80);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(20, -110);
          ctx.lineTo(50, -120);
          ctx.lineTo(20, -80);
          ctx.fill();
        } else {
          // Default
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 6;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + dangerFactor * 0.7})`; // Gets redder
          ctx.stroke();

          // Dynamite sticks
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-60, -40, 120, 20);
          ctx.fillRect(-60, -10, 120, 20);
          ctx.fillRect(-60, 20, 120, 20);
        }

        // Timer Display on bomb
        ctx.fillStyle = '#000';
        if (skin === 'BOMB_TNT') {
          ctx.fillRect(-45, -25, 90, 50);
          ctx.fillStyle = '#111';
          ctx.fillRect(-42, -22, 84, 44);
        } else if (skin === 'BOMB_NUKE') {
          ctx.fillRect(-40, 45, 80, 30);
          ctx.fillStyle = '#111';
          ctx.fillRect(-38, 47, 76, 26);
        } else {
          ctx.fillRect(-45, -25, 90, 50);
          ctx.fillStyle = '#111';
          ctx.fillRect(-42, -22, 84, 44);
        }

        ctx.font = skin === 'BOMB_NUKE' ? 'bold 18px monospace' : 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Red glowing text
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ef4444';
        
        const secs = Math.ceil(gameData.current.timeRemaining / 1000);
        const timeText = secs.toString().padStart(2, '0');
        ctx.fillText(`00:${timeText}`, 0, skin === 'BOMB_NUKE' ? 60 : 0);
        
        ctx.restore();

        // Draw remaining wires
        for (let i = 0; i < gameData.current.wiresLeft; i++) {
          ctx.strokeStyle = ['#eab308', '#3b82f6', '#22c55e'][i % 3];
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cx - 30 + i * 30, cy - 80);
          ctx.quadraticCurveTo(cx - 50 + i * 40, cy - 140, cx - 20 + i * 20, cy - 160);
          ctx.stroke();
        }
      }

      gameData.current.particles = updateParticles(gameData.current.particles);
      drawParticles(ctx, gameData.current.particles);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if ((gameState === 'GAME_OVER' || gameState === 'VICTORY') && onGameOver) {
      onGameOver(score);
    }
  }, [gameState, score, onGameOver]);

  const handleStart = () => {
    initGame();
    setGameState('PLAYING');
  };

  const cutWire = () => {
    if (questions.length > 0) {
      const q = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(q);
      setGameState('QUESTION');
    } else {
      setGameState('GAME_OVER'); // No questions
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      playGameSound('correct', soundEnabled);
      if (addCoins) addCoins(10);
      gameData.current.wiresLeft--;
      setDisplayWires(gameData.current.wiresLeft);

      if (gameData.current.wiresLeft <= 0) {
        // Defused!
        playGameSound('powerup', soundEnabled);
        const timeBonus = Math.floor(gameData.current.timeRemaining / 100);
        const earned = 100 + timeBonus;
        gameData.current.score += earned;
        setScore(gameData.current.score);
        if (gameData.current.score > highScore) setHighScore(gameData.current.score);
        
        setGameState('VICTORY');
      } else {
        // Return to bomb
        setGameState('PLAYING');
      }
    } else {
      // Wrong answer -> Immediate explosion
      playGameSound('wrong', soundEnabled);
      gameData.current.timeRemaining = 0; // Force explosion in render loop
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto items-center lg:items-stretch">
      <div className="flex-1 w-full bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl flex flex-col max-w-4xl">
        <GameHUD
          score={score} highScore={highScore} lives={lives} maxLives={1}
          combo={0} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
          onBack={onBack} difficulty={difficulty}
        />

        <div className="relative border-4 border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner" style={{ maxHeight: '70vh' }}>
          
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Seviye</div>
            <div className="text-xl font-black text-amber-400">{gameData.current.level}</div>
          </div>
          <div className="absolute top-4 right-4 z-10 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700 text-right">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Kalan Süre</div>
            <div className={`text-2xl font-black font-mono ${displayTime < 10000 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {(displayTime / 1000).toFixed(1)}s
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-auto max-h-[70vh]"
            style={{ imageRendering: 'pixelated' }}
          />

          {gameState === 'START' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 p-6 text-center backdrop-blur-sm">
              <h2 className="text-3xl font-black text-red-500 tracking-widest uppercase mb-1">💣 BOMBA İMHA</h2>
              <p className="text-sm text-slate-300 font-medium mb-5 max-w-sm">
                Süre bitmeden tüm soruları çöz ve kabloları kes. Yanlış cevap anında patlatır! Zaman soru çözerken de akar, acele et!
              </p>
              <button
                onClick={handleStart}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-4 rounded-xl transition active:scale-95 text-lg shadow-lg shadow-red-500/30"
              >
                Görevi Başlat
              </button>
            </div>
          )}

          {gameState === 'PLAYING' && (
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center">
              <div className="text-white font-bold mb-3 bg-slate-900/80 px-4 py-1 rounded-full border border-slate-700">
                Kesilecek Kablo: {displayWires}
              </div>
              <button
                onClick={cutWire}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-8 py-4 rounded-xl transition active:scale-95 text-lg shadow-lg shadow-amber-500/30 hover:-translate-y-1"
              >
                <Scissors className="w-6 h-6" /> KABLOYU KES (Soru Çöz)
              </button>
            </div>
          )}

          {gameState === 'QUESTION' && currentQuestion && (
            <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
          )}

          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/90 text-center backdrop-blur-md">
              <div className="text-emerald-400 font-black text-4xl tracking-widest mb-2 animate-bounce">İMHA EDİLDİ!</div>
              <div className="text-white font-medium mb-6">Puan Kazanıldı. Bir sonraki bomba daha hızlı!</div>
              <button onClick={nextBomb} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition active:scale-95 shadow-lg">
                <Scissors className="w-5 h-5" /> Sıradaki Bomba
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-center backdrop-blur-md">
              <div className="text-red-400 font-black text-5xl tracking-widest mb-1 animate-ping">BOOM!</div>
              <div className="text-white font-black text-2xl tracking-widest mb-1 mt-4">GAME OVER</div>
              <div className="text-amber-400 font-mono text-xl font-black mb-1">Skor: {score}</div>
              <p className="text-xs text-slate-300 mb-6">En İyi: {highScore}</p>
              <button onClick={handleStart} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl transition active:scale-95">
                <RefreshCw className="w-4 h-4 text-red-400" /> Baştan Başla
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block w-80 bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-black text-slate-100 uppercase mb-3">💣 Bomba İmha</h4>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>✂️ <strong className="text-white">Kablo Kes:</strong> Soru ekranını açar.</p>
          <p>⏱️ <strong className="text-amber-300">Zaman Akıyor:</strong> Soruyu düşünürken bomba çalışmaya devam eder!</p>
          <p>💥 <strong className="text-red-400">Tek Yanlış:</strong> Yanlış cevap anında patlamaya sebep olur.</p>
          <p>🚀 <strong className="text-emerald-300">Seviyeler:</strong> Her imhada süre 2 saniye kısalır.</p>
        </div>
      </div>
    </div>
  );
}
