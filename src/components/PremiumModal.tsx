import { X, CheckCircle2, Sparkles, Zap, LockOpen, Gamepad2 } from 'lucide-react';
import { useTranslation } from '../utils/i18n';

interface Props {
  onClose: () => void;
  onSubscribe: () => void;
}

export default function PremiumModal({ onClose, onSubscribe }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-amber-900/20">
        
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-amber-600 to-orange-600 flex flex-col items-center justify-center p-6 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white/20 rounded-full backdrop-blur-md mb-2">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white relative z-10">{t('premium.title')}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 text-center mb-6 text-sm">
            {t('premium.desc')}
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-amber-500/20 p-1 rounded-full text-amber-500">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200">{t('premium.feature.1')}</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-amber-500/20 p-1 rounded-full text-amber-500">
                <LockOpen className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200">{t('premium.feature.2')}</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-amber-500/20 p-1 rounded-full text-amber-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200">{t('premium.feature.3')}</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-amber-500/20 p-1 rounded-full text-amber-500">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <p className="text-sm text-slate-200">{t('premium.feature.4')}</p>
            </div>
          </div>
          
          <button 
            onClick={onSubscribe}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] mb-3"
          >
            {t('premium.button')}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            {t('premium.cancel')}
          </button>
        </div>
        
      </div>
    </div>
  );
}
