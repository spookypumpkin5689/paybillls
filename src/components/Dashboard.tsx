import React from 'react';
import { 
  TrendingUp, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Bell, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { Transaction, BudgetLimit, AlertNotification, CategoryType } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  limits: BudgetLimit[];
  notifications: AlertNotification[];
  setActiveTab: (tab: string) => void;
  onDismissNotification: (id: string) => void;
}

export default function Dashboard({
  transactions,
  limits,
  notifications,
  setActiveTab,
  onDismissNotification
}: DashboardProps) {
  
  // Calculations
  const currentMonth = "2026-05";
  
  const currentMonthTransactions = transactions.filter(tx => tx.date.startsWith(currentMonth));
  const totalSpent = currentMonthTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalScans = currentMonthTransactions.length;
  
  const activeAlerts = notifications.filter(n => !n.dismissed && n.type !== 'info');
  
  // Calculate spent per category
  const categoryStats = limits.map(limitObj => {
    const categoryTx = currentMonthTransactions.filter(tx => tx.category === limitObj.category);
    const spent = categoryTx.reduce((sum, tx) => sum + tx.total, 0);
    const percentage = limitObj.limit > 0 ? (spent / limitObj.limit) * 100 : 0;
    return {
      category: limitObj.category,
      limit: limitObj.limit,
      spent,
      percentage: Math.min(percentage, 100).toFixed(0),
      isExceeded: spent > limitObj.limit,
      isNearLimit: spent >= limitObj.limit * 0.85
    };
  });

  // Category Colors helper
  const getCategoryColor = (category: CategoryType) => {
    switch (category) {
      case 'Продукты': return 'bg-emerald-555 text-emerald-700 border-emerald-200';
      case 'Транспорт': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Развлечения': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Коммунальные услуги': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Одежда и Обувь': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Здоровье и Аптека': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Рестораны и Кафе': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getProgressBarColor = (spent: number, limit: number) => {
    const ratio = spent / limit;
    if (ratio >= 1.0) return 'bg-rose-500';
    if (ratio >= 0.85) return 'bg-amber-500';
    return 'bg-indigo-600';
  };

  return (
    <div className="space-y-6">
      {/* Visual Header / Hero section */}
      <div className="bg-white/5 border border-white/10 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-xl">
        <div className="space-y-2 z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Интеллектуальная Бухгалтерия</span>
          <h1 className="text-3xl font-black tracking-tight font-sans text-white">Контроль бюджета под ИИ-контролем</h1>
          <p className="text-slate-300 text-sm max-w-md leading-relaxed">
            Загружайте чеки, устанавливайте лимиты и отслеживайте траты с мгновенным анализом расходов и советами по экономии.
          </p>
        </div>
        <div className="flex gap-3 z-10">
          <button 
            onClick={() => setActiveTab('scanner')} 
            id="hero-scan-btn"
            className="px-5 py-2.5 bg-indigo-600 active:scale-95 transition hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <FileText size={15} /> Сканировать чек
          </button>
          <button 
            onClick={() => setActiveTab('nearby')} 
            id="hero-cheaper-btn"
            className="px-5 py-2.5 bg-white/10 border border-white/10 active:scale-95 transition hover:bg-white/15 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
          >
            Найти дешевле
          </button>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="frosted-panel rounded-3xl p-6 flex items-center gap-5">
          <div className="p-4 bg-indigo-500/15 text-indigo-455 rounded-xl">
            <Coins size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Всего потрачено (Май 2026)</span>
            <span className="text-2xl font-extrabold font-sans tracking-tight text-white">
              {totalSpent.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        <div className="frosted-panel rounded-3xl p-6 flex items-center gap-5">
          <div className="p-4 bg-sky-500/15 text-sky-450 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Загружено чеков за месяц</span>
            <span className="text-2xl font-extrabold font-sans tracking-tight text-white">
              {totalScans} шт.
            </span>
          </div>
        </div>

        <div className={`rounded-3xl p-6 flex items-center gap-5 transition-all duration-300 border ${
          activeAlerts.length > 0 
            ? 'frosted-panel-danger text-rose-200' 
            : 'frosted-panel text-slate-300'
        }`}>
          <div className={`p-4 rounded-xl ${
            activeAlerts.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
          }`}>
            {activeAlerts.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Предупреждения о лимитах</span>
            <span className="text-2xl font-extrabold font-sans tracking-tight text-white">
              {activeAlerts.length} {activeAlerts.length === 1 ? 'предупреждение' : activeAlerts.length > 1 && activeAlerts.length < 5 ? 'предупреждения' : 'предупреждений'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Details: Active Warnings + Category Progress bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Category budget exhaustion lists with sliders indicators */}
        <div className="frosted-panel rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-white">Расходные лимиты</h2>
              <p className="text-xs text-slate-400">Заполненность бюджета по категориям на текущий месяц</p>
            </div>
            <button 
              onClick={() => setActiveTab('settings')} 
              id="dash-edit-limits-btn"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              Настроить лимиты <ArrowRight size={14} className="mt-0.5" />
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {categoryStats.map((stat) => (
              <div key={stat.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 font-semibold">{stat.category}</span>
                    {stat.spent > stat.limit && (
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-md border border-rose-500/30">
                        Превышен!
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs">
                    <span className="font-bold text-white">{stat.spent.toLocaleString('ru-RU')} ₽</span>
                    <span> / {stat.limit.toLocaleString('ru-RU')} ₽ ({stat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(stat.spent, stat.limit)}`}
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Notifications and Alerts feed */}
        <div className="frosted-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-indigo-400" />
                <h2 className="text-base font-bold text-white">Уведомления и оповещения</h2>
              </div>
            </div>

            {/* Notification Lists */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 customs-scrollbar">
              {notifications.filter(n => !n.dismissed).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-slate-600" />
                  <p>Оповещений нет. Все расходы в пределах нормы!</p>
                </div>
              ) : (
                notifications.filter(n => !n.dismissed).map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-2xl flex gap-3 text-sm relative items-start transition-all duration-200 ${
                      item.type === 'danger' 
                        ? 'frosted-panel-danger text-rose-200' 
                        : item.type === 'warning'
                          ? 'frosted-panel-warning text-amber-200'
                          : 'frosted-panel-premium text-indigo-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'danger' && <ShieldAlert size={16} className="text-rose-400" />}
                      {item.type === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
                      {item.type === 'info' && <CheckCircle2 size={16} className="text-emerald-400" />}
                    </div>
                    <div className="space-y-1 flex-1 pr-6">
                      <p className="font-semibold leading-relaxed">{item.message}</p>
                      <span className="text-[10px] text-slate-400/80 block font-mono">
                        {new Date(item.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <button
                      onClick={() => onDismissNotification(item.id)}
                      id={`dismiss-notif-${item.id}`}
                      className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-0.5 hover:bg-white/10 rounded-lg cursor-pointer"
                      title="Скрыть"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="frosted-panel-premium rounded-2xl p-4 flex items-start gap-3">
            <Coins size={18} className="text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-200 space-y-1">
              <p className="font-bold text-white">Интеллектуальный совет бюджета</p>
              <p className="text-indigo-300 leading-relaxed">
                По нашим алгоритмам, в категории «Продукты» ваши траты идут быстрее обычного на 12%. Попробуйте поискать товары со скидками в супермаркетах рядом в нашем поиске цен!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
