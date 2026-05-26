import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  FileText, 
  MapPin, 
  Sliders, 
  TrendingUp, 
  Bell,
  Navigation,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

import { Transaction, CategoryType, BudgetLimit, AlertNotification } from './types';
import Dashboard from './components/Dashboard';
import ReceiptScanner from './components/ReceiptScanner';
import TransactionHistory from './components/TransactionHistory';
import NearbyCheaperSearch from './components/NearbyCheaperSearch';
import BudgetManager from './components/BudgetManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [limits, setLimits] = useState<BudgetLimit[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Initial loading fetchers
  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, limRes, notifRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/limits'),
        fetch('/api/notifications')
      ]);

      const txData = await txRes.json();
      const limData = await limRes.json();
      const notifData = await notifRes.json();

      setTransactions(txData.transactions || []);
      setLimits(limData.budgetLimits || []);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      console.error("Failed to load initial ledger data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Safe refetcher to keep client synchronized with server modifications
  const syncWithServer = async () => {
    setSyncing(true);
    try {
      const [txRes, limRes, notifRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/limits'),
        fetch('/api/notifications')
      ]);

      const txData = await txRes.json();
      const limData = await limRes.json();
      const notifData = await notifRes.json();

      setTransactions(txData.transactions || []);
      setLimits(limData.budgetLimits || []);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      console.error("Failed sync:", err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Event handlers callback passed down to children

  const handleAddTransaction = (newTx: Transaction) => {
    // Add locally to state immediately for extreme responsiveness
    setTransactions(prev => [newTx, ...prev]);
    // Then re-load fully to pull freshly generated server-side alerts/notifications
    syncWithServer();
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        syncWithServer();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLimit = async (category: CategoryType, limit: number) => {
    try {
      const response = await fetch('/api/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, limit })
      });
      if (response.ok) {
        syncWithServer();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/dismiss`, {
        method: 'POST'
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div id="loading-fallback" className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-semibold text-xs text-slate-700">Инициализируем Бухгалтерский баланс...</p>
          <p className="text-[11px] text-slate-400">Считываем локальное хранилище данных.</p>
        </div>
      </div>
    );
  }

  const unreadAlertCount = notifications.filter(n => !n.dismissed && n.type !== 'info').length;

  return (
    <div id="app-root" className="min-h-screen bg-[#080b14] font-sans text-slate-200 flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Ambient background decorative elements */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[110px] pointer-events-none z-0"></div>

      {/* Top Main Navigation Bar */}
      <header className="bg-white/3 border-b border-white/15 sticky top-0 z-30 shadow-lg backdrop-blur-xl relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Branded Logo */}
          <div className="flex items-center gap-2 cursor-pointer z-10" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/35">
              <Coins size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight font-sans">FinFlow AI</span>
              <span className="text-[10px] text-indigo-400 font-bold block leading-none font-mono tracking-wider">УМНАЯ БУХГАЛТЕРИЯ • GEMINI ИИ</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex flex-wrap gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl z-10">
            <button
              onClick={() => setActiveTab('dashboard')}
              id="nav-tab-dashboard"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none transition cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-white/10 border border-white/15 text-white shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp size={13} /> Сводка
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              id="nav-tab-scanner"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none transition cursor-pointer ${
                activeTab === 'scanner' 
                  ? 'bg-white/10 border border-white/15 text-white shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={13} /> Сканировать чек
            </button>
            <button
              onClick={() => setActiveTab('history')}
              id="nav-tab-history"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none transition cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-white/10 border border-white/15 text-white shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet size={13} /> Реестр трат
            </button>
            <button
              onClick={() => setActiveTab('nearby')}
              id="nav-tab-nearby"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none transition relative cursor-pointer ${
                activeTab === 'nearby' 
                  ? 'bg-white/10 border border-white/15 text-white shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={13} /> Поиск цен
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] rounded-md font-bold">
                Map ИИ
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              id="nav-tab-settings"
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none transition relative cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-white/10 border border-white/15 text-white shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders size={13} /> Лимиты
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </button>
          </nav>

        </div>
      </header>

      {/* Main Dynamic View Panels Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10">
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            limits={limits}
            notifications={notifications}
            setActiveTab={setActiveTab}
            onDismissNotification={handleDismissNotification}
          />
        )}

        {activeTab === 'scanner' && (
          <ReceiptScanner
            onAddTransaction={handleAddTransaction}
          />
        )}

        {activeTab === 'history' && (
          <TransactionHistory
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {activeTab === 'nearby' && (
          <NearbyCheaperSearch />
        )}

        {activeTab === 'settings' && (
          <BudgetManager
            limits={limits}
            onUpdateLimit={handleUpdateLimit}
          />
        )}
      </main>

      {/* Decorative Bottom Footer */}
      <footer className="bg-white/3 border-t border-white/10 py-6 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-300">© 2026 FinFlow AI — Бухгалтерский баланс</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Умный ИИ-помощник финансового равновесия для комфортной оптимизации расходов.</p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="font-mono text-indigo-400/80">May 2026 UTC</span>
            <span className="text-white/15">•</span>
            <span className="font-bold text-indigo-300 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">Развернуто на Cloud Run</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
