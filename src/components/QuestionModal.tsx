import { useEffect, useState, useRef } from 'react';
import { Question, QuestionMaterial } from '../utils/questionExtractor';
import { Clock, ChevronDown, ChevronUp, ZoomIn, X } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
  timeLimit?: number;
}

// Lightweight SVG-based chart renderer (no external library)
function GraphRenderer({ material }: { material: QuestionMaterial }) {
  const data = material.data || [];
  if (data.length === 0) return null;

  const W = 280;
  const H = 150;
  const pad = 30;
  const maxY = Math.max(...data.map(d => d.y), 1);
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

  if (material.graphType === 'pie') {
    const total = data.reduce((sum, d) => sum + d.y, 0) || 1;
    let startAngle = -Math.PI / 2;
    const cx = W / 2, cy = H / 2, r = 55;
    return (
      <div className="bg-slate-900 rounded-lg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {data.map((d, i) => {
            const angle = (d.y / total) * Math.PI * 2;
            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(startAngle + angle);
            const y2 = cy + r * Math.sin(startAngle + angle);
            const large = angle > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            startAngle += angle;
            return <path key={i} d={path} fill={colors[i % colors.length]} stroke="#0f172a" strokeWidth="1" />;
          })}
        </svg>
        <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
          {data.map((d, i) => (
            <span key={i} className="flex items-center gap-1 text-[8px] text-slate-300">
              <span className="w-2 h-2 rounded-sm" style={{ background: colors[i % colors.length] }}></span>
              {d.x}: {d.y}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const chartW = W - pad * 2;
  const chartH = H - pad * 2;
  const barWidth = chartW / data.length * 0.6;

  return (
    <div className="bg-slate-900 rounded-lg p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Axes */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#475569" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#475569" strokeWidth="1" />

        {/* Bars or Line/Scatter */}
        {material.graphType === 'bar' && data.map((d, i) => {
          const barH = (d.y / maxY) * chartH;
          const x = pad + (chartW / data.length) * i + (chartW / data.length - barWidth) / 2;
          const y = H - pad - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} fill={colors[i % colors.length]} rx="2" />
              <text x={x + barWidth / 2} y={H - pad + 10} textAnchor="middle" fill="#94a3b8" fontSize="7">{d.x}</text>
              <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" fill="#cbd5e1" fontSize="7">{d.y}</text>
            </g>
          );
        })}

        {(material.graphType === 'line' || material.graphType === 'scatter' || !material.graphType) && (
          <>
            {material.graphType !== 'scatter' && (
              <polyline
                points={data.map((d, i) => {
                  const x = pad + (chartW / (data.length - 1 || 1)) * i;
                  const y = H - pad - (d.y / maxY) * chartH;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
              />
            )}
            {data.map((d, i) => {
              const x = pad + (chartW / (data.length - 1 || 1)) * i;
              const y = H - pad - (d.y / maxY) * chartH;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="3" fill="#10b981" />
                  <text x={x} y={H - pad + 10} textAnchor="middle" fill="#94a3b8" fontSize="7">{d.x}</text>
                </g>
              );
            })}
          </>
        )}

        {material.yLabel && <text x={8} y={H / 2} textAnchor="middle" fill="#64748b" fontSize="7" transform={`rotate(-90 8 ${H / 2})`}>{material.yLabel}</text>}
        {material.xLabel && <text x={W / 2} y={H - 4} textAnchor="middle" fill="#64748b" fontSize="7">{material.xLabel}</text>}
      </svg>
    </div>
  );
}

export default function QuestionModal({ question, onAnswer, timeLimit = 25 }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    if (selected !== null) return;
    if (timeLeft <= 0) {
      setSelected('__TIMEOUT__');
      setIsCorrect(false);
      setTimeout(() => onAnswer(false), 1200);
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, selected, onAnswer]);

  // Detect if the question text is too long (over 3 lines)
  useEffect(() => {
    if (questionRef.current) {
      const lineHeight = 24;
      const maxLines = 4;
      setNeedsScroll(questionRef.current.scrollHeight > lineHeight * maxLines);
    }
  }, [question.question]);

  const handleSelect = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === question.answer;
    setIsCorrect(correct);
    setTimeout(() => onAnswer(correct), 1500);
  };

  const typeLabel: Record<string, { label: string; color: string; icon: string }> = {
    MULTIPLE_CHOICE: { label: 'Çoktan Seçmeli', color: 'amber', icon: '📝' },
    TRUE_FALSE: { label: 'Doğru/Yanlış', color: 'sky', icon: '⚖️' },
    MATCHING: { label: 'Materyalli', color: 'purple', icon: '📊' }
  };
  const meta = typeLabel[question.type] || typeLabel.MULTIPLE_CHOICE;

  const difficultyBadge: Record<string, { label: string; color: string }> = {
    EASY: { label: 'Kolay', color: 'emerald' },
    NORMAL: { label: 'Normal', color: 'amber' },
    HARD: { label: 'Zor', color: 'red' }
  };
  const diff = difficultyBadge[question.difficulty || 'NORMAL'];

  const timePercent = (timeLeft / timeLimit) * 100;
  const timeColor = timeLeft > 10 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-amber-500' : 'bg-red-500';
  const isLongQuestion = (question.question?.length || 0) > 120;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start sm:justify-center bg-slate-900/95 p-3 sm:p-4 text-center backdrop-blur-md select-none overflow-y-auto z-50">
      {/* Top Status Bar */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap justify-center">
        <span className={`text-[10px] px-2 py-1 rounded-full bg-${meta.color}-500/20 border border-${meta.color}-500/40 text-${meta.color}-300 font-bold uppercase`}>
          {meta.icon} {meta.label}
        </span>
        <span className={`text-[10px] px-2 py-1 rounded-full bg-${diff.color}-500/20 border border-${diff.color}-500/40 text-${diff.color}-300 font-bold uppercase`}>
          {diff.label}
        </span>
        {question.materials && question.materials.length > 0 && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold uppercase flex items-center gap-1">
            📊 {question.materials.length} Materyal
          </span>
        )}
      </div>

      {/* Time Bar */}
      <div className="w-full max-w-sm mb-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeLeft}s
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${timeColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timePercent}%` }}
          />
        </div>
      </div>

      {/* Question with scroll if too long */}
      <div className="w-full max-w-sm mb-2.5">
        <div
          className={`relative rounded-xl bg-slate-800/40 border border-slate-700/60 p-2.5 ${
            questionExpanded ? 'max-h-60 overflow-y-auto' : needsScroll || isLongQuestion ? 'max-h-28 overflow-hidden' : ''
          }`}
        >
          <h3
            ref={questionRef}
            className="text-sm sm:text-base font-bold text-slate-100 break-words whitespace-pre-line leading-snug text-left"
          >
            {question.question}
          </h3>
          {(needsScroll || isLongQuestion) && (
            <button
              onClick={() => setQuestionExpanded(!questionExpanded)}
              className="mt-1.5 w-full text-[10px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center justify-center gap-1 py-0.5"
            >
              {questionExpanded ? (
                <><ChevronUp className="w-3 h-3" /> Daralt</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Tamamını Gör</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Materials (images / tables) */}
      {question.materials && question.materials.length > 0 && (
        <div className="w-full max-w-sm mb-2.5 space-y-1.5">
          {question.materials.slice(0, 2).map((material, idx) => (
            <div key={idx} className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-1.5 text-left overflow-hidden">
              {material.title && (
                <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-indigo-300 px-1">
                  {material.title}
                </div>
              )}

              {material.type === 'image' && material.url && (
                <div className="relative group">
                  <img
                    src={material.url}
                    alt={material.alt || material.title || 'Soru materyali'}
                    className="max-h-32 sm:max-h-36 w-full rounded-lg object-contain bg-white/5 cursor-zoom-in"
                    onClick={() => setZoomedImage(material.url || null)}
                  />
                  <button
                    onClick={() => setZoomedImage(material.url || null)}
                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-1 rounded-md opacity-0 group-hover:opacity-100 transition"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              )}

              {material.type === 'table' && material.columns && material.rows && (
                <div className="max-h-40 overflow-auto rounded-lg bg-slate-900">
                  <table className="w-full text-[10px] text-slate-200">
                    <thead>
                      <tr className="bg-slate-800">
                        {material.columns.map((col, ci) => (
                          <th key={ci} className="px-2 py-1.5 text-left font-bold text-indigo-300 border-b border-slate-700">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {material.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-slate-800">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1.5">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {material.type === 'table' && material.content && !material.columns && (
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-200">
                  {material.content}
                </pre>
              )}

              {material.type === 'graph' && material.data && (
                <GraphRenderer material={material} />
              )}

              {material.type === 'formula' && material.formula && (
                <div className="rounded-lg bg-slate-900 px-3 py-4 text-center overflow-x-auto overflow-y-hidden">
                  <div className="text-xl sm:text-2xl text-amber-300 tracking-wide">
                    <Latex>{`$$${material.formula.replace(/\\cdot/g, '\\cdot ').replace(/\\times/g, '\\times ')}$$`}</Latex>
                  </div>
                </div>
              )}

              {material.type === 'text' && material.content && (
                <p className="max-h-28 overflow-auto rounded-lg bg-slate-900 p-2 text-xs leading-relaxed text-slate-200">
                  {material.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className={`grid gap-1.5 w-full max-w-sm ${question.options.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {question.options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrectAnswer = opt === question.answer;
          const isLongOpt = opt.length > 60;

          let btnClass = 'bg-slate-800/80 active:bg-slate-700 border-slate-700 text-slate-200';
          if (selected !== null) {
            if (isCorrectAnswer) {
              btnClass = 'bg-emerald-500/30 border-emerald-400 text-emerald-200 font-bold scale-[1.01]';
            } else if (isSelected && !isCorrectAnswer) {
              btnClass = 'bg-red-500/30 border-red-400 text-red-200';
            } else {
              btnClass = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-50';
            }
          }

          return (
            <button
              key={i}
              disabled={selected !== null}
              onClick={() => handleSelect(opt)}
              className={`w-full px-3 rounded-xl border-2 transition-all font-medium text-left break-words active:scale-[0.985] touch-manipulation ${btnClass} ${
                isLongOpt ? 'py-3 text-xs' : 'py-2.5 text-sm'
              }`}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 mr-2 text-[10px] bg-slate-900/60 rounded-md font-mono font-bold text-slate-400 flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-3 font-bold text-sm flex items-center gap-2 px-2">
          {isCorrect ? (
            <span className="text-emerald-400">✅ Doğru! Can kazandın!</span>
          ) : (
            <span className="text-red-400">❌ Yanlış. Doğru: <span className="text-emerald-300 font-mono">{question.answer}</span></span>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-slate-800/80"
            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImage}
            alt="Yakınlaştırılmış görsel"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
