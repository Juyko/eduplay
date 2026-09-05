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
import BlackjackGame from './components/BlackjackGame';
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
  const [view, setView] = useState<'ANALYZE' | 'GAME' | 'MARKET' | 'BET_MENU'>('ANALYZE');

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

  // Bet mode state
  const [isBetModeUnlocked, setIsBetModeUnlocked] = useState<boolean>(false);
  const [isBetModeActive, setIsBetModeActive] = useState<boolean>(false);
  const [currentBet, setCurrentBet] = useState<number>(10);
  const [betResult, setBetResult] = useState<{
    score: number;
    won: boolean;
    payout: number;
    gameEmoji: string;
    gameName: string;
  } | null>(null);
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

  const handleGameOverBet = (arg1: number | boolean, payoutOrDummy?: number, gameEmoji?: string, gameName?: string) => {
    if (isBetModeActive && typeof arg1 === 'boolean') {
      const won = arg1;
      const payout = payoutOrDummy || 0;
      
      if (payout > 0) {
        addCoins(payout);
      }
      
      setBetResult({
        score: 0,
        won,
        payout,
        gameEmoji: gameEmoji || '🃏',
        gameName: gameName || 'Blackjack'
      });
      setIsBetModeActive(false);
      setView('BET_MENU');
    }
  };

  const handleStartBetGame = () => {
    if (coins < currentBet && coins === 0 && currentBet <= 10) {
      addCoins(-currentBet);
    } else if (coins < currentBet) {
      alert(t('app.alert.balance'));
      return;
    } else {
      addCoins(-currentBet);
    }
    
    setIsBetModeActive(true);
    setView('GAME');
  };

  const currentGame = GAMES.find(g => g.id === gameType)!;

  const renderGame = () => {
    const props = {  
      questions: questions.length > 0 ? questions : FALLBACK_QUESTIONS,
      onBack: () => {
        if (isBetModeActive) {
          setIsBetModeActive(false);
        }
        setView(isBetModeActive || view === 'BET_MENU' ? 'BET_MENU' : 'ANALYZE');
      },
      highScore: highScores[gameType],
      setHighScore: handleSetHighScore(gameType),
      difficulty,
      addCoins,
      skin: equippedSkins[gameType] || 'DEFAULT',
      onGameOver: handleGameOverBet
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
            {view !== 'MARKET' && view !== 'GAME' && isBetModeUnlocked && (
              <button
                onClick={() => setView('BET_MENU')}
                className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-rose-900/80 to-red-950/85 hover:from-rose-800 hover:to-red-900 border border-rose-800/60 hover:border-red-700/60 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.25)] text-red-300 font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                <Skull className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">{t('app.betmode.active')}</span>
              </button>
            )}
            
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
              onGameOver={handleGameOverBet}
              currentBet={currentBet}
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
            onUnlockBetMode={() => {
              setIsBetModeUnlocked(true);
              setView('BET_MENU');
            }}
          />
        </div>
      )}

      {/* Bet Menu View */}
      {view === 'BET_MENU' && (
        <div className="relative z-10 max-w-4xl w-full mx-auto p-4 sm:p-6 select-none flex-1 flex flex-col justify-center">
          <div className="bg-slate-900/60 border-2 border-red-950/60 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-red-950/40 pb-4 gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 tracking-wider flex items-center gap-2">
                  <Skull className="w-6 h-6 text-red-500 animate-bounce" /> BLACKJACK BAHİS MASASI
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Puanlarınla Blackjack oyna, kaybedersen soru bilerek bahsini kurtar!
                </p>
              </div>
              <button
                onClick={() => setView('ANALYZE')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl transition text-sm shadow-md cursor-pointer"
              >
                Ana Menüye Dön
              </button>
            </div>

            {/* Betting Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Stats & Setup */}
              <div className="bg-slate-950/60 border border-red-950/40 p-5 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Bahis Kurulumu</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-400">Bakiyeniz:</span>
                    <div className="text-amber-400 font-black text-lg flex items-center gap-1">
                      <span>🪙</span> {coins}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-400 block mb-2">Bahis Miktarı:</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max={Math.max(10, Math.floor(coins / 10) * 10 || 100)}
                        step="10"
                        value={currentBet}
                        onChange={(e) => setCurrentBet(Number(e.target.value))}
                        className="flex-1 accent-red-500 bg-slate-800 rounded-lg h-2"
                      />
                      <span className="bg-red-950/50 border border-red-800/40 text-red-400 font-black text-lg px-3 py-1 rounded-xl min-w-[70px] text-center font-mono">
                        {currentBet}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[10, 50, 100, 200, 500].map(val => (
                      <button
                        key={val}
                        onClick={() => setCurrentBet(val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black font-mono transition border cursor-pointer ${
                          currentBet === val
                            ? 'bg-red-500 border-red-400 text-slate-950'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Borç alma uyarısı */}
                {coins <= 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 p-3 rounded-xl text-[11px] font-semibold leading-relaxed">
                    💡 Jetonunuz kalmadığı için 10 jetona kadar borç alıp bahis yapabilirsiniz! İlk kazancınızdan borç düşülecektir.
                  </div>
                )}

                {/* Soru havuzu uyarısı */}
                {questions.length === 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-[11px] font-semibold leading-relaxed flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Yüklü soru dosyası bulunamadı. Genel Kültür yedek soru havuzu kullanılacaktır.</span>
                  </div>
                )}
              </div>

              {/* Right Column: Game Info */}
              <div className="bg-slate-950/60 border border-red-950/40 p-5 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Kurallar</h3>
                  <ul className="space-y-3 text-xs font-semibold text-slate-400 list-disc list-inside">
                    <li>Amaç 21'i geçmeden kasadan daha yüksek puan almaktır.</li>
                    <li>As (A) 1 veya 11 puan değerindedir.</li>
                    <li>Kasa 17 puana ulaşana kadar zorunlu kart çeker.</li>
                    <li><span className="text-emerald-400 font-bold">Kazanırsanız:</span> Bahsinizin 2 katını alırsınız.</li>
                    <li><span className="text-red-400 font-bold">Kaybederseniz:</span> Soruyu doğru bilirseniz bahsiniz iade edilir, aksi halde kaybedersiniz.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartBetGame}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:brightness-110 text-slate-950 font-black tracking-widest text-lg rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] active:scale-[0.99] transition flex items-center justify-center gap-3 uppercase cursor-pointer"
            >
              <Skull className="w-6 h-6 stroke-[3]" />
              <span>Masaya Otur 🃏</span>
            </button>
          </div>
        </div>
      )}


      {/* Bet Result Modal */}
      {betResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
          <div className={`w-full max-w-md border-2 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden bg-slate-900 ${
            betResult.payout > 0
              ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
              : 'border-red-950 shadow-[0_0_50px_rgba(239,68,68,0.2)]'
          }`}>
            <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-[60px] opacity-20 ${
              betResult.payout > 0 ? 'bg-emerald-500' : 'bg-red-500'
            }`}></div>

            <div className="text-6xl mb-4 transform scale-110 filter drop-shadow-md select-none">
              {betResult.won ? '🏆' : '💀'}
            </div>

            <h3 className={`text-3xl font-black tracking-wider uppercase mb-2 ${
              betResult.payout >= currentBet * 3
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500'
                : betResult.won
                ? 'text-emerald-400'
                : 'text-red-500'
            }`}>
              {betResult.payout >= currentBet * 3
                ? 'MEGA KAZANÇ!'
                : betResult.won
                ? 'BAHİS KAZANILDI!'
                : 'BAHİS KAYBEDİLDİ'}
            </h3>

            <p className="text-slate-400 text-xs mb-6 font-semibold">
              {betResult.gameEmoji} {betResult.gameName} oyununda ölüm bahsi sonuçlandı.
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">Yaptığınız Bahis:</span>
                <span className="font-black text-slate-200 font-mono">{currentBet} 🪙</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/60 pt-3">
                <span className="text-xs text-slate-400 font-bold">Kazanılan Jeton:</span>
                <span className={`font-black text-lg font-mono ${
                  betResult.payout > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {betResult.payout > 0 ? `+${betResult.payout}` : '0'} 🪙
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBetResult(null);
                  setView('BET_MENU');
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition text-xs border border-slate-700 cursor-pointer"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  setBetResult(null);
                  handleStartBetGame();
                }}
                className={`flex-1 font-black py-3 rounded-xl transition text-xs shadow-lg cursor-pointer ${
                  betResult.won
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-red-600 to-orange-600 text-slate-950 hover:brightness-110 shadow-red-500/20'
                }`}
              >
                Tekrar Bahis Yap 🔄
              </button>
            </div>
          </div>
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
