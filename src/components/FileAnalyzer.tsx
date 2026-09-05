import { useState } from 'react';
import { sampleTexts, extractQuestions, Question, Difficulty } from '../utils/questionExtractor';
import { generateQuestionsWithAI, AIProvider } from '../utils/aiQuestionGenerator';

import {
  FileText, Plus, Trash2, Edit3, Save, Sparkles, Upload,
  CheckCircle, AlertCircle, FileJson, Filter, Shuffle, Loader2, Wand2
} from 'lucide-react';
import { useTranslation } from '../utils/i18n';

interface AnalyzerProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  onLaunchGame: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  isPremium?: boolean;
  onRequirePremium?: () => void;
  isDarkMode?: boolean;
}

export default function FileAnalyzer({
  questions, setQuestions, onLaunchGame, difficulty, setDifficulty, isPremium, onRequirePremium, isDarkMode
}: AnalyzerProps) {
  const { t, language } = useTranslation();
  const [inputText, setInputText] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newDistractor1, setNewDistractor1] = useState('');
  const [newDistractor2, setNewDistractor2] = useState('');
  const [newDistractor3, setNewDistractor3] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const handleLoadSample = (index: number) => {
    setSelectedSample(index);
    const textData = sampleTexts[index].text;
    const text = (textData as any)[language] || (textData as any)['tr'];
    setInputText(text);
    const parsed = extractQuestions(text, difficulty);
    setQuestions(parsed);
  };

  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);

  const [aiProvider, setAiProvider] = useState<AIProvider>('groq');

  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || "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");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_key') || "AQ.Ab8RN6KqzhjVnUwqkEuoYlO9i3ZwVsnskW_Lb_Y1xlRTEZxA2Q");
  const [showApiSettings, setShowApiSettings] = useState(false);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(10);



  const handleAIGenerate = async () => {
    if (!isPremium) {
      const generatedCount = parseInt(localStorage.getItem('eduplay_ai_count') || '0');
      if (generatedCount >= 3) {
        setAiError(t('analyze.error.aiLimit'));
        if (onRequirePremium) onRequirePremium();
        return;
      }
    }

    if (!inputText.trim() && !uploadedImageBase64) {
      setAiError(t('analyze.error.emptyText'));
      return;
    }
    setAiGenerating(true);
    setAiError(null);
    setAiSuccess(null);

    const finalProvider = aiProvider;
    const finalKey = finalProvider === 'gemini' ? geminiKey : groqKey;

    try {
      const aiQuestions = await generateQuestionsWithAI(inputText, {
        provider: finalProvider,
        apiKey: finalKey,
        difficulty,
        questionCount: aiQuestionCount,
        imageBase64: uploadedImageBase64 || undefined,
        language
      });
      setQuestions(aiQuestions);
      setAiSuccess(`${aiQuestions.length} ${language === 'tr' ? 'özgün soru üretildi!' : 'unique questions generated!'}`);
      
      if (!isPremium) {
        const currentCount = parseInt(localStorage.getItem('eduplay_ai_count') || '0');
        localStorage.setItem('eduplay_ai_count', (currentCount + 1).toString());
      }
    } catch (err: any) {
      setAiError(err?.message || (language === 'tr' ? 'AI ile soru üretilemedi.' : 'Failed to generate questions with AI.'));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadFileName(file.name);
    setUploadError(null);
    setUploadedImageBase64(null);

    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const pdfPages: { text: string; imageUrl?: string; page: number }[] = [];

      // Doğrudan dosya tipine göre oku
      if (ext === 'pdf') {
        try {
          // Vite bundling hatalarını aşmak için CDN üzerinden script yükle
          const pdfjsLib = await new Promise<any>((resolve, reject) => {
            if ((window as any).pdfjsLib) {
              resolve((window as any).pdfjsLib);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.onload = () => {
              const lib = (window as any).pdfjsLib;
              lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
              resolve(lib);
            };
            script.onerror = () => reject(new Error('PDF.js yüklenemedi'));
            document.head.appendChild(script);
          });

          const buffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: buffer });
          const pdf = await loadingTask.promise;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items
              .filter((item: any) => item.str)
              .map((item: any) => item.str);
            const pageText = strings.join(' ');
            text += pageText + '\n';

            // Render page thumbnail so diagrams/graphs remain available to the player.
            // This is important for PDFs that contain charts used by questions.
            let imageUrl = '';
            try {
              const viewport = page.getViewport({ scale: 0.65 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;
                imageUrl = canvas.toDataURL('image/jpeg', 0.72);
              }
            } catch (renderErr) {
              console.warn('PDF sayfa görseli üretilemedi:', renderErr);
            }

            pdfPages.push({ text: pageText, imageUrl, page: i });
          }
        } catch (pdfErr: any) {
          console.error('PDF Okuma hatası:', pdfErr);
          setUploadError('PDF metinleri ayrıştırılamadı. Dosyanın taranmış resim (OCR) olmadığından emin olun.');
          setUploading(false);
          return;
        }
      } else if (ext === 'docx') {
        try {
          const mammoth = await import('mammoth');
          const buffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          text = result.value || '';
        } catch (docxErr) {
          console.error('DOCX hata:', docxErr);
          setUploadError('DOCX okunamadı. Farklı bir dosya deneyin.');
          setUploading(false);
          return;
        }
      } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          setUploadedImageBase64(base64);
          text = "[Görsel başarıyla yüklendi. Yapay Zeka (Gemini Vision) ile analiz etmek için aşağıdaki butona tıklayın.]";
        } catch (ocrErr) {
          console.error('Fotoğraf okuma hatası:', ocrErr);
          setUploadError('Görsel yüklenemedi.');
          setUploading(false);
          return;
        }
      } else {
        // txt, md, csv, json gibi metin dosyaları
        text = await file.text();
      }

      if (!text || text.trim().length === 0) {
        setUploadError('Dosya boş veya okunamadı.');
        setUploading(false);
        return;
      }

      setInputText(text);
      let parsed = extractQuestions(text, difficulty);

      if (ext === 'pdf' && pdfPages.length > 0) {
        parsed = parsed.map((q) => {
          const match = pdfPages.find((p) =>
            q.sourceText && p.text.includes(q.sourceText.slice(0, Math.min(40, q.sourceText.length)))
          ) || pdfPages[0];

          if (!match?.imageUrl) return q;

          return {
            ...q,
            materials: [
              ...(q.materials || []),
              {
                type: 'image' as const,
                title: `PDF sayfa ${match.page}`,
                url: match.imageUrl,
                alt: `PDF sayfa ${match.page}`
              }
            ]
          };
        });
      }
      setQuestions(parsed);

      if (parsed.length === 0) {
        setUploadError('Dosyadan soru çıkarılamadı. Metninizi gözden geçirin.');
      }

    } catch (err: any) {
      console.error('Dosya okuma hatası:', err);
      setUploadError('Beklenmeyen hata: ' + (err?.message || 'Dosya okunamadı'));
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = () => {
    if (!inputText.trim()) return;
    const parsed = extractQuestions(inputText, difficulty);
    setQuestions(parsed);
  };

  const handleShuffleQuestions = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  };

  const handleAddCustomQuestion = () => {
    if (!newQuestionText.trim() || !newAnswer.trim()) return;
    const distractors = [newDistractor1, newDistractor2, newDistractor3].filter(Boolean);
    while (distractors.length < 3) distractors.push(`Seçenek ${distractors.length + 1}`);
    const options = [newAnswer, ...distractors].sort(() => Math.random() - 0.5);

    const customQ: Question = {
      id: `custom-${Date.now()}`,
      type: 'MULTIPLE_CHOICE',
      question: newQuestionText,
      options,
      answer: newAnswer,
      difficulty
    };

    setQuestions([...questions, customQ]);
    setNewQuestionText(''); setNewAnswer('');
    setNewDistractor1(''); setNewDistractor2(''); setNewDistractor3('');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleStartEditing = (q: Question) => {
    setEditingId(q.id);
    setEditQuestionText(q.question);
    setEditAnswer(q.answer);
  };

  const handleSaveEdit = (id: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id === id) {
          let options = [...q.options];
          if (q.answer !== editAnswer) {
            options = options.map(o => o === q.answer ? editAnswer : o);
            if (!options.includes(editAnswer)) options.push(editAnswer);
          }
          return { ...q, question: editQuestionText, answer: editAnswer, options };
        }
        return q;
      })
    );
    setEditingId(null);
  };

  const filteredQuestions = filterType === 'ALL'
    ? questions
    : questions.filter(q => q.type === filterType);

  // Type counts
  const typeCounts: Record<string, number> = {
    MULTIPLE_CHOICE: questions.filter(q => q.type === 'MULTIPLE_CHOICE').length,
    TRUE_FALSE: questions.filter(q => q.type === 'TRUE_FALSE').length,
    MATCHING: questions.filter(q => q.type === 'MATCHING').length
  };

  const typeMeta: Record<string, { color: string; icon: string; label: string }> = {
    MULTIPLE_CHOICE: { color: 'amber', icon: '📝', label: t('analyze.filter.multiple') },
    TRUE_FALSE: { color: 'sky', icon: '⚖️', label: t('analyze.filter.tf') },
    MATCHING: { color: 'purple', icon: '✍️', label: t('analyze.filter.match') }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 max-w-6xl mx-auto items-start animate-fade-in">
      {/* LEFT PANEL */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50 shadow-xl flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> {t('analyze.source.title')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('analyze.source.desc')}
            </p>
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('analyze.diff.label')}</label>
            <div className="grid grid-cols-5 gap-1 mt-1.5">
              {(['EASY', 'EASY_MEDIUM', 'NORMAL', 'MEDIUM_HARD', 'HARD'] as Difficulty[]).map(d => {
                const colors: Record<string, string> = {
                  EASY: 'emerald',
                  EASY_MEDIUM: 'lime',
                  NORMAL: 'amber',
                  MEDIUM_HARD: 'orange',
                  HARD: 'red'
                };
                const labels: Record<string, string> = {
                  EASY: t('diff.easy'),
                  EASY_MEDIUM: t('diff.easy_medium'),
                  NORMAL: t('diff.normal'),
                  MEDIUM_HARD: t('diff.medium_hard'),
                  HARD: t('diff.hard')
                };
                const c = colors[d];
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition ${difficulty === d
                      ? `bg-${c}-500/20 border-${c}-500/60 text-${c}-300`
                      : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:bg-slate-800'
                      }`}
                  >
                    {labels[d]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sampleTexts.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadSample(idx)}
                className={`flex flex-col gap-1 p-3 text-left rounded-xl border transition ${selectedSample === idx
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
              >
                <div className="text-2xl">{sample.icon || <FileText className="w-5 h-5" />}</div>
                <h4 className="text-xs font-bold text-slate-200 leading-tight">{t(['sample.space', 'sample.tech', 'sample.history', 'sample.bio', 'sample.physics', 'sample.geo'][idx])}</h4>
              </button>
            ))}
          </div>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/60"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">{t('analyze.or.own')}</span>
            </div>
          </div>

          <label className={`flex flex-col items-center justify-center border-2 border-dashed px-4 py-4 rounded-xl cursor-pointer transition ${uploading
            ? 'border-indigo-500/50 bg-indigo-500/10 animate-pulse'
            : uploadFileName
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-800/20 hover:bg-slate-800/40'
            }`}>
            {uploading ? (
              <Loader2 className="w-5 h-5 text-indigo-400 mb-1 animate-spin" />
            ) : uploadFileName ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
            ) : (
              <Upload className="w-5 h-5 text-indigo-400 mb-1" />
            )}
            <span className="text-xs font-semibold text-slate-300">
              {uploading ? t('analyze.ai.generating.wait') : uploadFileName || t('analyze.upload.button')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('analyze.upload.desc')}</span>
            <input type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.jpg,.jpeg,.png,.webp,.bmp" onChange={handleFileUpload} className="hidden" />
          </label>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>{uploadError}</span>
            </div>
          )}

          {uploadFileName && !uploadError && !uploading && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <span>✅</span>
              <span><strong>{uploadFileName}</strong> başarıyla okundu → {questions.length} soru çıkarıldı</span>
            </div>
          )}

          <textarea
            placeholder={t('analyze.upload.title')}
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-3 text-xs bg-slate-800/40 text-slate-100 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-mono focus:outline-none transition leading-relaxed"
          />

          <button
            onClick={handleExtract}
            disabled={!inputText.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> {t('analyze.extract.fast')}
          </button>

          {/* AI GENERATOR (Ücretsiz, Google'sız) */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/60"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-purple-400 font-bold flex items-center gap-1">
                <Wand2 className="w-3 h-3" /> {t('analyze.ai.settings')}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-2.5">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {t('analyze.ai.desc')}
            </p>



            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{t('analyze.ai.model')}</span>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="groq">Groq (Llama 3.3)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400 font-medium">{t('analyze.ai.count')}</span>
                <select
                  value={aiQuestionCount}
                  onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value={5}>5 Soru</option>
                  <option value={10}>10 Soru</option>
                  <option value={15}>15 Soru</option>
                  <option value={20}>20 Soru</option>
                </select>
              </div>
              {uploadedImageBase64 && aiProvider === 'gemini' && (
                <span className="text-[10px] text-pink-400 font-medium leading-tight">
                  {t('analyze.ai.gemini.vision')}
                </span>
              )}
              {uploadedImageBase64 && aiProvider === 'groq' && (
                <span className="text-[10px] text-red-400 font-medium leading-tight">
                  {t('analyze.ai.groq.warn')}
                </span>
              )}
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={aiGenerating || (!inputText.trim() && !uploadedImageBase64)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 mt-2"
            >
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {aiGenerating ? t('analyze.ai.generating') : t('analyze.ai.generate.button')}
            </button>

            <button onClick={() => setShowApiSettings(!showApiSettings)} className="text-[10px] text-slate-400 hover:text-slate-300 underline mt-1 text-center w-full">
              {t('analyze.ai.custom.api')}
            </button>

            {showApiSettings && (
              <div className="flex flex-col gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-700/50 mt-1">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold mb-1 block">{t('analyze.ai.groq.key')}</label>
                  <input 
                    type="password" 
                    value={groqKey} 
                    onChange={(e) => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }} 
                    placeholder="gsk_..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold mb-1 block">{t('analyze.ai.gemini.key')}</label>
                  <input 
                    type="password" 
                    value={geminiKey} 
                    onChange={(e) => { setGeminiKey(e.target.value); localStorage.setItem('gemini_key', e.target.value); }} 
                    placeholder="AIza..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 leading-tight">{t('analyze.ai.api.warn')}</span>
              </div>
            )}

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-[11px] text-red-300">
                ⚠️ {aiError}
              </div>
            )}
            {aiSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-[11px] text-emerald-300">
                ✅ {aiSuccess}
              </div>
            )}
          </div>
        </div>

        {/* MANUAL ADD */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50 shadow-xl flex flex-col gap-3">
          <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> {t('analyze.manual.title')}
          </h3>

          <input
            type="text"
            placeholder={t('analyze.manual.placeholder')}
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            className="p-2 text-xs bg-slate-800/40 text-slate-100 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder={t('analyze.manual.correct')} value={newAnswer} onChange={e => setNewAnswer(e.target.value)} className="p-2 text-xs bg-slate-800/40 text-emerald-200 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg" />
            <input type="text" placeholder={t('analyze.manual.wrong1')} value={newDistractor1} onChange={e => setNewDistractor1(e.target.value)} className="p-2 text-xs bg-slate-800/40 text-red-200 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg" />
            <input type="text" placeholder={t('analyze.manual.wrong2')} value={newDistractor2} onChange={e => setNewDistractor2(e.target.value)} className="p-2 text-xs bg-slate-800/40 text-red-200 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg" />
            <input type="text" placeholder={t('analyze.manual.wrong3')} value={newDistractor3} onChange={e => setNewDistractor3(e.target.value)} className="p-2 text-xs bg-slate-800/40 text-red-200 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg" />
          </div>

          <button
            onClick={handleAddCustomQuestion}
            disabled={!newQuestionText || !newAnswer}
            className="w-full bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold p-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" /> {t('analyze.manual.add')}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="xl:col-span-3 flex flex-col gap-4">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50 shadow-xl flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3 gap-2 flex-wrap">
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> 2. {t('analyze.list.title')}
                <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{questions.length}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('analyze.list.subtitle')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShuffleQuestions}
                disabled={questions.length === 0}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-bold px-3 py-2 rounded-xl transition text-xs flex items-center gap-1.5"
                title="Karıştır"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLaunchGame}
                disabled={questions.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" /> Oyunu Başlat
              </button>
            </div>
          </div>

          {/* Stats Row */}
          {questions.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(Object.keys(typeMeta) as string[]).map(t => {
                const meta = typeMeta[t];
                const count = typeCounts[t as keyof typeof typeCounts];
                return (
                  <div key={t} className={`bg-${meta.color}-500/10 border border-${meta.color}-500/30 p-2 rounded-lg text-center`}>
                    <div className="text-lg">{meta.icon}</div>
                    <div className={`text-base font-black text-${meta.color}-300 font-mono`}>{count}</div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{meta.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <Filter className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500 font-bold uppercase tracking-wider">Filtre:</span>
              <button onClick={() => setFilterType('ALL')} className={`px-2 py-0.5 rounded-md font-bold ${filterType === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Tümü</button>
              {(Object.keys(typeMeta) as string[]).map(t =>
                (typeCounts[t as keyof typeof typeCounts] ?? 0) > 0 && (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-0.5 rounded-md font-bold ${filterType === t ? `bg-${typeMeta[t].color}-500/30 text-${typeMeta[t].color}-300` : 'text-slate-400 hover:text-white'}`}>{typeMeta[t].icon}</button>
                )
              )}
            </div>
          )}

          {filteredQuestions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 border-2 border-dashed border-slate-800/50 rounded-xl m-2 bg-slate-800/20">
              <FileText className="w-8 h-8 opacity-50" />
              <p className="text-sm">{t('analyze.list.empty')}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredQuestions.map((q, idx) => {
                  const isEditing = editingId === q.id;
                  const meta = typeMeta[q.type];

                  return (
                    <div key={q.id} className="bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800/60 hover:border-slate-700/60 p-3 rounded-xl flex items-start justify-between gap-3 transition group">
                      {isEditing ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <input type="text" value={editQuestionText} onChange={e => setEditQuestionText(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs" />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{t('analyze.list.view')}</span>
                            <input type="text" value={editAnswer} onChange={e => setEditAnswer(e.target.value)} className="p-1.5 bg-slate-900 border border-slate-700 text-emerald-200 rounded-lg text-xs flex-1" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            <span className="text-[10px] text-indigo-400 font-mono font-black uppercase tracking-wider">#{idx + 1}</span>
                            <span className={`text-[9px] bg-${meta.color}-500/10 border border-${meta.color}-500/20 px-1.5 py-0.5 rounded text-${meta.color}-300 font-bold`}>
                              {meta.icon} {meta.label}
                            </span>
                            {q.difficulty && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${q.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-300' :
                                q.difficulty === 'EASY_MEDIUM' ? 'bg-lime-500/10 text-lime-300' :
                                  q.difficulty === 'HARD' ? 'bg-red-500/10 text-red-300' :
                                    q.difficulty === 'MEDIUM_HARD' ? 'bg-orange-500/10 text-orange-300' :
                                      'bg-amber-500/10 text-amber-300'
                                }`}>
                                {q.difficulty === 'EASY' ? 'Kolay' : q.difficulty === 'EASY_MEDIUM' ? 'Kolay-Orta' : q.difficulty === 'HARD' ? 'Zor' : q.difficulty === 'MEDIUM_HARD' ? 'Orta-Zor' : 'Orta'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 break-words leading-relaxed line-clamp-2">{q.question}</h4>
                          <p className="text-[11px] text-emerald-400 font-medium mt-1 truncate">
                            <span className="text-[9px] text-slate-500 font-mono mr-1">DOĞRU:</span> {q.answer}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        {isEditing ? (
                          <button onClick={() => handleSaveEdit(q.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                            <Save className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleStartEditing(q)} className="text-indigo-400 hover:text-indigo-300 p-1 flex items-center gap-1"><Edit3 className="w-3 h-3" /> {t('analyze.list.edit')}</button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1"><Trash2 className="w-3 h-3" /> {t('analyze.list.delete')}</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
