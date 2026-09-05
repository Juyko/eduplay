export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING';
export type Difficulty = 'EASY' | 'EASY_MEDIUM' | 'NORMAL' | 'MEDIUM_HARD' | 'HARD';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  answer: string;
  sourceText?: string;
  difficulty?: Difficulty;
  hint?: string;
  materials?: QuestionMaterial[];
}

export interface QuestionMaterial {
  type: 'image' | 'table' | 'text' | 'graph' | 'formula';
  title?: string;
  url?: string;
  content?: string;
  alt?: string;
  // Graph fields
  graphType?: 'line' | 'bar' | 'scatter' | 'pie';
  xLabel?: string;
  yLabel?: string;
  data?: { x: string | number; y: number }[];
  // Table fields
  columns?: string[];
  rows?: string[][];
  // Formula (LaTeX-ish)
  formula?: string;
}

const TURKISH_STOPWORDS = new Set([
  'bir', 'bu', 've', 'veya', 'ile', 'için', 'ise', 'da', 'de', 'ki', 'mi',
  'mu', 'mı', 'mü', 'ya', 'ne', 'ama', 'fakat', 'ancak', 'çünkü', 'gibi',
  'kadar', 'sonra', 'önce', 'göre', 'her', 'hep', 'hiç', 'çok', 'az',
  'olan', 'oldu', 'olarak', 'tarafından', 'üzere', 'şey', 'kim', 'kime',
  'şu', 'o', 'onun', 'onlar', 'bunu', 'şunu', 'onu', 'biz', 'siz', 'sen',
  'ben', 'benim', 'senin', 'bizim', 'sizin', 'onların', 'var', 'yok',
  'değil', 'evet', 'hayır', 'tüm', 'bütün', 'bazı', 'birkaç', 'bile',
  'böyle', 'şöyle', 'başka', 'daha', 'en', 'ayrıca', 'neden', 'niçin',
  'nasıl', 'nerede', 'nereye', 'hangi', 'hangisi', 'içinde', 'arasında',
  'üzerinde', 'altında', 'yanında', 'karşısında', 'doğru', 'karşı',
  'the', 'is', 'are', 'was', 'were', 'and', 'or', 'to', 'in', 'of', 'a',
  'an', 'on', 'at', 'for', 'with', 'as', 'by', 'this', 'that', 'these'
]);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanWord(w: string): string {
  return w.replace(/[.,;:!?'"()«»\[\]{}]/g, '').trim();
}

function isCapitalized(w: string): boolean {
  return /^[A-ZÇĞİÖŞÜ]/.test(w);
}

function isBadConcept(word: string): boolean {
  const lower = word.toLowerCase();
  if (TURKISH_STOPWORDS.has(lower)) return true;
  if (lower.length < 3) return true;
  
  // Kötü son ekler (fiiller, zarflar vs)
  if (/(mıştır|miştir|muştur|müştür|maktadır|mektedir|edilir|olur|oldu|olur|yapar|yapan|veren|alan|gören|inen|ılan|ilen|ulan|ülen|acak|ecek|yor|malı|meli|arak|erek|dıkça|dikçe|ken|ıp|ip|up|üp|madan|meden|maksızın|meksizin|casına|cesine|mış|miş|muş|müş|dı|di|du|dü|tı|ti|tu|tü)$/i.test(lower)) return true;
  
  // Kötü kelimeler (bağlaçlar, edatlar, soru kelimeleri, işaret zamirleri vb)
  if (/^(aşağıdaki|yukarıdaki|böylece|çünkü|dolayısıyla|rağmen|göre|hakkında|için|kadar|üzere|sadece|yalnızca|özellikle|genellikle|çoğunlukla|sürekli|bazen|asla|hemen|şimdi|sonra|önce|gibi|bile|dahi|veya|yahut|ise|oysa|oysaki|madem|mademki|meğer|meğerse|sanki|belki|elbette|kesinlikle|tabii|şüphesiz|hangi|hangisi|nasıl|neden|niçin|nerede|nereye|kim|kime|şey|bunu|şunu|onu|biz|siz|sen|ben|onlar|bunlar|şunlar)$/i.test(lower)) return true;
  
  // Hal/iyelik ekleri almış anlamsız kelimeleri filtrelemek zor olsa da genel referansları temizle
  if (/^(grafiği|grafikte|grafikten|grafikteki|tabloyu|tabloda|tablodan|tablodaki|şekildeki|şekilden|görselde|görselden|görseldeki)$/i.test(lower)) return true;

  if (/^(olarak|bulunan|edilen|geliştirilen|oluşturulan|sağlayan|gösteren|yapılan|veren|alan|olan|olduğu|olmayan|olmadığı|yapılmayan|edilmeyen|olmaması|yapmaması)$/i.test(lower)) return true;
  
  return false;
}

function sameContextConcepts(context: string, allConcepts: Concept[]): Concept[] {
  return allConcepts
    .filter(c => c.context === context)
    .filter(c => !isBadConcept(c.word));
}

function shortOptions(values: string[], answer: string, isNumber = false): string[] {
  const answerLower = answer.toLowerCase();

  const cleaned = values
    .map(v => cleanWord(v))
    .filter(v => v && v.length >= 2 && v.length <= 40)
    .filter(v => v.toLowerCase() !== answerLower)
    .filter(v => !isBadConcept(v))
    .filter((v, idx, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === idx);

  const selected = shuffle(cleaned).slice(0, 3);

  // Sayısal cevaplar için aritmetik varyantlar üret (generic fallback yerine)
  if (isNumber && selected.length < 3) {
    const num = parseFloat(answer.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      const factors = [0.75, 1.25, 1.5, 0.5, 2.0, 0.6, 1.8];
      for (const f of factors) {
        if (selected.length >= 3) break;
        const variant = String(Math.round(num * f));
        if (variant !== answer && variant !== '0' && !selected.includes(variant)) {
          selected.push(variant);
        }
      }
    }
  }

  // Generic fallback YOK — yetersiz şık varsa az döndür, üretici iptal eder
  return selected;
}

function normalizeForLeakCheck(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function leaksSourceText(question: Question): boolean {
  if (!question.sourceText) return false;
  const source = normalizeForLeakCheck(question.sourceText);
  if (source.length < 50) return false;

  const q = normalizeForLeakCheck(question.question);
  if (source.includes(q) && q.length > 35) return true;

  return question.options.some((opt) => {
    const normalized = normalizeForLeakCheck(opt);
    return normalized.length > 35 && source.includes(normalized);
  });
}

function normalizeMaterials(input: any): QuestionMaterial[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : [input];
  return raw
    .map((item): QuestionMaterial | null => {
      if (!item) return null;

      // String: URL mu yoksa metin mi?
      if (typeof item === 'string') {
        if (/^https?:\/\//.test(item) || item.startsWith('data:')) {
          return { type: 'image', url: item, alt: 'Soru görseli' };
        }
        return item.length > 5 ? { type: 'text', content: item } : null;
      }

      // Grafik (graph/chart)
      if (item.type === 'graph' || item.graphType || item.chart_type) {
        const rawData = item.data || item.points || null;
        let labels = item.labels;
        let vals: number[] | null = item.values || item.counts || item.numbers || null;

        // { labels, values } formatını { x, y } formatına çevir
        const convertedData = rawData ??
          (Array.isArray(labels) && Array.isArray(vals)
            ? labels.map((l: any, i: number) => ({ x: String(l), y: (vals as number[])[i] ?? 0 }))
            : null);

        if (Array.isArray(convertedData) && convertedData.length >= 2) {
          const normalizedData = convertedData
            .map((d: any) => {
              if (typeof d !== 'object' || d === null) return null;
              const x = d.x ?? d.label ?? d.name ?? d.category ?? '';
              const y = Number(d.y ?? d.value ?? d.count ?? 0);
              return isNaN(y) ? null : { x: String(x), y };
            })
            .filter((d): d is { x: string; y: number } => d !== null);

          if (normalizedData.length >= 2) {
            return {
              type: 'graph',
              title: item.title || item.baslik || 'Grafik',
              graphType: item.graphType || item.chart_type || item.chartType || 'bar',
              xLabel: item.xLabel || item.x_label || item.xAxis || '',
              yLabel: item.yLabel || item.y_label || item.yAxis || '',
              data: normalizedData
            };
          }
        }
        return null; // geçersiz grafik verisi
      }

      // Tablo (table)
      if (item.type === 'table' || (item.columns && item.rows)) {
        const columns = item.columns || item.headers || item.cols;
        const rows = item.rows || item.body || item.data;
        if (Array.isArray(columns) && Array.isArray(rows) && columns.length > 0) {
          return {
            type: 'table',
            title: item.title || item.baslik || 'Tablo',
            columns: columns.map(String),
            rows: rows.map((row: any) =>
              Array.isArray(row) ? row.map(String) : [String(row)]
            )
          };
        }
        return null;
      }

      // Formül (formula)
      if (item.type === 'formula' || item.formula || item.equation) {
        const formulaStr = String(item.formula || item.equation || '');
        return formulaStr ? { type: 'formula', title: item.title || 'Formül', formula: formulaStr } : null;
      }

      // Varsayılan: image veya text
      const type: QuestionMaterial['type'] =
        item.type || (item.url || item.imageUrl || item.src ? 'image' : 'text');
      return {
        type,
        title: item.title || item.baslik || item.caption || '',
        url: item.url || item.imageUrl || item.src || item.image || '',
        content: item.content || item.text || item.passage || '',
        alt: item.alt || item.description || item.title || 'Soru materyali'
      };
    })
    .filter(Boolean) as QuestionMaterial[];
}

function extractInlineMaterials(text: string): { cleanText: string; materials: QuestionMaterial[] } {
  const materials: QuestionMaterial[] = [];
  let cleanText = text;

  // Markdown image: ![Grafik](https://...)
  cleanText = cleanText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
    materials.push({ type: 'image', title: alt || 'Belge görseli', url, alt });
    return `\n[Görsel: ${alt || 'Belge görseli'}]\n`;
  });

  // Simple HTML img tag
  cleanText = cleanText.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_m, url) => {
    materials.push({ type: 'image', title: 'Belge görseli', url, alt: 'Belge görseli' });
    return '\n[Görsel: Belge görseli]\n';
  });

  // Markdown table blocks
  const tableRegex = /((?:^|\n)\|.+\|\s*\n\|[-:\s|]+\|(?:\s*\n\|.+\|)+)/g;
  cleanText = cleanText.replace(tableRegex, (table) => {
    materials.push({ type: 'table', title: 'Tablo', content: table.trim() });
    return '\n[Tablo: Soru için verilen tablo]\n';
  });

  return { cleanText, materials };
}

// Extract ALL meaningful concepts from the entire document
interface Concept {
  word: string;
  context: string; // surrounding sentence
  isProper: boolean;
  isNumber: boolean;
}

function extractAllConcepts(text: string): Concept[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const concepts: Concept[] = [];
  const seen = new Set<string>();

  sentences.forEach(sentence => {
    const words = sentence.split(/\s+/).map(cleanWord).filter(w => w.length >= 3);
    
    words.forEach((word, idx) => {
      const lower = word.toLowerCase();
      if (TURKISH_STOPWORDS.has(lower)) return;
      if (seen.has(lower)) return;

      // Numbers
      if (/^\d{1,4}$/.test(word)) {
        seen.add(lower);
        concepts.push({ word, context: sentence, isProper: false, isNumber: true });
        return;
      }

      // Proper nouns (capitalized, not at sentence start)
      if (isCapitalized(word) && idx > 0 && word.length >= 3) {
        seen.add(lower);
        concepts.push({ word, context: sentence, isProper: true, isNumber: false });
        return;
      }

      // Long key terms (>= 5 chars, meaningful)
      if (word.length >= 5 && !/(miştir|maktadır|mektedir|dır|dir|tır|tir|yor|acak|ecek|ardı|erdi|malı|meli|mış|miş|muş|müş)$/.test(lower)) {
        seen.add(lower);
        concepts.push({ word, context: sentence, isProper: false, isNumber: false });
      }
    });
  });

  return concepts;
}

function generateQuestionFromConcept(
  concept: Concept,
  allConcepts: Concept[],
  id: string
): Question | null {
  const localConcepts = sameContextConcepts(concept.context, allConcepts);
  const nonNumberLocal = localConcepts.filter(c => !c.isNumber && c.word !== concept.word);
  const numberLocal = localConcepts.filter(c => c.isNumber && c.word !== concept.word);
  const allWords = allConcepts.filter(c => !isBadConcept(c.word)).map(c => c.word);

  let questionText = '';
  let answer = '';
  let options: string[] = [];

  if (concept.isNumber) {
    const anchor = nonNumberLocal[0]?.word || 'bu konu';
    const label = concept.word.length === 4 ? 'yıl' : 'sayısal değer';
    questionText = `Belgede ${anchor} ile ilişkilendirilen ${label} hangisidir?`;
    answer = concept.word;
    const numberDistractors = allConcepts.filter(c => c.isNumber).map(c => c.word);
    options = shortOptions(numberDistractors, answer, true);
  } else {
    const anchor = nonNumberLocal.find(c => c.isProper)?.word || nonNumberLocal[0]?.word || numberLocal[0]?.word;
    if (anchor) {
      const templates = [
        `Belgede ${anchor} hangi kavramla ilişkilendirilmiştir?`,
        `Belgedeki ${anchor} konusu için doğru eşleşme hangisidir?`,
        `${anchor} konusu belgeye göre aşağıdakilerden hangisiyle bağlantılıdır?`,
        `Belgeye göre ${anchor} ile birlikte öne çıkan kavram hangisidir?`
      ];
      questionText = templates[Math.floor(Math.random() * templates.length)];
      answer = concept.word;
    } else {
      questionText = `Belgede öne çıkan temel kavramlardan biri hangisidir?`;
      answer = concept.word;
    }
    // Aynı paragraftan şıkları önceliklendir, sonra tüm belge kavramları
    const sameParagraphWords = localConcepts.map(c => c.word);
    const candidatePool = [...new Set([...sameParagraphWords, ...allWords])];
    options = shortOptions(candidatePool, answer, false);
  }

  // En az 2 gerçek şık olmadan soru oluşturma
  if (options.length < 2) return null;

  // Difficulty assignment
  let difficulty: Difficulty = 'NORMAL';
  if (concept.isProper && concept.word.length > 7) difficulty = 'HARD';
  if (concept.word.length <= 5) difficulty = 'EASY';

  return {
    id: `gen-${id}`,
    type: 'MULTIPLE_CHOICE',
    question: questionText,
    options: shuffle([answer, ...options]),
    answer,
    sourceText: concept.context,
    difficulty,
    hint: `Belgedeki konu-kavram ilişkisini düşün.`
  };
}

// Also generate True/False questions
function generateTrueFalseQuestion(
  concept: Concept,
  allConcepts: Concept[],
  id: string
): Question {
  const makeFalse = Math.random() > 0.5;
  const localConcepts = sameContextConcepts(concept.context, allConcepts).filter(c => c.word !== concept.word);
  const anchor = localConcepts.find(c => !c.isNumber)?.word || 'bu konu';
  const trueStatement = `Belgeye göre ${anchor} ile ${concept.word} arasında ilişki kurulmuştur.`;

  if (makeFalse && allConcepts.length > 5) {
    const otherConcept = shuffle(
      allConcepts.filter(c => c.word !== concept.word && c.context !== concept.context && c.isNumber === concept.isNumber && !isBadConcept(c.word))
    )[0];
    if (otherConcept) {
      return {
        id: `tf-${id}`,
        type: 'TRUE_FALSE',
        question: `Bu ifade doğru mu?\n\nBelgeye göre ${anchor} ile ${otherConcept.word} arasında ilişki kurulmuştur.`,
        options: ['Doğru', 'Yanlış'],
        answer: 'Yanlış',
        sourceText: concept.context,
        difficulty: 'HARD',
        hint: 'Konu-kavram eşleşmesi doğru mu kontrol et.'
      };
    }
  }

  return {
    id: `tf-${id}`,
    type: 'TRUE_FALSE',
    question: `Bu ifade doğru mu?\n\n${trueStatement}`,
    options: ['Doğru', 'Yanlış'],
    answer: 'Doğru',
    sourceText: concept.context,
    difficulty: 'EASY',
    hint: 'Konu-kavram eşleşmesi belgedeki ilişkiye uygundur.'
  };
}

export function extractQuestions(text: string, difficulty: Difficulty = 'NORMAL'): Question[] {
  if (!text || text.trim() === '') return [];

  const { cleanText, materials: documentMaterials } = extractInlineMaterials(text);
  text = cleanText;

  // JSON format bypass
  try {
    const parsed = typeof text === 'string' ? JSON.parse(text) : text;
    if (Array.isArray(parsed)) {
      const qs: Question[] = [];
      parsed.forEach((item: any, index: number) => {
        if (typeof item === 'object' && item !== null) {
          const q = item.question || item.soru || '';
          const opts = item.options || item.secenekler || [];
          const ans = item.answer || item.cevap || '';

          // Tüm materyal tiplerini ayrı ayrı topla (|| zinciri bozuyordu)
          const matSources: any[] = [];
          if (item.materials) {
            Array.isArray(item.materials)
              ? matSources.push(...item.materials)
              : matSources.push(item.materials);
          }
          if (item.graph) {
            const { type, ...rest } = item.graph;
            matSources.push({ type: 'graph', graphType: type, ...rest });
          }
          if (item.chart) {
            const { type, ...rest } = item.chart;
            matSources.push({ type: 'graph', graphType: type, ...rest });
          }
          if (item.table) {
            const { type, ...rest } = item.table;
            matSources.push({ type: 'table', ...rest });
          }
          if (item.formula) matSources.push({ type: 'formula', formula: item.formula });
          if (item.media)   matSources.push(item.media);
          if (item.imageUrl) matSources.push(item.imageUrl);
          if (item.image)   matSources.push(item.image);
          if (item.passage) matSources.push({ type: 'text', content: item.passage });
          const materials = normalizeMaterials(matSources);
          if (q && ans) {
            let options = [...opts];
            if (!options.includes(ans)) options.push(ans);
            qs.push({
              id: `json-${index}`,
              type: item.type || 'MULTIPLE_CHOICE',
              question: q,
              options: shuffle(options),
              answer: ans,
              sourceText: item.sourceText || '',
              difficulty: item.difficulty || difficulty,
              hint: item.hint || '',
              materials
            });
          }
        }
      });
      if (qs.length > 0) return qs;
    }
  } catch (e) {}

  // CSV format
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const csvQs: Question[] = [];
  lines.forEach((line, index) => {
    let sep = '';
    if (line.includes(';')) sep = ';';
    else if (line.includes('\t')) sep = '\t';
    else if (line.includes('|')) sep = '|';
    if (sep) {
      const parts = line.split(sep).map(s => s.trim());
      if (parts.length >= 2 && parts[0].length > 4 && parts[1].length > 0) {
        csvQs.push({
          id: `csv-${index}`,
          type: 'MULTIPLE_CHOICE',
          question: parts[0],
          options: [],
          answer: parts[1],
          difficulty
        });
      }
    }
  });
  if (csvQs.length > 3) {
    csvQs.forEach((q, idx) => {
      const distractors = csvQs.filter((_, i) => i !== idx).map(o => o.answer).filter(a => a !== q.answer);
      q.options = shuffle([q.answer, ...shuffle(distractors).slice(0, 3)]);
    });
    return csvQs;
  }

  // ===== CORE ENGINE: Concept Extraction & Question Generation =====
  const concepts = extractAllConcepts(text);
  if (concepts.length < 3) return [];

  const questions: Question[] = [];

  // Generate up to 15 multiple choice questions from concepts
  const availableConcepts = shuffle(concepts).slice(0, Math.min(15, concepts.length));
  
  availableConcepts.forEach((concept, idx) => {
    // 70% multiple choice, 30% true/false
    if (Math.random() > 0.3) {
      const q = generateQuestionFromConcept(concept, concepts, `mc-${idx}`);
      if (q) {
        const withMaterials = { ...q, materials: documentMaterials.slice(0, 2) };
        // En az 3 seçenek (cevap + 2 şık) olmadan ekleme
        if (!leaksSourceText(withMaterials) && withMaterials.options.length >= 3) {
          questions.push(withMaterials);
        }
      }
    } else {
      const q = { ...generateTrueFalseQuestion(concept, concepts, `tf-${idx}`), materials: documentMaterials.slice(0, 2) };
      if (!leaksSourceText(q)) questions.push(q);
    }
  });

  return questions;
}

// Sample texts remain the same high-quality presets
export const sampleTexts = [
  {
    title: 'Güneş Sistemi',
    icon: '🪐',
    text: {
      tr: `[
      {"question": "Güneş Sistemi'ndeki en büyük gezegen aşağıdakilerden hangisidir?", "options": ["Jüpiter", "Satürn", "Uranüs", "Neptün"], "answer": "Jüpiter", "difficulty": "EASY", "hint": "Kütlesi diğer tüm gezegenlerin toplamından daha fazladır."},
      {"question": "Hangisi Güneş'e en yakın gezegendir ve aşırı sıcaklık değişimleri gösterir?", "options": ["Merkür", "Venüs", "Mars", "Dünya"], "answer": "Merkür", "difficulty": "EASY", "hint": "Yüzey sıcaklığı 430 dereceye kadar çıkabilir."},
      {"question": "Kızıl Gezegen olarak adlandırılan ve yüzeyi demir oksit kaplı olan gezegen hangisidir?", "options": ["Mars", "Venüs", "Satürn", "Merkür"], "answer": "Mars", "difficulty": "NORMAL", "hint": "Üzerinde devasa volkanlar bulunur ancak aktif değildir."},
      {"question": "Uranüs gezegeninin en belirgin dönme özelliği nedir?", "options": ["98 derece eğiklik ile yan yatmış dönme", "Çok hızlı dönme", "Ters yönde dönme", "Halkasız dönme"], "answer": "98 derece eğiklik ile yan yatmış dönme", "difficulty": "HARD", "hint": "Güneş etrafında varil gibi yuvarlanarak döner."},
      {"question": "Pluto hangi tarihte 'cüce gezegen' statüsüne indirilmiştir?", "options": ["2006", "2001", "2010", "1998"], "answer": "2006", "difficulty": "NORMAL"},
      {"question": "Güneş Sistemi Samanyolu Galaksisi'nin hangi kolunda yer alır?", "options": ["Orion Kolu", "Perseus Kolu", "Yay Kolu", "Kuğu Kolu"], "answer": "Orion Kolu", "difficulty": "HARD"}
    ]`,
      en: `[
      {"question": "What is the largest planet in the Solar System?", "options": ["Jupiter", "Saturn", "Uranus", "Neptune"], "answer": "Jupiter", "difficulty": "EASY", "hint": "Its mass is more than all other planets combined."},
      {"question": "Which planet is closest to the Sun and has extreme temperature changes?", "options": ["Mercury", "Venus", "Mars", "Earth"], "answer": "Mercury", "difficulty": "EASY", "hint": "Surface temperature can reach 430 degrees."},
      {"question": "Which planet is called the Red Planet and is covered with iron oxide?", "options": ["Mars", "Venus", "Saturn", "Mercury"], "answer": "Mars", "difficulty": "NORMAL", "hint": "It has huge volcanoes but they are not active."},
      {"question": "What is the most distinct rotational feature of Uranus?", "options": ["Rotating on its side with a 98-degree tilt", "Very fast rotation", "Retrograde rotation", "Rotation without rings"], "answer": "Rotating on its side with a 98-degree tilt", "difficulty": "HARD", "hint": "It rolls around the Sun like a barrel."},
      {"question": "In what year was Pluto demoted to 'dwarf planet' status?", "options": ["2006", "2001", "2010", "1998"], "answer": "2006", "difficulty": "NORMAL"},
      {"question": "In which arm of the Milky Way Galaxy is the Solar System located?", "options": ["Orion Arm", "Perseus Arm", "Sagittarius Arm", "Cygnus Arm"], "answer": "Orion Arm", "difficulty": "HARD"}
    ]`
    }
  },
  {
    title: 'Yapay Zeka & Teknoloji',
    icon: '🤖',
    text: {
      tr: `[
      {"question": "Bileşen tabanlı mimari ve tek yönlü veri akışını benimseyen kütüphane hangisidir?", "options": ["React", "Vue", "Angular", "Svelte"], "answer": "React", "difficulty": "EASY"},
      {"question": "Hızlı derleme süreleri sunan ESBuild tabanlı yeni nesil araç zinciri nedir?", "options": ["Vite", "Webpack", "Babel", "Gulp"], "answer": "Vite", "difficulty": "NORMAL"},
      {"question": "Aşağıdakilerden hangisi JavaScript'e statik tip güvenliği ekleyen Microsoft dilidir?", "options": ["TypeScript", "CoffeeScript", "Dart", "Rust"], "answer": "TypeScript", "difficulty": "EASY"},
      {"question": "Dağıtık mutabakat ve kriptografik hash zinciri kullanan merkeziyetsiz teknoloji nedir?", "options": ["Blockchain", "Cloud Computing", "Siber Güvenlik", "Büyük Veri"], "answer": "Blockchain", "difficulty": "HARD"},
      {"question": "Turing makinesi teorisi temelinde çalışan çözüm prosedürleri ne olarak adlandırılır?", "options": ["Algoritmalar", "Modeller", "Sanallaştırma", "Veri Yapıları"], "answer": "Algoritmalar", "difficulty": "NORMAL"}
    ]`,
      en: `[
      {"question": "Which library adopts component-based architecture and one-way data flow?", "options": ["React", "Vue", "Angular", "Svelte"], "answer": "React", "difficulty": "EASY"},
      {"question": "What is the next-generation toolchain based on ESBuild offering fast compilation times?", "options": ["Vite", "Webpack", "Babel", "Gulp"], "answer": "Vite", "difficulty": "NORMAL"},
      {"question": "Which of the following is a Microsoft language that adds static type safety to JavaScript?", "options": ["TypeScript", "CoffeeScript", "Dart", "Rust"], "answer": "TypeScript", "difficulty": "EASY"},
      {"question": "What is the decentralized technology using distributed consensus and cryptographic hash chains?", "options": ["Blockchain", "Cloud Computing", "Cyber Security", "Big Data"], "answer": "Blockchain", "difficulty": "HARD"},
      {"question": "What are the solution procedures based on the Turing machine theory called?", "options": ["Algorithms", "Models", "Virtualization", "Data Structures"], "answer": "Algorithms", "difficulty": "NORMAL"}
    ]`
    }
  },
  {
    title: 'Tarih ve Uygarlıklar',
    icon: '🏛️',
    text: {
      tr: `[
      {"question": "Mezopotamya'da çivi yazısını bularak tarihi çağları başlatan uygarlık hangisidir?", "options": ["Sümerler", "Akadlar", "Asurlar", "Babiller"], "answer": "Sümerler", "difficulty": "EASY"},
      {"question": "Matbaanın 1440 yılında Avrupa'da geliştirilmesini sağlayan mucit kimdir?", "options": ["Gutenberg", "Leonardo da Vinci", "Galileo", "Newton"], "answer": "Gutenberg", "difficulty": "NORMAL"},
      {"question": "Türkiye Cumhuriyeti hangi yılda ilan edilmiştir?", "options": ["1923", "1920", "1919", "1924"], "answer": "1923", "difficulty": "EASY"},
      {"question": "Babil İmparatorluğu döneminde yazılan ünlü antik kanunlar hangisidir?", "options": ["Hammurabi Kanunları", "On İki Levha Kanunları", "Urkagina Kanunları", "Justinianus Kanunları"], "answer": "Hammurabi Kanunları", "difficulty": "HARD"},
      {"question": "Osmanlı Devleti hangi yılda İstanbul'u fethetmiştir?", "options": ["1453", "1299", "1517", "1402"], "answer": "1453", "difficulty": "EASY"}
    ]`,
      en: `[
      {"question": "Which civilization started historical ages by inventing cuneiform in Mesopotamia?", "options": ["Sumerians", "Akkadians", "Assyrians", "Babylonians"], "answer": "Sumerians", "difficulty": "EASY"},
      {"question": "Who is the inventor that developed the printing press in Europe in 1440?", "options": ["Gutenberg", "Leonardo da Vinci", "Galileo", "Newton"], "answer": "Gutenberg", "difficulty": "NORMAL"},
      {"question": "In what year was the Republic of Turkey proclaimed?", "options": ["1923", "1920", "1919", "1924"], "answer": "1923", "difficulty": "EASY"},
      {"question": "Which are the famous ancient laws written during the Babylonian Empire?", "options": ["Code of Hammurabi", "Law of the Twelve Tables", "Code of Urukagina", "Code of Justinian"], "answer": "Code of Hammurabi", "difficulty": "HARD"},
      {"question": "In what year did the Ottoman Empire conquer Istanbul?", "options": ["1453", "1299", "1517", "1402"], "answer": "1453", "difficulty": "EASY"}
    ]`
    }
  },
  {
    title: 'Biyoloji - Hücre',
    icon: '🧬',
    text: {
      tr: `[
      {"question": "Hücrenin ihtiyaç duyduğu ATP enerjisini üreten organel hangisidir?", "options": ["Mitokondri", "Ribozom", "Kloroplast", "Lizozom"], "answer": "Mitokondri", "difficulty": "EASY"},
      {"question": "Bitki hücrelerinde fotosentez yaparak besin ve oksijen üreten yapı hangisidir?", "options": ["Kloroplast", "Golgi aygıtı", "Koful", "Sentrozom"], "answer": "Kloroplast", "difficulty": "EASY"},
      {"question": "Hücrede protein sentezinin gerçekleştiği en küçük organel hangisidir?", "options": ["Ribozom", "Mitokondri", "Lizozom", "Sentrozom"], "answer": "Ribozom", "difficulty": "NORMAL"},
      {"question": "DNA molekülünün sarmal yapısını 1953 yılında keşfeden bilim insanları kimlerdir?", "options": ["Watson ve Crick", "Mendel ve Darwin", "Pasteur ve Koch", "Hooke ve Brown"], "answer": "Watson ve Crick", "difficulty": "HARD"},
      {"question": "Hücrenin kontrol ve yönetim merkezi olan yapı aşağıdakilerden hangisidir?", "options": ["Çekirdek", "Sitoplazma", "Hücre Zarı", "Çeper"], "answer": "Çekirdek", "difficulty": "EASY"}
    ]`,
      en: `[
      {"question": "Which organelle produces the ATP energy needed by the cell?", "options": ["Mitochondria", "Ribosome", "Chloroplast", "Lysosome"], "answer": "Mitochondria", "difficulty": "EASY"},
      {"question": "Which structure produces food and oxygen by performing photosynthesis in plant cells?", "options": ["Chloroplast", "Golgi apparatus", "Vacuole", "Centrosome"], "answer": "Chloroplast", "difficulty": "EASY"},
      {"question": "Which is the smallest organelle where protein synthesis occurs in the cell?", "options": ["Ribosome", "Mitochondria", "Lysosome", "Centrosome"], "answer": "Ribosome", "difficulty": "NORMAL"},
      {"question": "Who are the scientists that discovered the double helix structure of the DNA molecule in 1953?", "options": ["Watson and Crick", "Mendel and Darwin", "Pasteur and Koch", "Hooke and Brown"], "answer": "Watson and Crick", "difficulty": "HARD"},
      {"question": "Which of the following is the control and management center of the cell?", "options": ["Nucleus", "Cytoplasm", "Cell Membrane", "Cell Wall"], "answer": "Nucleus", "difficulty": "EASY"}
    ]`
    }
  },
  {
    title: 'Fizik - Kuvvet ve Hareket',
    icon: '⚛️',
    text: {
      tr: `[
      {"question": "Hız kavramının fiziksel tanımı aşağıdakilerden hangisidir?", "options": ["Zamana göre konumun türevi", "Birim kütleye düşen enerji", "İvmenin zamana göre değişimi", "Skaler yer değiştirme"], "answer": "Zamana göre konumun türevi", "difficulty": "HARD"},
      {"question": "Klasik mekaniğin temeli olan hareket yasaları hangi eserde 1687 yılında yayınlanmıştır?", "options": ["Principia Mathematica", "Opticks", "Almagest", "De Revolutionibus"], "answer": "Principia Mathematica", "difficulty": "HARD"},
      {"question": "Dünya yüzeyindeki standart yerçekimi ivmesi yaklaşık olarak kaç m/s²'dir?", "options": ["9.806", "10.5", "8.92", "1.62"], "answer": "9.806", "difficulty": "NORMAL"},
      {"question": "İvme ile kütlenin çarpımı fizikte hangi büyüklüğü ifade eder?", "options": ["Kuvvet", "İş", "Momentum", "Güç"], "answer": "Kuvvet", "difficulty": "EASY"}
    ]`,
      en: `[
      {"question": "What is the physical definition of the concept of velocity?", "options": ["Derivative of position with respect to time", "Energy per unit mass", "Change of acceleration over time", "Scalar displacement"], "answer": "Derivative of position with respect to time", "difficulty": "HARD"},
      {"question": "In which work were the laws of motion, the foundation of classical mechanics, published in 1687?", "options": ["Principia Mathematica", "Opticks", "Almagest", "De Revolutionibus"], "answer": "Principia Mathematica", "difficulty": "HARD"},
      {"question": "What is the standard acceleration due to gravity on the Earth's surface approximately in m/s²?", "options": ["9.806", "10.5", "8.92", "1.62"], "answer": "9.806", "difficulty": "NORMAL"},
      {"question": "What quantity does the product of acceleration and mass represent in physics?", "options": ["Force", "Work", "Momentum", "Power"], "answer": "Force", "difficulty": "EASY"}
    ]`
    }
  },
  {
    title: 'Coğrafya - Türkiye',
    icon: '🗺️',
    text: {
      tr: `[
      {"question": "Türkiye'nin en uzun nehri aşağıdakilerden hangisidir?", "options": ["Kızılırmak", "Yeşilırmak", "Fırat", "Dicle"], "answer": "Kızılırmak", "difficulty": "EASY"},
      {"question": "Türkiye'nin en yüksek noktası olan Ağrı Dağı'nın yüksekliği kaç metredir?", "options": ["5137", "3917", "4058", "5012"], "answer": "5137", "difficulty": "NORMAL"},
      {"question": "Sodalı sulara sahip olan Türkiye'nin en büyük gölü hangisidir?", "options": ["Van Gölü", "Tuz Gölü", "Beyşehir Gölü", "Eğirdir Gölü"], "answer": "Van Gölü", "difficulty": "EASY"}
    ]`,
      en: `[
      {"question": "Which of the following is the longest river in Turkey?", "options": ["Kızılırmak", "Yeşilırmak", "Euphrates", "Tigris"], "answer": "Kızılırmak", "difficulty": "EASY"},
      {"question": "What is the height of Mount Ararat, the highest point in Turkey, in meters?", "options": ["5137", "3917", "4058", "5012"], "answer": "5137", "difficulty": "NORMAL"},
      {"question": "Which is the largest lake in Turkey known for its soda-rich waters?", "options": ["Lake Van", "Lake Tuz", "Lake Beyşehir", "Lake Eğirdir"], "answer": "Lake Van", "difficulty": "EASY"}
    ]`
    }
  }
];
