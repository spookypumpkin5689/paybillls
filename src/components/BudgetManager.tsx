import React, { useState } from 'react';
import { 
  Sliders, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  PiggyBank,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { BudgetLimit, CategoryType } from '../types';

interface BudgetManagerProps {
  limits: BudgetLimit[];
  onUpdateLimit: (category: CategoryType, limit: number) => Promise<void>;
}

export default function BudgetManager({
  limits,
  onUpdateLimit
}: BudgetManagerProps) {
  const [editingLimits, setEditingLimits] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize input value state
  const handleLimitChange = (category: string, value: string) => {
    const num = parseInt(value) || 0;
    setEditingLimits(prev => ({ ...prev, [category]: num }));
  };

  const handleSaveSingle = async (category: CategoryType) => {
    const val = editingLimits[category];
    if (val === undefined) return;

    setIsSaving(prev => ({ ...prev, [category]: true }));
    setSuccessMsg(null);

    try {
      await onUpdateLimit(category, val);
      setSuccessMsg(`Бюджетный лимит для "${category}" обновлен успешно.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(prev => ({ ...prev, [category]: false }));
    }
  };

  return (
    <div className="frosted-panel rounded-3xl p-6 shadow-xl backdrop-blur-xl relative z-10 space-y-6">
      
      {/* Title */}
      <div className="border-b border-white/10 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Калибровка бюджетных лимитов и предупреждений</h2>
          <p className="text-xs text-slate-400 mt-1">Задайте ежемесячные лимиты по категориям. При тратах свыше 85% ИИ пришлет вам предупреждение</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-250 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Setup Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {limits.map((lim) => {
              const currentVal = editingLimits[lim.category] !== undefined 
                ? editingLimits[lim.category] 
                : lim.limit;
              
              const saving = !!isSaving[lim.category];

              return (
                <div key={lim.category} className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3 shadow-md">
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{lim.category}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Установлено: {lim.limit.toLocaleString('ru-RU')} ₽</p>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={currentVal || ''}
                        onChange={e => handleLimitChange(lim.category, e.target.value)}
                        className="w-full input-glass rounded-lg pl-3 pr-8 py-2 text-xs text-white font-bold"
                        placeholder="Задать лимит"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 font-bold font-mono">₽</span>
                    </div>

                    <button
                      onClick={() => handleSaveSingle(lim.category)}
                      disabled={saving || currentVal === lim.limit}
                      id={`limit-save-${lim.category}`}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-500 text-white font-bold text-xs rounded-lg active:scale-95 transition cursor-pointer select-none flex items-center gap-1 shrink-0 border border-white/10"
                    >
                      {saving ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        'Сохранить'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Informative panel */}
        <div className="space-y-4">
          <div className="p-5 bg-indigo-950/25 border border-indigo-500/25 rounded-2xl space-y-4">
            <PiggyBank size={32} className="text-indigo-400" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white font-sans">Система «Умный предел»</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Наши финансовые оповещения полностью автоматизированы на стороне сервера. Как только вы загрузите чек или внесете расходы вручную, система рассчитает:
              </p>
              <ul className="text-xs text-slate-300 list-disc list-inside space-y-1.5 pl-1 font-medium">
                <li><strong className="text-[#f59e0b] font-bold">Предел 85%:</strong> отправляется желтое предупреждение о скором исчерпании.</li>
                <li><strong className="text-[#ef4444] font-bold">Предел 100%:</strong> отправляется красное уведомление об отключении необязательных трат.</li>
              </ul>
            </div>
          </div>

          <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-3">
            <div className="flex gap-2 items-center text-amber-400 font-bold text-xs uppercase tracking-wide">
              <HelpCircle size={15} />
              <span>Рекомендация по экономии</span>
            </div>
            <p className="text-xs text-amber-250 leading-relaxed">
              Не уверены, какой лимит установить? Средний лимит на продукты для семейной пары составляет <span className="font-extrabold text-amber-300">30 000 ₽ / мес</span>, на заправки и такси (Транспорт) — <span className="font-extrabold text-amber-300">6 000 ₽</span>. Постарайтесь уменьшать лимит на развлечения на 10% каждый сезон, отправляя остатки в сберегательный фонд!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
