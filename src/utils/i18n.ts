import { useState, useEffect } from 'react';

export type Language = 'tr' | 'en';

type Translations = {
  [key: string]: {
    tr: string;
    en: string;
  };
};

export const translations: Translations = {
  // App.tsx
  'app.title': { tr: 'EduPlay Arcade', en: 'EduPlay Arcade' },
  'app.subtitle': { tr: 'Akıllı Soru Üretici', en: 'Smart Question Generator' },
  'app.tab.analyze': { tr: 'Dosya Analizi', en: 'File Analysis' },
  'app.tab.games': { tr: 'Oyunlar', en: 'Games' },
  'app.tab.market': { tr: 'Market', en: 'Market' },
  'app.premium.button': { tr: 'Premium', en: 'Premium' },
  'app.betmode.active': { tr: 'Bahis Modu Aktif', en: 'Bet Mode Active' },
  'app.betmode.info': { tr: 'Oyunlarda jetonlarınızı riske atarak iki katını kazanabilirsiniz.', en: 'Risk your coins in games to win double.' },
  
  // FileAnalyzer.tsx
  'analyze.upload.title': { tr: 'Dosya Yükle veya Metin Gir', en: 'Upload File or Enter Text' },
  'analyze.upload.desc': { tr: 'PDF, DOCX, TXT dosyalarını yükleyin veya metni doğrudan yapıştırın.', en: 'Upload PDF, DOCX, TXT files or paste text directly.' },
  'analyze.upload.button': { tr: 'Dosya Seçin', en: 'Select File' },
  'analyze.upload.drag': { tr: 'veya sürükleyip bırakın', en: 'or drag and drop' },
  'analyze.ai.settings': { tr: 'Yapay Zeka Soru Üretici', en: 'AI Question Generator' },
  'analyze.ai.prompt': { tr: 'Nasıl sorular istiyorsunuz?', en: 'What kind of questions do you want?' },
  'analyze.ai.prompt.placeholder': { tr: 'Örn: Sadece matematik formülleri içeren zor sorular...', en: 'e.g: Hard questions containing only math formulas...' },
  'analyze.ai.questionCount': { tr: 'Soru Sayısı', en: 'Question Count' },
  'analyze.ai.difficulty': { tr: 'Zorluk Seviyesi', en: 'Difficulty Level' },
  'analyze.ai.diff.easy': { tr: 'Kolay', en: 'Easy' },
  'analyze.ai.diff.medium': { tr: 'Orta', en: 'Medium' },
  'analyze.ai.diff.hard': { tr: 'Zor', en: 'Hard' },
  'analyze.ai.diff.mixed': { tr: 'Karışık', en: 'Mixed' },
  'analyze.ai.generate.button': { tr: 'AI ile Soru Üret', en: 'Generate with AI' },
  'analyze.ai.generating': { tr: 'Yapay Zeka Soruları Hazırlıyor...', en: 'AI is Preparing Questions...' },
  'analyze.ai.generating.wait': { tr: 'Lütfen bekleyin (yaklaşık 10-30 saniye)', en: 'Please wait (approx 10-30 seconds)' },
  'analyze.error.fileSize': { tr: "Dosya boyutu 5MB'ı geçemez.", en: 'File size cannot exceed 5MB.' },
  'analyze.error.api': { tr: 'Lütfen geçerli bir Groq veya Gemini API anahtarı girin.', en: 'Please enter a valid Groq or Gemini API key.' },
  'analyze.error.emptyText': { tr: 'Lütfen analiz edilecek bir metin girin veya dosya yükleyin.', en: 'Please enter text or upload a file to analyze.' },
  'analyze.error.aiLimit': { tr: "Ücretsiz sürümde en fazla 3 soru üretebilirsiniz! Sınırı kaldırmak için Premium'a geçin.", en: 'Free version limited to 3 questions! Upgrade to Premium to remove the limit.' },
  'analyze.premium.feature': { tr: 'Bu özellik Premium gerektirir', en: 'This feature requires Premium' },
  
  // Settings & API
  'settings.api.title': { tr: 'API Ayarları', en: 'API Settings' },
  'settings.api.groq': { tr: 'Groq API Anahtarı', en: 'Groq API Key' },
  'settings.api.gemini': { tr: 'Gemini API Anahtarı', en: 'Gemini API Key' },
  
  // Market.tsx
  'market.title': { tr: 'Kostüm Marketi', en: 'Costume Market' },
  'market.coins': { tr: 'Jeton:', en: 'Coins:' },
  'market.select': { tr: 'Seç', en: 'Select' },
  'market.selected': { tr: 'Seçildi', en: 'Selected' },
  'market.secret': { tr: 'Gizli Kod', en: 'Secret Code' },
  'market.secret.placeholder': { tr: 'Kodu girin...', en: 'Enter code...' },
  'market.secret.apply': { tr: 'Uygula', en: 'Apply' },
  
  // Games metadata
  'game.SPACE.name': { tr: 'Uzay Macerası', en: 'Space Adventure' },
  'game.SPACE.desc': { tr: 'Asteroidleri vur', en: 'Shoot asteroids' },
  'game.DINO.name': { tr: 'Dinozor Koşusu', en: 'Dino Run' },
  'game.DINO.desc': { tr: 'Engelleri zıpla', en: 'Jump obstacles' },
  'game.FLAPPY.name': { tr: 'Kanatlı Kuş', en: 'Flappy Bird' },
  'game.FLAPPY.desc': { tr: 'Borulardan geç', en: 'Pass through pipes' },
  'game.SNAKE.name': { tr: 'Yılan Oyunu', en: 'Snake Game' },
  'game.SNAKE.desc': { tr: 'Yemleri topla', en: 'Collect food' },
  'game.BREAKOUT.name': { tr: 'Tuğla Kırma', en: 'Breakout' },
  'game.BREAKOUT.desc': { tr: 'Tuğlaları yık', en: 'Break the bricks' },
  'game.PONG.name': { tr: 'Pong', en: 'Pong' },
  'game.PONG.desc': { tr: 'Rakibi yen', en: 'Beat the opponent' },
  'game.TETRIS.name': { tr: 'Tetris', en: 'Tetris' },
  'game.TETRIS.desc': { tr: 'Satır tamamla', en: 'Complete lines' },
  'game.BOMB.name': { tr: 'Bomba İmha', en: 'Bomb Defusal' },
  'game.BOMB.desc': { tr: 'Zamana karşı yarış', en: 'Race against time' },
  
  // Games
  'game.score': { tr: 'Skor:', en: 'Score:' },
  'game.highscore': { tr: 'En İyi Skor:', en: 'High Score:' },
  'game.start': { tr: 'Başlamak için Boşluk veya Tıkla', en: 'Press Space or Click to Start' },
  'game.over': { tr: 'Oyun Bitti!', en: 'Game Over!' },
  'game.restart': { tr: 'Yeniden Oynamak için Boşluk veya Tıkla', en: 'Press Space or Click to Restart' },
  'game.level': { tr: 'Seviye:', en: 'Level:' },
  'game.bet': { tr: 'Bahis:', en: 'Bet:' },
  
  // Premium Modal
  'premium.title': { tr: 'Premium Dünyasına Katıl', en: 'Join the Premium World' },
  'premium.desc': { tr: "EduPlay Arcade'in tüm özelliklerini sınırsızca kullanın.", en: 'Use all features of EduPlay Arcade limitlessly.' },
  'premium.feature.1': { tr: 'Sınırsız AI Soru Üretimi', en: 'Unlimited AI Question Generation' },
  'premium.feature.2': { tr: 'Tüm zorluk seviyelerine erişim', en: 'Access to all difficulty levels' },
  'premium.feature.3': { tr: 'Sınırsız özel kostümler', en: 'Unlimited custom costumes' },
  'premium.feature.4': { tr: 'Özel Blackjack ve Bahis oyunları', en: 'Exclusive Blackjack and Bet games' },
  'premium.button': { tr: 'Şimdi Abone Ol - 49₺/Ay', en: 'Subscribe Now - $4.99/Month' },
  'premium.cancel': { tr: 'Daha Sonra', en: 'Maybe Later' },

  // FileAnalyzer - More UI
  'analyze.source.title': { tr: '1. Veri Kaynağı & Zorluk', en: '1. Data Source & Difficulty' },
  'analyze.source.desc': { tr: 'Hazır bir ders dosyası seçin ya da kendi dosyanızı yükleyin.', en: 'Choose a ready lesson file or upload yours.' },
  'analyze.diff.label': { tr: 'Zorluk Seviyesi', en: 'Difficulty Level' },
  'analyze.or.own': { tr: 'VEYA KENDİ DOSYANIZI', en: 'OR UPLOAD YOUR OWN' },
  'analyze.extract.fast': { tr: 'Hızlı Soru Çıkart (Offline)', en: 'Fast Extract (Offline)' },
  'analyze.ai.desc': { tr: '🤖 AI belgeyi okur, anlar ve grafik/tablo/formül içeren özgün sorular üretir.', en: '🤖 AI reads the document, understands it and generates unique questions with graphs/tables/formulas.' },
  'analyze.ai.model': { tr: 'Model:', en: 'Model:' },
  'analyze.ai.count': { tr: 'Soru Sayısı:', en: 'Question Count:' },
  'analyze.ai.gemini.vision': { tr: 'Gemini Vision ile fotoğraf doğrudan analiz edilecek.', en: 'Photo will be analyzed directly with Gemini Vision.' },
  'analyze.ai.groq.warn': { tr: 'Uyarı: Groq modelinin fotoğraf okuma özelliği kapalıdır. Fotoğraflar için Gemini seçin.', en: 'Warning: Groq vision is disabled. Choose Gemini for photos.' },
  'analyze.ai.custom.api': { tr: '⚙️ Kota dolduysa kendi API anahtarınızı girin', en: '⚙️ Enter your own API key if quota exceeded' },
  'analyze.ai.api.warn': { tr: 'Bu anahtarlar tarayıcınızda şifresiz saklanır, sunucuya gönderilmez.', en: 'These keys are stored unencrypted in your browser, not sent to server.' },
  
  'analyze.manual.title': { tr: 'Manuel Soru Ekle', en: 'Add Manual Question' },
  'analyze.manual.placeholder': { tr: 'Soru metni...', en: 'Question text...' },
  'analyze.manual.correct': { tr: 'Doğru Cevap', en: 'Correct Answer' },
  'analyze.manual.wrong1': { tr: 'Yanlış 1', en: 'Wrong 1' },
  'analyze.manual.wrong2': { tr: 'Yanlış 2', en: 'Wrong 2' },
  'analyze.manual.wrong3': { tr: 'Yanlış 3', en: 'Wrong 3' },
  'analyze.manual.add': { tr: 'Soru Ekle', en: 'Add Question' },
  
  'analyze.list.title': { tr: 'Soru Listesi', en: 'Question List' },
  'analyze.list.view': { tr: 'Görünüm:', en: 'View:' },
  'analyze.list.all': { tr: 'Tümü', en: 'All' },
  'analyze.list.empty': { tr: 'Henüz soru çıkarılmadı.', en: 'No questions extracted yet.' },
  'analyze.list.delete': { tr: 'Sil', en: 'Delete' },
  'analyze.list.edit': { tr: 'Düzenle', en: 'Edit' },
  
  // Difficulty Labels
  'diff.easy': { tr: '😊 Kolay', en: '😊 Easy' },
  'diff.easy_medium': { tr: 'Kolay-Orta', en: 'Easy-Med' },
  'diff.normal': { tr: '🔥 Orta', en: '🔥 Normal' },
  'diff.medium_hard': { tr: 'Orta-Zor', en: 'Med-Hard' },
  'diff.hard': { tr: '💀 Zor', en: '💀 Hard' },

  // Sample Texts
  'sample.space': { tr: 'Güneş Sistemi', en: 'Solar System' },
  'sample.tech': { tr: 'Yapay Zeka & Teknoloji', en: 'AI & Technology' },
  'sample.history': { tr: 'Tarih ve Uygarlıklar', en: 'History & Civilizations' },
  'sample.bio': { tr: 'Biyoloji - Hücre', en: 'Biology - Cell' },
  'sample.physics': { tr: 'Fizik - Kuvvet ve Hareket', en: 'Physics - Force & Motion' },
  'sample.geo': { tr: 'Coğrafya - Türkiye', en: 'Geography - Turkey' },
  
  // Market UI
  'market.store.title': { tr: '🛒 Kostüm Mağazası', en: '🛒 Costume Store' },
  'market.store.desc': { tr: 'Soru çözerek kazandığın jetonlarla oyunlarını kişiselleştir.', en: 'Customize your games with coins earned by solving questions.' },
  'market.equipped': { tr: 'Kuşandın', en: 'Equipped' },
  'market.equip': { tr: 'Kullan', en: 'Equip' },
  'market.buy': { tr: 'Jeton\'a Al', en: 'Coins to Buy' },
  'market.admin.title': { tr: 'Gizli Kod', en: 'Secret Code' },
  'market.admin.desc': { tr: 'Tüm kostümleri açmak için yönetici kodunu girin.', en: 'Enter admin code to unlock all costumes.' },
  'market.admin.placeholder': { tr: 'Şifre...', en: 'Password...' },
  'market.admin.submit': { tr: 'Onayla', en: 'Submit' },
  'market.admin.unlock': { tr: '🔓 Tüm Kostümleri Aç', en: '🔓 Unlock All Costumes' },
  'market.admin.reset': { tr: '🔒 Sıfırla', en: '🔒 Reset' },
  'market.admin.bet': { tr: '🎰 Bahis Modunu Aç', en: '🎰 Unlock Bet Mode' },
  'market.admin.success_bet': { tr: 'Özel Bahis Modu başarıyla açıldı!', en: 'Special Bet Mode successfully unlocked!' },
  'market.admin.error': { tr: 'Hatalı kod!', en: 'Invalid code!' },

  // Skins
  'skin.DINO_DEFAULT.name': { tr: 'Klasik Mor', en: 'Classic Purple' },
  'skin.DINO_DEFAULT.desc': { tr: 'Orijinal mor dinozor.', en: 'The original purple dinosaur.' },
  'skin.DINO_GOLD.name': { tr: 'Altın Dino', en: 'Golden Dino' },
  'skin.DINO_GOLD.desc': { tr: 'Zenginlerin tercihi parlayan dino.', en: 'Shining dino, choice of the rich.' },
  'skin.DINO_NINJA.name': { tr: 'Ninja Dino', en: 'Ninja Dino' },
  'skin.DINO_NINJA.desc': { tr: 'Kırmızı bandanalı karanlık ninja.', en: 'Dark ninja with a red bandana.' },
  'skin.SPACE_DEFAULT.name': { tr: 'Klasik Gemi', en: 'Classic Ship' },
  'skin.SPACE_DEFAULT.desc': { tr: 'Orijinal uzay gemisi.', en: 'The original spaceship.' },
  'skin.SPACE_UFO.name': { tr: 'UFO', en: 'UFO' },
  'skin.SPACE_UFO.desc': { tr: 'Plazma atan yeşil uçan daire.', en: 'Plasma-shooting green flying saucer.' },
  'skin.SPACE_XJET.name': { tr: 'X-Jet', en: 'X-Jet' },
  'skin.SPACE_XJET.desc': { tr: 'Keskin hatlı galaktik avcı jeti.', en: 'Sharp-edged galactic fighter jet.' },
  'skin.FLAPPY_DEFAULT.name': { tr: 'Sarı Kuş', en: 'Yellow Bird' },
  'skin.FLAPPY_DEFAULT.desc': { tr: 'Orijinal kanatlı kuş.', en: 'The original winged bird.' },
  'skin.FLAPPY_BAT.name': { tr: 'Gece Yarasası', en: 'Night Bat' },
  'skin.FLAPPY_BAT.desc': { tr: 'Karanlık ve tehditkar.', en: 'Dark and menacing.' },
  'skin.FLAPPY_COPTER.name': { tr: 'Helikopter', en: 'Helicopter' },
  'skin.FLAPPY_COPTER.desc': { tr: 'Pervanesi dönen tatlı araç.', en: 'Sweet vehicle with a spinning rotor.' },
  'skin.SNAKE_DEFAULT.name': { tr: 'Yeşil Yılan', en: 'Green Snake' },
  'skin.SNAKE_DEFAULT.desc': { tr: 'Klasik doymak bilmeyen yılan.', en: 'Classic insatiable snake.' },
  'skin.SNAKE_FIRE.name': { tr: 'Ateş Yılanı', en: 'Fire Snake' },
  'skin.SNAKE_FIRE.desc': { tr: 'Lavdan yapılmış parlayan pullar.', en: 'Glowing scales made of lava.' },
  'skin.SNAKE_BONE.name': { tr: 'İskelet Yılan', en: 'Skeleton Snake' },
  'skin.SNAKE_BONE.desc': { tr: 'Ölümcül kemik yılan.', en: 'Deadly bone snake.' },
  'skin.BREAKOUT_DEFAULT.name': { tr: 'Ahşap Raket', en: 'Wooden Paddle' },
  'skin.BREAKOUT_DEFAULT.desc': { tr: 'Klasik düz raket.', en: 'Classic flat paddle.' },
  'skin.BREAKOUT_NEON.name': { tr: 'Neon Lazer', en: 'Neon Laser' },
  'skin.BREAKOUT_NEON.desc': { tr: 'Cyberpunk tarzı ışın kılıcı.', en: 'Cyberpunk style lightsaber.' },
  'skin.BREAKOUT_SHIELD.name': { tr: 'Kalkan', en: 'Shield' },
  'skin.BREAKOUT_SHIELD.desc': { tr: 'Metalik defansif kalkan.', en: 'Metallic defensive shield.' },
  'skin.PONG_DEFAULT.name': { tr: 'Klasik Masa', en: 'Classic Table' },
  'skin.PONG_DEFAULT.desc': { tr: 'Klasik siyah-beyaz.', en: 'Classic black-and-white.' },
  'skin.PONG_ICE.name': { tr: 'Buz Hokeyi', en: 'Ice Hockey' },
  'skin.PONG_ICE.desc': { tr: 'Buzlu zemin ve kar taneleri.', en: 'Icy ground and snowflakes.' },
  'skin.PONG_NEON.name': { tr: 'Cyber Tenis', en: 'Cyber Tennis' },
  'skin.PONG_NEON.desc': { tr: 'Yüksek neon glow parlama.', en: 'High neon glow shine.' },
  'skin.TETRIS_DEFAULT.name': { tr: 'Klasik Bloklar', en: 'Classic Blocks' },
  'skin.TETRIS_DEFAULT.desc': { tr: 'Orijinal renkli bloklar.', en: 'Original colorful blocks.' },
  'skin.TETRIS_RETRO.name': { tr: 'Retro Gameboy', en: 'Retro Gameboy' },
  'skin.TETRIS_RETRO.desc': { tr: '90ların gri tonlamalı blokları.', en: '90s grayscale blocks.' },
  'skin.TETRIS_CRYSTAL.name': { tr: 'Mücevher', en: 'Jewel' },
  'skin.TETRIS_CRYSTAL.desc': { tr: 'Işıl ışıl kristal elmas bloklar.', en: 'Sparkling crystal diamond blocks.' },
  'skin.BOMB_DEFAULT.name': { tr: 'C4 Patlayıcı', en: 'C4 Explosive' },
  'skin.BOMB_DEFAULT.desc': { tr: 'Standart bomba kasası.', en: 'Standard bomb case.' },
  'skin.BOMB_TNT.name': { tr: 'Dinamit Lokumu', en: 'Dynamite Stick' },
  'skin.BOMB_TNT.desc': { tr: 'Kırmızı TNT çubukları.', en: 'Red TNT sticks.' },
  'skin.BOMB_NUKE.name': { tr: 'Nükleer Çanta', en: 'Nuke Briefcase' },
  'skin.BOMB_NUKE.desc': { tr: 'Radyoaktif ajan çantası.', en: 'Radioactive agent briefcase.' },

  // FileAnalyzer - Additional
  'analyze.list.subtitle': { tr: 'Oyunda öldüğünde bu sorulardan biri seni kurtarabilir.', en: 'One of these questions can save you when you die in the game.' },
  'analyze.filter.multiple': { tr: 'ÇOKTAN SEÇMELİ', en: 'MULTIPLE CHOICE' },
  'analyze.filter.tf': { tr: 'DOĞRU/YANLIŞ', en: 'TRUE/FALSE' },
  'analyze.filter.match': { tr: 'EŞLEŞTİRME', en: 'MATCHING' },

  // App
  'app.alert.balance': { tr: 'Yetersiz bakiye! Lütfen daha düşük bir bahis seçin.', en: 'Insufficient balance! Please choose a lower bet.' }
};

let currentLang: Language = 'tr';
const listeners = new Set<() => void>();

export const getLanguage = () => currentLang;

export const setLanguage = (lang: Language) => {
  currentLang = lang;
  listeners.forEach(listener => listener());
};

export const t = (key: string): string => {
  if (translations[key]) {
    return translations[key][currentLang];
  }
  return key; // Fallback to key if not found
};

export const useTranslation = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(tick => tick + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { t, language: currentLang, setLanguage };
};
