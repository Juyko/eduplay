# 🎮 EduPlay Arcade (File-Based Death Game)

EduPlay Arcade, eğitim notlarınızı veya dökümanlarınızı retro arcade oyunlarıyla birleştiren eğlenceli ve etkileşimli bir öğrenme platformudur. Dosyalarınızı yükleyebilir, otomatik olarak soru türetebilir ve oyun oynarken elendiğinizde bu soruları doğru cevaplayarak oyuna geri dönebilirsiniz (canlanma mekaniği).

---

## ✨ Özellikler

- **📂 Geniş Dosya Desteği**: `.pdf`, `.docx`, `.txt`, `.md`, `.csv` ve `.json` formatındaki dökümanları doğrudan tarayıcıda analiz eder.
- **⚙️ Soru Türetme Motoru**:
  - **Çevrimdışı (Offline)**: İnternet veya API bağlantısı olmadan metindeki kavramları, yılları ve isimleri tespit edip otomatik olarak soru hazırlar.
  - **Yapay Zeka (AI)**: Groq (Llama 3.3) veya OpenRouter (DeepSeek V3) API anahtarı ekleyerek çok daha gelişmiş sorular türetebilirsiniz.
- **👾 7 Farklı Retro Arcade Oyunu**:
  - 🚀 **Uzay Macerası** (Space Adventure)
  - 🦖 **Dinozor Koşusu** (Dino Run)
  - 🐦 **Kanatlı Kuş** (Flappy Bird)
  - 🐍 **Yılan Oyunu** (Snake)
  - 🧱 **Tuğla Kırma** (Breakout)
  - 🏓 **Pong**
  - 🧩 **Tetris**
- **💀 Canlanma (Death/Revive) Mekaniği**: Oyunlarda elendiğinizde dökümanınızdan çıkan rastgele soruları doğru cevaplayarak oyuna devam edebilirsiniz.
- **✏️ Soru Yönetimi**: Soruları el ile düzenleyebilir, yenilerini ekleyebilir veya istemediklerinizi silebilirsiniz.

---

## 🛠️ Kullanılan Teknolojiler

- **Arayüz / Mantık**: React, TypeScript, Vite
- **Tasarım / Stil**: Tailwind CSS, Lucide React (İkon seti)
- **Ayrıştırıcılar**: PDF.js (PDF okuma ve sayfa resmi oluşturma), Mammoth (DOCX okuma)

---

## 🚀 Kurulum ve Çalıştırma

Projenin yerel bilgisayarınızda çalıştırılması için aşağıdaki adımları uygulayabilirsiniz:

### 1. Bağımlılıkları Yükleyin
Proje dizininde terminalinizi açın ve paketleri yükleyin:
```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlatın
Uygulamayı yerel tarayıcınızda çalıştırmak için:
```bash
npm run dev
```

Tarayıcınızda otomatik olarak açılmazsa şu adrese gidin:
👉 [http://localhost:5173/](http://localhost:5173/)

---

## 📂 Proje Yapısı

```text
├── src/
│   ├── components/            # Görsel bileşenler ve oyunlar
│   │   ├── FileAnalyzer.tsx   # Dosya okuma ve soru arayüzü
│   │   ├── ArcadeGame.tsx     # Uzay Macerası oyunu
│   │   ├── DinoGame.tsx       # Dinozor Koşusu
│   │   ├── FlappyBirdGame.tsx # Kanatlı Kuş
│   │   ├── SnakeGame.tsx      # Yılan
│   │   ├── BreakoutGame.tsx   # Tuğla Kırma
│   │   ├── PongGame.tsx       # Pong
│   │   └── TetrisGame.tsx     # Tetris
│   ├── utils/                 # Soru çıkarma ve yardımcı araçlar
│   │   ├── questionExtractor.ts  # Çevrimdışı soru çıkartıcı & örnek dersler
│   │   └── aiQuestionGenerator.ts # Groq/OpenRouter AI entegrasyonu
│   ├── App.tsx                # Ana yönlendirici ve skor paneli
│   └── main.tsx               # Uygulama başlangıç noktası
```

---

## 💡 İpuçları

- AI ile daha detaylı soru türetmek için [Groq Console](https://console.groq.com/keys) üzerinden ücretsiz API anahtarı alıp `src/components/FileAnalyzer.tsx` dosyasındaki `HARDCODED_API_KEY` sabitine yapıştırabilirsiniz.
- Yüksek skorlarınız yerel tarayıcı hafızasında (`localStorage`) güvenli bir şekilde saklanır.
