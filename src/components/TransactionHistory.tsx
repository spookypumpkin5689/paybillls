import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Calendar,
  X,
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Transaction, CategoryType, TransactionItem } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (tx: any) => void;
}

export default function TransactionHistory({
  transactions,
  onDeleteTransaction,
  onAddTransaction
}: TransactionHistoryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  
  // Expanded transactions visual indicators
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});
  
  // Manual transaction builder modal
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualCategory, setManualCategory] = useState<CategoryType>('Продукты');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTotal, setManualTotal] = useState('');
  const [manualComment, setManualComment] = useState('');
  const [manualItems, setManualItems] = useState<{name: string, price: number, quantity: number}[]>([
    { name: '', price: 0, quantity: 1 }
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTxIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter transactions
  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.merchant.toLowerCase().includes(search.toLowerCase()) || 
                          (tx.comment || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleManualItemChange = (index: number, field: string, value: any) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };
    setManualItems(updated);
  };

  const addManualItemRow = () => {
    setManualItems([...manualItems, { name: '', price: 0, quantity: 1 }]);
  };

  const removeManualItemRow = (index: number) => {
    if (manualItems.length > 1) {
      setManualItems(manualItems.filter((_, idx) => idx !== index));
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!manualMerchant || !manualTotal) {
      setFormError("Заполните название магазина и итоговую сумму");
      return;
    }

    const numericTotal = parseFloat(manualTotal);
    if (isNaN(numericTotal) || numericTotal <= 0) {
      setFormError("Итоговая сумма должна быть положительным числом");
      return;
    }

    // Filter initialized manual items or create default
    const processedItems: TransactionItem[] = manualItems
      .filter(i => i.name.trim() !== '')
      .map(i => ({
        name: i.name,
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        total: (Number(i.price) || 0) * (Number(i.quantity) || 1)
      }));

    const finalItems = processedItems.length > 0 
      ? processedItems 
      : [{ name: "Оплата по чеку", price: numericTotal, quantity: 1, total: numericTotal }];

    // Calc check sum
    const itemsSum = finalItems.reduce((acc, i) => acc + i.total, 0);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: manualMerchant,
          category: manualCategory,
          date: manualDate,
          total: processedItems.length > 0 ? itemsSum : numericTotal,
          items: finalItems,
          comment: manualComment
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Не удалось сохранить проводку");
      }

      onAddTransaction(data.transaction);
      setFormSuccess("Транзакция успешно добавлена вручную!");
      
      // Reset State
      setManualMerchant('');
      setManualCategory('Продукты');
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTotal('');
      setManualComment('');
      setManualItems([{ name: '', price: 0, quantity: 1 }]);
      
      setTimeout(() => {
        setShowManualForm(false);
        setFormSuccess(null);
      }, 1000);

    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Helper colors mapping
  const getCategoryTheme = (category: CategoryType) => {
    switch (category) {
      case 'Продукты': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
      case 'Транспорт': return 'bg-sky-500/15 text-sky-300 border-sky-500/20';
      case 'Развлечения': return 'bg-purple-500/15 text-purple-300 border-purple-500/20';
      case 'Коммунальные услуги': return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
      case 'Одежда и Обувь': return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20';
      case 'Здоровье и Аптека': return 'bg-rose-500/15 text-rose-300 border-rose-500/20';
      case 'Рестораны и Кафе': return 'bg-orange-500/15 text-orange-300 border-orange-500/20';
      default: return 'bg-slate-500/15 text-slate-300 border-slate-500/20';
    }
  };

  return (
    <div className="frosted-panel rounded-3xl p-6 shadow-xl backdrop-blur-xl relative z-10 space-y-6">
      
      {/* Search filters and triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Реестр расходов и бухгалтерия</h2>
          <p className="text-xs text-slate-400 mt-1">Поиск по покупкам, фильтр по категориям и выгрузка отчетов</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Download CSV */}
          <a
            href="/api/export-csv"
            id="tx-export-excel-btn"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-md transition"
            title="Экспортировать отчет в формат Excel / CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" /> Экспорт в табл. (CSV)
          </a>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            id="tx-manual-add-btn"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer select-none transition"
          >
            <Plus size={14} /> Внести трату вручную
          </button>
        </div>
      </div>

      {/* Manual Insert Drawer/Block */}
      {showManualForm && (
        <div className="bg-indigo-950/20 border border-indigo-500/20 p-6 rounded-3xl space-y-4 relative transition-all">
          <button 
            onClick={() => setShowManualForm(false)} 
            id="tx-manual-cancel-btn"
            className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer transition"
          >
            <X size={16} />
          </button>
          
          <div className="border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider font-sans">Добавить проводку со спецификацией</h3>
            <p className="text-xs text-slate-400 mt-0.5">Заполните реквизиты совершенной покупки</p>
          </div>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={15} /> <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-555/20 text-emerald-250 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle size={15} /> <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Магазин / Контрагент</label>
                <input
                  type="text"
                  required
                  placeholder="Например, Пятёрочка"
                  value={manualMerchant}
                  onChange={e => setManualMerchant(e.target.value)}
                  className="w-full input-glass rounded-lg px-3 py-2 text-xs font-semibold placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Категория</label>
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value as CategoryType)}
                  className="w-full input-glass rounded-lg px-2 py-2 text-xs font-bold bg-[#0f172a]"
                >
                  <option className="bg-[#0f172a]" value="Продукты font-sans">Продукты</option>
                  <option className="bg-[#0f172a]" value="Транспорт">Транспорт</option>
                  <option className="bg-[#0f172a]" value="Развлечения">Развлечения</option>
                  <option className="bg-[#0f172a]" value="Коммунальные услуги">Коммунальные услуги</option>
                  <option className="bg-[#0f172a]" value="Одежда и Обувь">Одежда и Обувь</option>
                  <option className="bg-[#0f172a]" value="Здоровье и Аптека">Здоровье и Аптека</option>
                  <option className="bg-[#0f172a]" value="Рестораны и Кафе">Рестораны и Кафе</option>
                  <option className="bg-[#0f172a]" value="Другое">Другое</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Дата трат</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full input-glass rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Итоговая Сумма (₽)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Например, 1450"
                  value={manualTotal}
                  onChange={e => setManualTotal(e.target.value)}
                  className="w-full input-glass rounded-lg px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Краткое примечание</label>
              <input
                type="text"
                placeholder="Запись о назначении покупки"
                value={manualComment}
                onChange={e => setManualComment(e.target.value)}
                className="w-full input-glass rounded-lg px-3 py-2 text-xs font-medium placeholder-slate-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Детализация чека</span>
                <button
                  type="button"
                  onClick={addManualItemRow}
                  id="tx-manual-add-row-btn"
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition flex items-center gap-1"
                >
                  <Plus size={10} /> Добавить товарную позицию
                </button>
              </div>

              {manualItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Название продукта / услуги"
                    value={item.name}
                    onChange={e => handleManualItemChange(idx, 'name', e.target.value)}
                    className="flex-1 input-glass rounded-lg px-3 py-1.5 text-xs font-medium placeholder-slate-600"
                  />
                  <input
                    type="number"
                    placeholder="Цена"
                    value={item.price || ''}
                    onChange={e => handleManualItemChange(idx, 'price', parseFloat(e.target.value))}
                    className="w-20 input-glass rounded-lg px-2 py-1.5 text-xs font-mono text-right"
                  />
                  <input
                    type="number"
                    placeholder="Кол"
                    value={item.quantity || ''}
                    onChange={e => handleManualItemChange(idx, 'quantity', parseFloat(e.target.value))}
                    className="w-12 input-glass rounded-lg px-2 py-1.5 text-xs text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeManualItemRow(idx)}
                    id={`tx-manual-del-row-${idx}`}
                    className="text-slate-500 hover:text-rose-500 cursor-pointer p-1 transition"
                    title="Удалить строку"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="tx-manual-submit-btn"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-700/20 transition active:scale-95 cursor-pointer"
              >
                Провести трату
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по продавцу или комментариям..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full input-glass rounded-xl pl-9 pr-4 py-2 text-xs font-sans placeholder-slate-500"
          />
        </div>

        {/* Category select filter */}
        <div className="flex flex-wrap gap-1.5 md:items-center">
          <button 
            onClick={() => setSelectedCategory('All')} 
            id="tx-filter-all-btn"
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              selectedCategory === 'All' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            Все
          </button>
          {['Продукты', 'Транспорт', 'Развлечения', 'Коммунальные услуги', 'Одежда и Обувь', 'Здоровье и Аптека', 'Рестораны и Кафе', 'Другое'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as CategoryType)}
              id={`tx-filter-${cat}-btn`}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Listing table */}
      <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2 shadow-xl">
        <div className="overflow-x-auto customs-scrollbar">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-[#0f172a]/70 text-slate-400 font-bold border-b border-white/10 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4 w-28 text-center">Дата</th>
                <th className="p-4">Продавец / Контрагент</th>
                <th className="p-4">Категория</th>
                <th className="p-4 text-right pr-6">Сумма трат</th>
                <th className="p-4 text-center w-16">Опции</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <FileText size={36} className="mx-auto text-slate-600 mb-2" />
                    По вашему запросу проводок трат не обнаружено.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isExpanded = !!expandedTxIds[tx.id];
                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-white/2 transition-colors">
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleExpand(tx.id)}
                            id={`tx-toggle-expand-${tx.id}`}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
                            title="Детальный чек"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-slate-400 text-center font-semibold">
                          {tx.date}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">{tx.merchant}</span>
                            {tx.comment && (
                              <span className="text-[10px] text-slate-400 mt-1 font-medium">{tx.comment}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase rounded-full border ${getCategoryTheme(tx.category)}`}>
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-white text-sm pr-6">
                          {tx.total.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            id={`tx-delete-${tx.id}`}
                            className="p-2 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-xl active:scale-95 transition cursor-pointer"
                            title="Удалить запись"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expander component with itemized receipt positions */}
                      {isExpanded && (
                        <tr className="bg-[#0f172a]/40 border-l border-indigo-500">
                          <td colSpan={6} className="p-5">
                            <div className="space-y-2 max-w-2xl pl-1">
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Детализация кассового чека</p>
                              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0a0f1d] shadow-inner text-[11px]">
                                <table className="w-full text-left text-slate-300">
                                  <thead className="bg-[#0f172a] text-slate-400 border-b border-white/10 font-bold">
                                    <tr>
                                      <th className="p-2.5 px-3">Наименование товара / услуги</th>
                                      <th className="p-2.5 text-right w-24">Цена</th>
                                      <th className="p-2.5 text-center w-16">Кол-во</th>
                                      <th className="p-2.5 text-right w-24 px-3 text-slate-200">Сумма</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5 font-sans">
                                    {tx.items && tx.items.length > 0 ? (
                                      tx.items.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-white/1 transition">
                                          <td className="p-2.5 px-3 font-semibold text-slate-250">{it.name}</td>
                                          <td className="p-2.5 text-right text-slate-400">{it.price} ₽</td>
                                          <td className="p-2.5 text-center text-slate-400 font-bold">{it.quantity}</td>
                                          <td className="p-2.5 text-right font-bold text-slate-100 px-3">{it.total} ₽</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-500">
                                          Детализированная спецификация по позициям отсутствует
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
