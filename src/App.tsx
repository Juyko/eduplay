import { useState, useEffect } from 'react';
import FileAnalyzer from './components/FileAnalyzer';
import ArcadeGame from './components/ArcadeGame';
import DinoGame from './components/DinoGame';
import FlappyBirdGame from './components/FlappyBirdGame';
import SnakeGame from './components/SnakeGame';
import BreakoutGame from './components/BreakoutGame';
import PongGame from './components/PongGame';
import TetrisGame from './components/TetrisGame';
import BombGame from './components/BombGame';
import Market, { SKINS } from './components/Market';
import { Question, Difficulty } from './utils/questionExtractor';
import { Gamepad2, Play, Sun, Moon, ShoppingCart, Skull, AlertTriangle, Globe, Crown } from 'lucide-react';
import { useTranslation } from './utils/i18n';
import PremiumModal from './components/PremiumModal';

type GameType = 'SPACE' | 'DINO' | 'FLAPPY' | 'SNAKE' | 'BREAKOUT' | 'PONG' | 'TETRIS' | 'BOMB';

interface GameOption {
  id: GameType;
  name: string;
  emoji: string;
  description: string;
}

const getGames = (t: (key: string) => string): GameOption[] => [
  { id: 'SPACE', name: t('game.SPACE.name'), emoji: '🚀', description: t('game.SPACE.desc') },
  { id: 'DINO', name: t('game.DINO.name'), emoji: '🦖', description: t('game.DINO.desc') },
  { id: 'FLAPPY', name: t('game.FLAPPY.name'), emoji: '🐦', description: t('game.FLAPPY.desc') },
  { id: 'SNAKE', name: t('game.SNAKE.name'), emoji: '🐍', description: t('game.SNAKE.desc') },
  { id: 'BREAKOUT', name: t('game.BREAKOUT.name'), emoji: '🧱', description: t('game.BREAKOUT.desc') },
  { id: 'PONG', name: t('game.PONG.name'), emoji: '🏓', description: t('game.PONG.desc') },
  { id: 'TETRIS', name: t('game.TETRIS.name'), emoji: '🧩', description: t('game.TETRIS.desc') },
  { id: 'BOMB', name: t('game.BOMB.name'), emoji: '💣', description: t('game.BOMB.desc') },
];

const GAME_COLORS: Record<GameType, string> = {
  SPACE: 'from-indigo-600 to-purple-600',
  DINO: 'from-amber-500 to-orange-600',
  FLAPPY: 'from-emerald-500 to-teal-600',
  SNAKE: 'from-lime-500 to-green-600',
  BREAKOUT: 'from-rose-500 to-red-600',
  PONG: 'from-sky-500 to-blue-600',
  TETRIS: 'from-purple-500 to-violet-600',
  BOMB: 'from-red-600 to-rose-900',
};

const INITIAL_HIGH_SCORES: Record<GameType, number> = {
  SPACE: 0, DINO: 0, FLAPPY: 0, SNAKE: 0, BREAKOUT: 0, PONG: 0, TETRIS: 0, BOMB: 0
};

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'fb-1',
    type: 'MULTIPLE_CHOICE',
    question: 'TypeScript hangi programlama dilinin üst kümesidir (superset)?',
    options: ['Java', 'Python', 'JavaScript', 'C++'],
    answer: 'JavaScript',
    difficulty: 'NORMAL'
  },
  {
    id: 'fb-2',
    type: 'MULTIPLE_CHOICE',
    question: 'Vite hangi amaçla kullanılan modern bir araçtır?',
    options: ['Veritabanı Yönetimi', 'Proje Derleme ve Sunucu', 'Stil Hazırlama', 'Yapay Zeka Modeli'],
    answer: 'Proje Derleme ve Sunucu',
    difficulty: 'NORMAL'
  },
  {
    id: 'fb-3',
    type: 'MULTIPLE_CHOICE',
    question: 'React bileşenlerinde durum yönetimi (state) için kullanılan temel kanca (hook) hangisidir?',
    options: ['useEffect', 'useContext', 'useState', 'useRef'],
    answer: 'useState',
    difficulty: 'NORMAL'
  },
  {
    id: 'fb-4',
    type: 'MULTIPLE_CHOICE',
    question: 'HTML kısaltmasının açılımı nedir?',
    options: ['HyperText Markup Language', 'HighText Machine Language', 'HyperTransfer Media Language', 'Home Tool Markup Language'],
    answer: 'HyperText Markup Language',
    difficulty: 'NORMAL'
  },
  {
    id: 'fb-5',
    type: 'MULTIPLE_CHOICE',
    question: 'CSS flexbox hangi temel amaç için kullanılır?',
    options: ['Veritabanı bağlantısı', 'Sayfa düzeni ve eleman hizalama', 'Animasyon hızı artırma', 'Dosya yükleme kontrolü'],
    answer: 'Sayfa düzeni ve eleman hizalama',
    difficulty: 'NORMAL'
  }
];

import Auth from './components/Auth';
import { supabase } from './utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const { t, language, setLanguage } = useTranslation();
  const [view, setView] = useState<'ANALYZE' | 'GAME' | 'MARKET'>('ANALYZE');

  const GAMES = getGames(t);

  // Auth Session
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Premium & i18n states
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [gameType, setGameType] = useState<GameType>('SPACE');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  
  const [highScores, setHighScores] = useState<Record<GameType, number>>(INITIAL_HIGH_SCORES);
  const [coins, setCoins] = useState<number>(0);
  const [inventory, setInventory] = useState<string[]>([]);
  const [equippedSkins, setEquippedSkins] = useState<Record<string, string>>({});
  const [aiGenerationCount, setAiGenerationCount] = useState<number>(0);

  useEffect(() => {
    if (!session?.user) return;
    
    // Fetch Profile
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data, error }) => {
      if (data) {
        setCoins(data.coins);
        setIsPremium(data.is_premium);
        setAiGenerationCount(data.ai_generation_count || 0);
      }
    });

    // Fetch Inventory
    supabase.from('inventory').select('skin_id').eq('user_id', session.user.id).then(({ data }) => {
      if (data) setInventory(data.map(i => i.skin_id));
    });

    // Fetch Equipped Skins
    supabase.from('equipped_skins').select('game_id, skin_id').eq('user_id', session.user.id).then(({ data }) => {
      if (data) {
        const eq: Record<string, string> = {};
        data.forEach(d => { eq[d.game_id] = d.skin_id; });
        setEquippedSkins(eq);
      }
    });

    // Fetch Highscores
    supabase.from('high_scores').select('game_id, score').eq('user_id', session.user.id).then(({ data }) => {
      if (data) {
        const hs = { ...INITIAL_HIGH_SCORES };
        data.forEach(d => {
          if (d.score > hs[d.game_id as GameType]) hs[d.game_id as GameType] = d.score;
        });
        setHighScores(hs);
      }
    });

  }, [session]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('eduplay_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('eduplay_theme', theme);
  }, [theme]);

  const handleSetHighScore = (gameType: GameType) => (newScore: number) => {
    setHighScores(prev => {
      const best = Math.max(prev[gameType], newScore);
      if (session?.user && best > prev[gameType]) {
        supabase.from('high_scores').upsert({ user_id: session.user.id, game_id: gameType, score: best }).then();
      }
      return { ...prev, [gameType]: best };
    });
  };

  const addCoins = (amount: number) => {
    setCoins(prev => {
      const updated = prev + amount;
      if (session?.user) supabase.from('profiles').update({ coins: updated }).eq('id', session.user.id).then();
      return updated;
    });
  };

  const handleBuySkin = (skinId: string, cost: number) => {
    if (coins >= cost && !inventory.includes(skinId)) {
      setCoins(prev => {
        const updated = prev - cost;
        if (session?.user) supabase.from('profiles').update({ coins: updated }).eq('id', session.user.id).then();
        return updated;
      });
      setInventory(prev => {
        const updated = [...prev, skinId];
        if (session?.user) supabase.from('inventory').insert({ user_id: session.user.id, skin_id: skinId }).then();
        return updated;
      });
    }
  };

  const handleEquipSkin = (gameId: string, skinId: string) => {
    setEquippedSkins(prev => {
      const updated = { ...prev, [gameId]: skinId };
      if (session?.user) supabase.from('equipped_skins').upsert({ user_id: session.user.id, game_id: gameId, skin_id: skinId }).then();
      return updated;
    });
  };

  const handleUnlockAllSkins = () => {
    const allIds = SKINS.map(s => s.id);
    setInventory(allIds);
    if (session?.user) {
      allIds.forEach(id => supabase.from('inventory').upsert({ user_id: session.user.id, skin_id: id }).then());
    }
  };

  const handleResetAllSkins = () => {
    setInventory([]);
    setEquippedSkins({});
    if (session?.user) {
      supabase.from('inventory').delete().eq('user_id', session.user.id).then();
      supabase.from('equipped_skins').delete().eq('user_id', session.user.id).then();
    }
  };
  const currentGame = GAMES.find(g => g.id === gameType)!;

  const renderGame = () => {
    const props = {  
      questions: questions.length > 0 ? questions : FALLBACK_QUESTIONS,
      onBack: () => {
        
        setView('ANALYZE');
      },
      highScore: highScores[gameType],
      setHighScore: handleSetHighScore(gameType),
      difficulty,
      addCoins,
      skin: equippedSkins[gameType] || 'DEFAULT',
      
    };
    switch (gameType) {
      case 'SPACE': return <ArcadeGame {...props} />;
      case 'DINO': return <DinoGame {...props} />;
      case 'FLAPPY': return <FlappyBirdGame {...props} />;
      case 'SNAKE': return <SnakeGame {...props} />;
      case 'BREAKOUT': return <BreakoutGame {...props} />;
      case 'PONG': return <PongGame {...props} />;
      case 'TETRIS': return <TetrisGame {...props} />;
      case 'BOMB': return <BombGame {...props} />;
      default: return null;
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'tr' ? 'en' : 'tr');
  };

  if (!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white pb-20 sm:pb-0">
      
      {showPremiumModal && (
        <PremiumModal 
          onClose={() => setShowPremiumModal(false)} 
          onSubscribe={() => {
            setIsPremium(true);
            setShowPremiumModal(false);
            if (session?.user) supabase.from('profiles').update({ is_premium: true }).eq('id', session.user.id).then();
          }} 
        />
      )}

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 select-none min-w-0">
            <div className="bg-gradient-to-br from-indigo-500 to-amber-500 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20 shrink-0">
              <Gamepad2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                {t('app.title')}
              </h1>
              <p className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowPremiumModal(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                isPremium 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">{isPremium ? 'Premium' : t('app.premium.button')}</span>
            </button>

            <button
              onClick={toggleLanguage}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700/50 shadow-inner text-slate-300 cursor-pointer"
              title={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
            >
              <Globe className="w-4 h-4 text-sky-400" />
            </button>
            
            {/* Desktop Tabs */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setView('ANALYZE')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  view === 'ANALYZE' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                {t('app.tab.analyze')}
              </button>
              <button
                onClick={() => setView('GAME')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  view === 'GAME' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Play className="w-4 h-4" />
                {t('app.tab.games')}
              </button>
              <button
                onClick={() => setView('MARKET')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  view === 'MARKET' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {t('app.tab.market')}
              </button>
            </div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700/50 shadow-inner text-slate-300 cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 pb-safe">
        <div className="flex items-center justify-around p-2 gap-2">
          <button
            onClick={() => setView('ANALYZE')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'ANALYZE' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="truncate">{t('app.tab.analyze')}</span>
          </button>
          <button
            onClick={() => setView('GAME')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'GAME' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Play className="w-5 h-5" />
            <span className="truncate">{t('app.tab.games')}</span>
          </button>
          <button
            onClick={() => setView('MARKET')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'MARKET' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="truncate">{t('app.tab.market')}</span>
          </button>
        </div>
      </div>

      {/* Analyzer View */}
      {view === 'ANALYZE' && (
        <>
          {/* Game Picker */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 select-none">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {GAMES.map(g => {
                const isSelected = gameType === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGameType(g.id)}
                    className={`group flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95 touch-manipulation min-h-[72px] cursor-pointer ${isSelected
                        ? `bg-gradient-to-br ${GAME_COLORS[g.id]} border-white/30 shadow-lg text-white scale-105`
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 active:bg-slate-800/60'
                      }`}
                  >
                    <span className="text-xl sm:text-2xl leading-none transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-1 group-active:scale-90 inline-block">{g.emoji}</span>
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-center leading-tight truncate w-full px-1">{g.name}</span>
                    {highScores[g.id] > 0 && (
                      <span className={`text-[8px] sm:text-[9px] font-mono px-1 rounded mt-0.5 ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'}`}>
                        {highScores[g.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Launch Button */}
          {questions.length > 0 && (
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-3 select-none">
              <button
                onClick={() => setView('GAME')}
                className={`w-full bg-gradient-to-r ${GAME_COLORS[gameType]} hover:brightness-110 text-white font-black px-4 py-3 rounded-xl shadow-lg active:scale-[0.99] transition flex items-center justify-center gap-2`}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{currentGame.emoji} {currentGame.name}'na Başla</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{questions.length} Soru</span>
              </button>
            </div>
          )}

          <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 select-none">
            {view === 'ANALYZE' && (
              <FileAnalyzer
                questions={questions}
                setQuestions={setQuestions}
                onLaunchGame={() => setView('GAME')}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                isPremium={isPremium}
                onRequirePremium={() => setShowPremiumModal(true)}
                aiGenerationCount={aiGenerationCount}
                onAiGenerated={() => {
                  setAiGenerationCount(prev => {
                    const newCount = prev + 1;
                    if (session?.user) {
                      supabase.from('profiles').update({ ai_generation_count: newCount }).eq('id', session.user.id).then();
                    }
                    return newCount;
                  });
                }}
              />
            )}
          </main>
        </>
      )}

      {/* Game View */}
      {view === 'GAME' && (
        <div className="w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
          {isBetModeActive ? (
            <BlackjackGame
              onBack={() => {
                setIsBetModeActive(false);
                setView('BET_MENU');
              }}
              questions={questions.length > 0 ? questions : FALLBACK_QUESTIONS}
            />
          ) : (
            renderGame()
          )}
        </div>
      )}

      {/* Market View */}
      {view === 'MARKET' && (
        <div className="w-full flex-1 flex flex-col p-4 sm:p-6">
          <Market
            coins={coins}
            inventory={inventory}
            equipped={equippedSkins}
            onBuy={handleBuySkin}
            onEquip={handleEquipSkin}
            onBack={() => setView('ANALYZE')}
            onUnlockAll={handleUnlockAllSkins}
            onResetAll={handleResetAllSkins}
          />
        </div>
      )}
{/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/30 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center text-[10px] text-slate-500">
          <span>© 2026 EduPlay Arcade</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            7 Oyun Hazır
          </span>
        </div>
      </footer>
    </div>
  );
}
