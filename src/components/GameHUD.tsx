import { Trophy, Heart, Volume2, VolumeX, ArrowLeft, Flame } from 'lucide-react';

interface Props {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  combo: number;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  onBack: () => void;
  difficulty?: string;
}

export default function GameHUD({
  score,
  highScore,
  lives,
  maxLives,
  combo,
  soundEnabled,
  setSoundEnabled,
  onBack,
  difficulty
}: Props) {
  const diffColors: Record<string, string> = {
    EASY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    EASY_MEDIUM: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
    NORMAL: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    MEDIUM_HARD: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    HARD: 'text-red-400 border-red-500/30 bg-red-500/10'
  };
  const diffLabels: Record<string, string> = {
    EASY: 'Kolay',
    EASY_MEDIUM: 'Kolay-Orta',
    NORMAL: 'Orta',
    MEDIUM_HARD: 'Orta-Zor',
    HARD: 'Zor'
  };

  return (
    <>
      <div className="flex justify-between items-center mb-3 gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-300 active:text-white bg-slate-800/60 active:bg-slate-700/80 px-3 py-2 rounded-lg border border-slate-700/40 transition text-sm font-medium touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Geri</span>
        </button>
        <div className="flex items-center gap-2">
          {difficulty && (
            <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold uppercase tracking-wider ${diffColors[difficulty]}`}>
              {diffLabels[difficulty]}
            </span>
          )}
          <div className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-100">{highScore}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 active:text-white bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 active:bg-slate-700/80 transition touch-manipulation"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-800/40 border border-slate-700/30 p-2.5 rounded-xl mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium">SKOR</span>
          <span className="text-base font-bold text-amber-400 font-mono tracking-wide">{score}</span>
        </div>

        {combo > 1 && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded-lg animate-pulse">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-black text-orange-300 font-mono">x{combo}</span>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 transition-all duration-300 ${
                i < lives ? 'text-red-500 fill-red-500' : 'text-slate-700 fill-slate-800'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
