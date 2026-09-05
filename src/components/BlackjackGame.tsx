import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Question } from '../utils/questionExtractor';
import QuestionModal from './QuestionModal';

type Card = {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  weight: number;
};

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getCardWeight = (value: string): number => {
  if (['J', 'Q', 'K'].includes(value)) return 10;
  if (value === 'A') return 11;
  return parseInt(value);
};

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({ suit, value, weight: getCardWeight(value) });
      }
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    score += card.weight;
    if (card.value === 'A') aces += 1;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};

interface BlackjackGameProps {
  onBack: () => void;
  onGameOver: (won: boolean, payout: number, gameEmoji: string, gameName: string) => void;
  currentBet: number;
  questions: Question[];
}

export default function BlackjackGame({ onBack, onGameOver, currentBet, questions }: BlackjackGameProps) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealerTurn' | 'gameOver'>('playing');
  const [message, setMessage] = useState('');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Track if rescue has been used this hand
  const [rescueUsed, setRescueUsed] = useState(false);
  const [isDoubled, setIsDoubled] = useState(false);
  
  // Initialize game
  useEffect(() => {
    startNewHand();
  }, []);

  const startNewHand = () => {
    const newDeck = createDeck();
    const pHand = [newDeck[0], newDeck[2]];
    const dHand = [newDeck[1], newDeck[3]];
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setDeck(newDeck.slice(4));
    setIsDoubled(false);
    setMessage('');
    setRescueUsed(false);

    const pScore = calculateScore(pHand);
    const dScore = calculateScore(dHand);

    if (pScore === 21) {
      setGameState('gameOver');
      if (dScore === 21) {
        setTimeout(() => endGame(false, currentBet, 'Berabere! (İkiniz de Blackjack)'), 1000);
      } else {
        setTimeout(() => endGame(true, currentBet * 2.5, 'Blackjack! 3:2 Kazanç'), 1000);
      }
    } else {
      setGameState('playing');
    }
  };

  const drawCard = (currentDeck: Card[]): { card: Card, remainingDeck: Card[] } => {
    const deckCopy = [...currentDeck];
    const card = deckCopy.shift()!;
    return { card, remainingDeck: deckCopy };
  };

  const handleHit = () => {
    if (gameState !== 'playing') return;
    const { card, remainingDeck } = drawCard(deck);
    setDeck(remainingDeck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);

    if (calculateScore(newHand) > 21) {
      handleLoss();
    }
  };

  const handleStand = () => {
    if (gameState !== 'playing') return;
    setGameState('dealerTurn');
  };

  const handleDoubleDown = () => {
    if (gameState !== 'playing' || playerHand.length > 2) return;
    setIsDoubled(true);
    const { card, remainingDeck } = drawCard(deck);
    setDeck(remainingDeck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    
    if (calculateScore(newHand) > 21) {
      handleLoss(true);
    } else {
      setGameState('dealerTurn');
    }
  };

  const handleLoss = (doubledOverride = false) => {
    const doubled = doubledOverride || isDoubled;
    if (!rescueUsed && questions.length > 0) {
      triggerRescue();
    } else {
      endGame(false, doubled ? -currentBet : 0, 'Kasa Kazandı (Bust)');
    }
  };

  // Dealer play logic
  useEffect(() => {
    if (gameState === 'dealerTurn') {
      let currentDealerHand = [...dealerHand];
      let currentDealerScore = calculateScore(currentDealerHand);
      let currentDeck = [...deck];

      const playDealer = () => {
        if (currentDealerScore < 17) {
          const { card, remainingDeck } = drawCard(currentDeck);
          currentDeck = remainingDeck;
          currentDealerHand = [...currentDealerHand, card];
          currentDealerScore = calculateScore(currentDealerHand);
          setDealerHand(currentDealerHand);
          setDeck(currentDeck);
          setTimeout(playDealer, 800); // delay for effect
        } else {
          determineWinner(currentDealerHand);
        }
      };
      
      setTimeout(playDealer, 800);
    }
  }, [gameState]);

  const determineWinner = (finalDealerHand: Card[]) => {
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(finalDealerHand);

    if (dealerScore > 21) {
      endGame(true, currentBet * (isDoubled ? 3 : 2), 'Kasa Battı! Kazandın');
    } else if (dealerScore > playerScore) {
      handleLoss();
    } else if (dealerScore < playerScore) {
      endGame(true, currentBet * (isDoubled ? 3 : 2), 'Kazandın!');
    } else {
      endGame(false, currentBet, 'Berabere! (Bahis İade)');
    }
  };

  const triggerRescue = () => {
    const q = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(q);
    setShowQuestionModal(true);
    setGameState('gameOver'); // Pause game
  };

  const handleRescueAnswer = (isCorrect: boolean) => {
    setShowQuestionModal(false);
    setRescueUsed(true);
    if (isCorrect) {
      // Rescued the bet. Returns them to Net 0
      endGame(true, currentBet, 'Kurtarıldı! (Bahis İade)');
    } else {
      // Failed rescue
      endGame(false, isDoubled ? -currentBet : 0, 'Yanlış Cevap. Kasa Kazandı.');
    }
  };

  const endGame = (won: boolean, payout: number, finalMessage: string) => {
    setGameState('gameOver');
    setMessage(finalMessage);
    setTimeout(() => {
      onGameOver(won, payout, '🃏', 'Blackjack');
    }, 2000);
  };

  const CardComponent = ({ card, hidden }: { card: Card, hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className={`w-16 h-24 sm:w-20 sm:h-32 bg-white rounded-xl shadow-lg border-2 ${hidden ? 'border-slate-300 bg-slate-200' : 'border-slate-200'} flex flex-col items-center justify-between p-2 select-none`}>
        {hidden ? (
          <div className="w-full h-full bg-slate-800 rounded-lg repeating-linear-gradient flex items-center justify-center">
            <span className="text-white text-2xl">?</span>
          </div>
        ) : (
          <>
            <span className={`text-lg sm:text-xl font-bold self-start leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.value}</span>
            <span className={`text-3xl sm:text-4xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.suit}</span>
            <span className={`text-lg sm:text-xl font-bold self-end leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.value}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col bg-green-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-green-950 relative">
      {/* Header */}
      <div className="bg-green-950/80 p-4 flex justify-between items-center z-10 border-b border-green-800/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
              🃏 Blackjack
            </h2>
          </div>
        </div>
        <div className="bg-slate-900/60 px-4 py-2 rounded-xl flex flex-col items-end">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Bahis Miktarı</span>
          <span className="text-lg font-black text-amber-400">{isDoubled ? currentBet * 2 : currentBet} 🪙</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between p-6 relative">
        {/* Dealer Area */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="bg-black/20 px-4 py-1 rounded-full text-white/70 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            Kasa Skoru: {gameState === 'playing' ? '?' : calculateScore(dealerHand)}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {dealerHand.map((card, i) => (
              <CardComponent key={i} card={card} hidden={gameState === 'playing' && i === 1} />
            ))}
          </div>
        </div>

        {/* Message Area */}
        {message && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-slate-900/90 text-white font-black text-2xl sm:text-3xl px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-white/20 whitespace-nowrap text-center">
              {message}
            </div>
          </div>
        )}

        {/* Player Area */}
        <div className="w-full flex flex-col items-center gap-6 mt-8">
          <div className="flex gap-2 justify-center flex-wrap">
            {playerHand.map((card, i) => (
              <CardComponent key={i} card={card} />
            ))}
          </div>
          <div className="bg-black/20 px-4 py-1 rounded-full text-white/90 font-black text-lg uppercase tracking-wider flex items-center gap-2">
            Skor: {calculateScore(playerHand)}
          </div>
          
          {/* Controls */}
          {gameState === 'playing' && (
            <div className="flex gap-3">
              <button 
                onClick={handleHit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition text-lg"
              >
                KART ÇEK
              </button>
              <button 
                onClick={handleStand}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition text-lg"
              >
                BEKLE
              </button>
              {playerHand.length === 2 && (
                <button 
                  onClick={handleDoubleDown}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition text-lg"
                >
                  2X KATLA
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showQuestionModal && currentQuestion && (
        <QuestionModal
          question={currentQuestion}
          onAnswer={handleRescueAnswer}
        />
      )}
    </div>
  );
}
