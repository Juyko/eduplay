import { Difficulty, Question, QuestionMaterial } from './questionExtractor';

export type AIProvider = 'groq' | 'gemini';

interface AIOptions {
  provider: AIProvider;
  apiKey: string;
  difficulty: Difficulty;
  questionCount?: number;
  imageBase64?: string;
}

const SYSTEM_PROMPT = `Sen profesyonel bir eğitim içerik üretim sistemisin.

Görevin:
1. Kullanıcının yüklediği belgeyi analiz et.
2. Belgedeki konu başlıklarını, kavramları, formülleri ve öğrenme kazanımlarını çıkar.
3. SADECE belgede bulunan bilgilerden yararlanarak sorular oluştur.
4. Bilgi ekleme, konu uydurma veya belge dışı içerik üretme.
5. Soruları MEB ve lise sınav formatına uygun hazırla.
6. Belgedeki cümleleri AYNEN kopyalama. Belge cümlesini soru veya seçenek olarak kullanma.
7. Cevap her zaman Türkçe.

SORU ÜRETİM KURALLARI:
- Her soru için zorluk seviyesi: kolay | orta | zor
- Soru tipleri: multiple_choice | true_false | graph | table
- Sorular öğrencinin ezberden çok yorum yapmasını ölsün.
- Grafik veya tablo içeren sorularda MÜTLAKA geçerli veri sağla.
- options alanı HER ZAMAN tam 4 farklı, anlamsız olmayan seçenek içermeli.
- Seçenek olarak 'Diğer', 'Hepsi', 'Hiçbiri', 'Belirtilmemiş', 'Seçenek X' KULLANMA.

GRAFİK SORULARI önemli not: 
Egerde questionType: "graph" kullanacaksan, "graph" alanı ZORUNLU olarak doldurulmalıdır.
Grafik verisi olmadan graph tipinde soru YARATMA. Bunun yerine multiple_choice kullan.
"graph": { "graphType": "line|bar|scatter|pie", "title": "...", "xLabel": "...", "yLabel": "...", "data": [{"x":"2020","y":10},{"x":"2021","y":15}] }

TABLO SORULARI için soru nesnesine "table" ekle:
"table": { "columns": ["...","..."], "rows": [["...","..."],["...","..."]] }

MATEMATİK/FEN: Formülleri "formula" alanına DÜZ METİN GİBİ DEĞİL, GERÇEK LaTeX koduyla yazın.
ÇOK ÖNEMLİ: Ters eğik çizgi (\\) kullanırken JSON içinde mutlaka çift ters eğik çizgi (\\\\) kullanın. Küme parantezlerini {} ASLA SİLMEYİN.
Formüllerde "delta", "alfa" gibi kelimeler yazmak yerine kesinlikle LaTeX sembollerini (\\\\Delta, \\\\alpha, vb.) kullanın.
DOĞRU ÖRNEK: "formula": "a = \\\\frac{\\\\Delta v}{\\\\Delta t}"
YANLIŞ ÖRNEK: "formula": "a = fracDeltavDeltat" veya "a = delta v / delta t"
(Eğer parantezleri veya ters eğik çizgileri silerseniz formül ekranda bozuk görünür!)

ÇIKTI: SADECE GEÇERLİ JSON döndür. Markdown, açıklama, kod bloğu işareti yazma. Doğrudan JSON ile başla.`;

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'qwen/qwen3.8-27b',
    label: 'Groq (Qwen 27B)'
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash'
  }
};

function mapDifficulty(d: string): Difficulty {
  const diff = String(d).toLowerCase();
  if (diff.includes('kolay-orta') || diff.includes('easy_medium') || diff.includes('easy-medium')) return 'EASY_MEDIUM';
  if (diff.includes('orta-zor') || diff.includes('medium_hard') || diff.includes('medium-hard')) return 'MEDIUM_HARD';
  if (diff.includes('kolay') || diff.includes('easy')) return 'EASY';
  if (diff.includes('zor') || diff.includes('hard')) return 'HARD';
  return 'NORMAL';
}

function cleanJson(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // Strip reasoning blocks
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

// Try to extract first JSON array/object from messy text
function extractJsonBlock(text: string): string {
  const cleaned = cleanJson(text);
  // Try direct parse
  try { JSON.parse(cleaned); return cleaned; } catch {}

  // Find first { or [ and last matching
  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  let start = -1;
  let endChar = '';
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    endChar = ']';
  } else if (firstObj !== -1) {
    start = firstObj;
    endChar = '}';
  }
  if (start === -1) return cleaned;
  const end = cleaned.lastIndexOf(endChar);
  if (end > start) return cleaned.slice(start, end + 1);
  return cleaned;
}

function buildMaterials(item: any): QuestionMaterial[] {
  const materials: QuestionMaterial[] = [];

  // Grafik verisi — AI farklı key adları kullanabilir
  const graphRaw = item.graph || item.chart || item.grafik || null;
  if (graphRaw && typeof graphRaw === 'object') {
    // Önce { labels, values } formatını kontrol et — values array of numbers ise rawData'ya ATMA
    let rawData: any[] | null = null;

    if (Array.isArray(graphRaw.labels)) {
      const yArr = graphRaw.values || graphRaw.counts || graphRaw.numbers;
      if (Array.isArray(yArr)) {
        rawData = graphRaw.labels.map((label: any, i: number) => ({
          x: String(label),
          y: Number(yArr[i]) || 0
        }));
      }
    }

    // data / dataset / points — yalnızca nesne dizisi olarak kullan
    if (!rawData) {
      const candidate = graphRaw.data || graphRaw.dataset || graphRaw.points;
      if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === 'object') {
        rawData = candidate;
      }
    }

    // values dizisi — sadece nesne dizisiyse kullan (sayı dizisi değil)
    if (!rawData && Array.isArray(graphRaw.values)) {
      if (graphRaw.values.length > 0 && typeof graphRaw.values[0] === 'object') {
        rawData = graphRaw.values;
      }
    }

    if (Array.isArray(rawData) && rawData.length > 0) {
      const normalizedData = rawData
        .map((d: any) => {
          if (typeof d !== 'object' || d === null) return null;
          const xVal = d.x ?? d.label ?? d.name ?? d.category ?? d.key ?? Object.values(d)[0];
          const yRaw = d.y ?? d.value ?? d.count ?? d.number ?? d.amount ?? Object.values(d)[1];
          const yVal = Number(yRaw);
          if (xVal === undefined || isNaN(yVal)) return null;
          return { x: String(xVal), y: yVal };
        })
        .filter((d): d is { x: string; y: number } => d !== null);

      if (normalizedData.length >= 2) {
        materials.push({
          type: 'graph',
          title: graphRaw.title || graphRaw.baslik || graphRaw.caption || 'Grafik',
          graphType: graphRaw.graphType || graphRaw.type || graphRaw.chartType || graphRaw.chart_type || 'bar',
          xLabel: graphRaw.xLabel || graphRaw.x_label || graphRaw.xAxis || graphRaw.xlabel || '',
          yLabel: graphRaw.yLabel || graphRaw.y_label || graphRaw.yAxis || graphRaw.ylabel || '',
          data: normalizedData
        });
      }
    }
  }

  // Tablo verisi
  const tableRaw = item.table || item.tablo || null;
  if (tableRaw && typeof tableRaw === 'object') {
    const columns = tableRaw.columns || tableRaw.headers || tableRaw.basliklar || tableRaw.cols;
    const rows = tableRaw.rows || tableRaw.data || tableRaw.satirlar || tableRaw.body;
    if (Array.isArray(columns) && Array.isArray(rows) && columns.length > 0 && rows.length > 0) {
      materials.push({
        type: 'table',
        title: tableRaw.title || tableRaw.baslik || 'Tablo',
        columns: columns.map((c: any) => String(c)),
        rows: rows.map((row: any) =>
          Array.isArray(row) ? row.map((cell) => String(cell)) : [String(row)]
        )
      });
    }
  }

  // Formül
  if (item.formula || item.formul || item.equation) {
    materials.push({
      type: 'formula',
      title: 'Formül',
      formula: String(item.formula || item.formul || item.equation)
    });
  }

  return materials;
}

function normalize(item: any, index: number, fallbackDiff: Difficulty): Question | null {
  const question = String(item?.question || '').trim();
  if (!question) return null;

  const rawType = (item?.questionType || item?.type || 'multiple_choice').toLowerCase();
  let type: Question['type'] = 'MULTIPLE_CHOICE';
  if (rawType.includes('true') || rawType.includes('doğru') || rawType.includes('dogru')) type = 'TRUE_FALSE';

  let answer = String(item?.correctAnswer || item?.answer || '').trim();
  let options: string[] = Array.isArray(item?.options)
    ? item.options.map((o: any) => String(o).trim()).filter(Boolean)
    : [];

  if (type === 'TRUE_FALSE') {
    options = ['Doğru', 'Yanlış'];
    if (!['Doğru', 'Yanlış'].includes(answer)) {
      answer = /yanl|false/i.test(answer) ? 'Yanlış' : 'Doğru';
    }
  }

  // Seçenek sayısı yetersizse soruyu atla — placeholder şık doldurmuyoruz
  if (type !== 'TRUE_FALSE') {
    if (!answer) return null;
    // Anlamlı olmayan seçenekleri filtrele
    const badOptions = /^(diğer|hepsi|hiçbiri|tümü|tümünü|tamamı|yukarıdakilerin|aşağıdakilerin|belirtilmemiş|seçenek \d|none|other|all of|none of|[A-Ea-e]\)|[A-Ea-e]\.)|^(A|B|C|D|E|a|b|c|d|e)$/i;
    options = options.filter(o => o.length >= 1 && !badOptions.test(o) && !o.toLowerCase().includes("yukarıdakilerin") && !o.toLowerCase().includes("aşağıdakilerin") && !o.toLowerCase().includes("tümü"));
    if (!options.includes(answer)) options.unshift(answer);
    options = Array.from(new Set(options)).slice(0, 4);
    // Minimum: cevap + 1 gerçek şık = 2 seçenek
    if (options.length < 2) return null;
  }

  if (!answer) answer = options[0];
  if (!options.includes(answer)) options.unshift(answer);
  options = Array.from(new Set(options)).slice(0, 4);

  const materials = buildMaterials(item);

  // Grafik/tablo tipinde soru ama materyal yoksa atla — soru metni referans içerir ama görsel olmaz
  const isVisualType = rawType === 'graph' || rawType === 'table';
  if (isVisualType && materials.length === 0) return null;

  // Soru metninde grafik/tablo referansı var ama hiç materyal oluşturulamadıysa atla
  const VISUAL_REF = /aşağıdaki\s+(grafik|tablo|şekil|şema)|yukarıdaki\s+(grafik|tablo|şekil|şema)|grafiğ[ei]\s+(bakınız|göre|inceleyiniz)|tabloy[au]\s+(bakınız|göre)/i;
  if (VISUAL_REF.test(question) && materials.length === 0) return null;

  return {
    id: `ai-${Date.now()}-${index}`,
    type,
    question,
    options: options.sort(() => Math.random() - 0.5),
    answer,
    difficulty: mapDifficulty(item?.difficulty) || fallbackDiff,
    hint: item?.explanation ? String(item.explanation).slice(0, 120) : 'Belgedeki konuyu hatırla.',
    sourceText: item?.topic ? `Konu: ${item.topic}` : 'AI ile üretildi',
    materials
  };
}

export async function generateQuestionsWithAI(documentText: string, options: AIOptions): Promise<Question[]> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('API anahtarı girilmedi.');

  const trimmed = documentText.trim();
  if (!trimmed) throw new Error('Önce belge/metin girin.');

  const limited = trimmed.slice(0, 10000);
  const count = options.questionCount || 10;
  const provider = PROVIDERS[options.provider];

  const userPrompt = `İstenen soru sayısı: ${count}
Genel zorluk eğilimi: ${options.difficulty === 'EASY' ? 'kolay' : options.difficulty === 'EASY_MEDIUM' ? 'kolay-orta' : options.difficulty === 'HARD' ? 'zor' : options.difficulty === 'MEDIUM_HARD' ? 'orta-zor' : 'orta'}

LÜTFEN SADECE VE SADECE AŞAĞIDAKİ JSON FORMATINDA YANIT VER. 
HİÇBİR AÇIKLAMA VEYA MARKDOWN KOD BLOĞU ( \`\`\`json ) KULLANMA.
DOĞRUDAN { İLE BAŞLA VE } İLE BİTİR.
{
  "documentTopic": "Belgenin ana konusu",
  "questions": [
    {
      "id": 1,
      "difficulty": "kolay|kolay-orta|orta|orta-zor|zor",
      "questionType": "multiple_choice|true_false|graph|table",
      "question": "Soru metni (özgün, belge cümlesi DEĞİL)",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "Doğru şık metni",
      "explanation": "Kısa açıklama",
      "topic": "Alt konu",
      "graph": { "graphType": "bar", "title": "...", "xLabel": "...", "yLabel": "...", "data": [{"x":"...","y":0}] },
      "table": { "columns": ["...","..."], "rows": [["...","..."]] },
      "formula": "F = m \\\\cdot a"
    }
  ]
}

Belge:
${limited}`;

  let response: Response;
  
  if (options.provider === 'gemini') {
    const url = `${provider.url}?key=${apiKey}`;
    const parts: any[] = [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }];
    
    if (options.imageBase64) {
      const match = options.imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }
    
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    });
  } else {
    // Groq logic
    const finalModel = provider.model;
    const finalMessages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ];

    response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        messages: finalMessages,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) throw new Error('API anahtarı geçersiz.');
    if (response.status === 429) throw new Error('Kota doldu, biraz sonra tekrar deneyin.');
    if (response.status === 402) throw new Error('Bu modelin kotası bitti, başka modele geçin.');
    if (response.status === 400 && errText.includes('Failed to validate JSON')) {
      throw new Error('AI metni analiz edemedi. Lütfen "TYT Fizik" gibi çok kısa metinler yerine, en az 1-2 paragraflık detaylı bir konu anlatımı yapıştırın.');
    }
    throw new Error(`AI hatası (${response.status}): ${errText.slice(0, 150)}`);
  }

  let resultText = '';
  
  if (options.provider === 'gemini') {
    const data = await response.json();
    resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    const data = await response.json();
    resultText = data.choices?.[0]?.message?.content || '';
  }

  if (!resultText) throw new Error('AI boş yanıt verdi.');

  let parsed: any;
  try {
    parsed = JSON.parse(extractJsonBlock(resultText));
  } catch (e: any) {
    console.error('AI raw output:', resultText);
    throw new Error(`AI geçerli bir JSON oluşturamadı. Hata Detayı: ${e.message}\nLütfen "TYT Fizik" gibi çok kısa metinler yerine, en az 1-2 paragraflık uzun bir konu anlatımı yapıştırın.`);
  }

  const list = Array.isArray(parsed) ? parsed : parsed?.questions || parsed?.data;
  if (!Array.isArray(list)) {
    throw new Error('AI yanıtında soru listesi bulunamadı.');
  }

  const questions = list
    .map((item, i) => normalize(item, i, options.difficulty))
    .filter(Boolean) as Question[];

  if (questions.length === 0) throw new Error('AI geçerli soru üretemedi, tekrar deneyin.');

  return questions;
}
