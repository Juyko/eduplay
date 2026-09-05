import { useState } from 'react';
import { ArrowLeft, Check, Lock, Unlock, KeyRound } from 'lucide-react';
import { useTranslation } from '../utils/i18n';

export const SKINS = [
  // DINO
  { id: 'DINO_DEFAULT', gameId: 'DINO', name: 'Klasik Mor', price: 0, emoji: '🦖', color: 'bg-indigo-600', description: 'Orijinal mor dinozor.' },
  { id: 'DINO_GOLD', gameId: 'DINO', name: 'Altın Dino', price: 50, emoji: '👑', color: 'bg-amber-400', description: 'Zenginlerin tercihi parlayan dino.' },
  { id: 'DINO_NINJA', gameId: 'DINO', name: 'Ninja Dino', price: 200, emoji: '🥷', color: 'bg-slate-900', description: 'Kırmızı bandanalı karanlık ninja.' },
  // SPACE
  { id: 'SPACE_DEFAULT', gameId: 'SPACE', name: 'Klasik Gemi', price: 0, emoji: '🚀', color: 'bg-blue-600', description: 'Orijinal uzay gemisi.' },
  { id: 'SPACE_UFO', gameId: 'SPACE', name: 'UFO', price: 150, emoji: '🛸', color: 'bg-emerald-600', description: 'Plazma atan yeşil uçan daire.' },
  { id: 'SPACE_XJET', gameId: 'SPACE', name: 'X-Jet', price: 300, emoji: '✈️', color: 'bg-cyan-600', description: 'Keskin hatlı galaktik avcı jeti.' },
  // FLAPPY
  { id: 'FLAPPY_DEFAULT', gameId: 'FLAPPY', name: 'Sarı Kuş', price: 0, emoji: '🐤', color: 'bg-yellow-500', description: 'Orijinal kanatlı kuş.' },
  { id: 'FLAPPY_BAT', gameId: 'FLAPPY', name: 'Gece Yarasası', price: 100, emoji: '🦇', color: 'bg-slate-800', description: 'Karanlık ve tehditkar.' },
  { id: 'FLAPPY_COPTER', gameId: 'FLAPPY', name: 'Helikopter', price: 250, emoji: '🚁', color: 'bg-orange-500', description: 'Pervanesi dönen tatlı araç.' },
  // SNAKE
  { id: 'SNAKE_DEFAULT', gameId: 'SNAKE', name: 'Yeşil Yılan', price: 0, emoji: '🐍', color: 'bg-emerald-500', description: 'Klasik doymak bilmeyen yılan.' },
  { id: 'SNAKE_FIRE', gameId: 'SNAKE', name: 'Ateş Yılanı', price: 150, emoji: '🔥', color: 'bg-red-500', description: 'Lavdan yapılmış parlayan pullar.' },
  { id: 'SNAKE_BONE', gameId: 'SNAKE', name: 'İskelet Yılan', price: 250, emoji: '☠️', color: 'bg-slate-200 text-slate-900', description: 'Ölümcül kemik yılan.' },
  // BREAKOUT
  { id: 'BREAKOUT_DEFAULT', gameId: 'BREAKOUT', name: 'Ahşap Raket', price: 0, emoji: '🏏', color: 'bg-amber-700', description: 'Klasik düz raket.' },
  { id: 'BREAKOUT_NEON', gameId: 'BREAKOUT', name: 'Neon Lazer', price: 100, emoji: '⚔️', color: 'bg-fuchsia-500', description: 'Cyberpunk tarzı ışın kılıcı.' },
  { id: 'BREAKOUT_SHIELD', gameId: 'BREAKOUT', name: 'Kalkan', price: 200, emoji: '🛡️', color: 'bg-blue-700', description: 'Metalik defansif kalkan.' },
  // PONG
  { id: 'PONG_DEFAULT', gameId: 'PONG', name: 'Klasik Masa', price: 0, emoji: '🏓', color: 'bg-slate-800', description: 'Klasik siyah-beyaz.' },
  { id: 'PONG_ICE', gameId: 'PONG', name: 'Buz Hokeyi', price: 100, emoji: '🧊', color: 'bg-sky-400', description: 'Buzlu zemin ve kar taneleri.' },
  { id: 'PONG_NEON', gameId: 'PONG', name: 'Cyber Tenis', price: 200, emoji: '🎾', color: 'bg-lime-500', description: 'Yüksek neon glow parlama.' },
  // TETRIS
  { id: 'TETRIS_DEFAULT', gameId: 'TETRIS', name: 'Klasik Bloklar', price: 0, emoji: '🧩', color: 'bg-violet-600', description: 'Orijinal renkli bloklar.' },
  { id: 'TETRIS_RETRO', gameId: 'TETRIS', name: 'Retro Gameboy', price: 150, emoji: '🕹️', color: 'bg-stone-500', description: '90ların gri tonlamalı blokları.' },
  { id: 'TETRIS_CRYSTAL', gameId: 'TETRIS', name: 'Mücevher', price: 300, emoji: '💎', color: 'bg-fuchsia-400', description: 'Işıl ışıl kristal elmas bloklar.' },
  // BOMB
  { id: 'BOMB_DEFAULT', gameId: 'BOMB', name: 'C4 Patlayıcı', price: 0, emoji: '💣', color: 'bg-red-800', description: 'Standart bomba kasası.' },
  { id: 'BOMB_TNT', gameId: 'BOMB', name: 'Dinamit Lokumu', price: 150, emoji: '🧨', color: 'bg-orange-600', description: 'Kırmızı TNT çubukları.' },
  { id: 'BOMB_NUKE', gameId: 'BOMB', name: 'Nükleer Çanta', price: 350, emoji: '☢️', color: 'bg-zinc-800', description: 'Radyoaktif ajan çantası.' },
];

interface Props {
  coins: number;
  inventory: string[];
  equipped: Record<string, string>;
  onBuy: (skinId: string, cost: number) => void;
  onEquip: (gameId: string, skinId: string) => void;
  onBack: () => void;
  onUnlockAll?: () => void;
  onResetAll?: () => void;
}

export default function Market({ coins, inventory, equipped, onBuy, onEquip, onBack, onUnlockAll, onResetAll }: Props) {
  const { t } = useTranslation();
  const [adminCode, setAdminCode] = useState('');
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
      {/* Sticky Header */}
      <div className="sticky top-4 z-50 w-full flex justify-between items-center mb-8 bg-slate-900/90 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-200 font-bold transition active:scale-95 shadow-lg border border-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
          🛍️ {t('market.title')}
        </h2>
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 px-4 py-2 rounded-xl">
          <span className="text-amber-500 font-bold">{t('market.coins')}</span>
          <span className="text-amber-400 font-black text-xl">{coins}</span>
          <span className="hidden sm:inline text-sm font-bold text-amber-500/80 uppercase">Jeton</span>
        </div>
      </div>

      <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-700/50 shadow-2xl">
        <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-3">
          {t('market.store.title')}
        </h2>
        <p className="text-slate-400 mb-8">{t('market.store.desc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {SKINS.map((skin) => {
            const isOwned = skin.price === 0 || inventory.includes(skin.id);
            const isEquipped = equipped[skin.gameId] === skin.id || (skin.price === 0 && !equipped[skin.gameId] && skin.id.includes('DEFAULT'));
            
            return (
              <div key={skin.id} className={`flex flex-col rounded-2xl overflow-hidden border-2 transition-transform ${isEquipped ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : isOwned ? 'border-slate-600 hover:border-slate-500' : 'border-slate-800'}`}>
                {/* Header */}
                <div className={`${skin.color} p-6 flex flex-col items-center justify-center relative overflow-hidden group`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  <span className="text-6xl relative z-10 filter drop-shadow-lg transform group-hover:scale-110 transition-transform">{skin.emoji}</span>
                  {isEquipped && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full z-10 shadow-lg">
                      <Check className="w-4 h-4 font-black" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 bg-slate-900/80 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white">{t(`skin.${skin.id}.name`)}</h3>
                    <div className="bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-400">{skin.gameId}</div>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 flex-1">{t(`skin.${skin.id}.desc`)}</p>

                  {/* Action Button */}
                  {isEquipped ? (
                    <button disabled className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex justify-center items-center gap-2">
                      <Check className="w-5 h-5" /> {t('market.equipped')}
                    </button>
                  ) : isOwned ? (
                    <button 
                      onClick={() => onEquip(skin.gameId, skin.id)}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/30"
                    >
                      <Unlock className="w-5 h-5" /> {t('market.equip')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => onBuy(skin.id, skin.price)}
                      disabled={coins < skin.price}
                      className={`w-full py-3 rounded-xl font-bold transition flex justify-center items-center gap-2 ${coins >= skin.price ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      {coins >= skin.price ? '🪙' : <Lock className="w-4 h-4" />} 
                      {skin.price} {t('market.buy')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-slate-950/50 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <h4 className="font-bold text-slate-300 flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4" /> {t('market.admin.title')}
            </h4>
            <p className="text-xs text-slate-500">{t('market.admin.desc')}</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <input 
              type="password" 
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder={t('market.admin.placeholder')} 
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 outline-none focus:border-indigo-500 w-full sm:w-48"
            />
            <button 
              onClick={() => {
                if (adminCode === 'MERT_ADMIN' && onUnlockAll) {
                  onUnlockAll();
                  setAdminCode('');
                  alert('Tüm kostümler başarıyla açıldı!');
                } else if (adminCode === 'MERT_RESET' && onResetAll) {
                  onResetAll();
                  setAdminCode('');
                  alert('Tüm kostümler başarıyla sıfırlandı!');
                } else if ((adminCode === 'BLACKJACK' || adminCode === 'DEATHGAME' || adminCode === 'BAHIS') && onUnlockBetMode) {
                  onUnlockBetMode();
                  setAdminCode('');
                  alert(t('market.admin.success_bet'));
                } else {
                  alert(t('market.admin.error'));
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg transition active:scale-95 flex-1 sm:flex-none whitespace-nowrap"
            >
              {t('market.admin.submit')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
