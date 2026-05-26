import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  Navigation,
  HelpCircle,
  HelpCircle as QuestionIcon,
  Store,
  Compass
} from 'lucide-react';
import { NearbyStore } from '../types';

export default function NearbyCheaperSearch() {
  const [product, setProduct] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Results
  const [groundingText, setGroundingText] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [fallbackStores, setFallbackStores] = useState<NearbyStore[]>([]);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successLocate, setSuccessLocate] = useState(false);

  // Quick select items
  const quickItems = ["Молоко", "Хлеб", "Яйца", "Сыр", "Лекарства", "Кроссовки", "Кофе"];

  // Fetch coordinates from browser Geolocation
  const handleGetLocation = () => {
    setIsLocating(true);
    setErrorMessage(null);
    setSuccessLocate(false);

    if (!navigator.geolocation) {
      setErrorMessage("Геолокация не поддерживается вашим браузером");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
        setSuccessLocate(true);
      },
      (error) => {
        console.error("Geolocation error:", error);
        // User denied or timeout
        setErrorMessage("Не удалось определить геолокацию. Будем использовать координаты по умолчанию (Москва).");
        setLatitude(55.7558);
        setLongitude(37.6173);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearchCheaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) {
      setErrorMessage("Укажите наименование товара для сравнения цен");
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setGroundingText(null);
    setGroundingChunks([]);
    setFallbackStores([]);

    // If coordinates are not loaded, call GPS silently or use default
    let currentLat = latitude;
    let currentLon = longitude;
    if (!currentLat || !currentLon) {
      currentLat = 55.7558;
      currentLon = 37.6173;
    }

    try {
      const response = await fetch('/api/nearby-cheaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          latitude: currentLat,
          longitude: currentLon
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка соединения при проверке цен");
      }

      setGroundingText(data.groundingText || '');
      
      if (data.groundingChunks) {
        setGroundingChunks(data.groundingChunks);
      }
      
      if (data.stores) {
        setFallbackStores(data.stores);
      }

    } catch (err: any) {
      setErrorMessage(err.message || "Не удалось загрузить результаты сравнения цен");
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickClick = (item: string) => {
    setProduct(item);
  };

  return (
    <div className="frosted-panel rounded-3xl p-6 shadow-xl backdrop-blur-xl relative z-10 space-y-6">
      
      {/* Tab Info */}
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-xl font-bold text-white">Поиск выгодных цен в магазинах рядом</h2>
        <p className="text-xs text-slate-400 mt-1">
          Введите название товара и разрешите доступ к геопозиции, чтобы ИИ нашел самые экономные супермаркеты, аптеки и рынки в пешей доступности
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Search Controls */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Location setup tracker */}
          <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3 shadow-md">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} className="text-indigo-400" /> Ваша геопозиция
              </span>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                id="geo-locate-btn"
                className="px-2.5 py-1 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 font-bold text-[11px] text-indigo-200 rounded-lg active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {isLocating ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                Определить GPS
              </button>
            </div>

            {latitude && longitude ? (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-200 font-mono space-y-1">
                <p>Широта (Lat): <span className="font-bold text-white">{latitude.toFixed(6)}</span></p>
                <p>Долгота (Lng): <span className="font-bold text-white">{longitude.toFixed(6)}</span></p>
                <p className="text-[10px] text-indigo-300 font-sans mt-1">✓ Точка успешно привязана к геолокатору браузера.</p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Координаты не заданы. Поиск будет проводиться по центру города. Рекомендуем нажать «Определить GPS» для точного радиуса.
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSearchCheaper} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Какой товар вы ищете?</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Например, Яйца десяток или Аспирин..."
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  className="w-full input-glass rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Quick Suggestions list */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Популярные запросы:</label>
              <div className="flex flex-wrap gap-1.5">
                {quickItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleQuickClick(item)}
                    id={`geo-quick-${item}`}
                    className="px-2.5 py-1 text-[11px] font-bold border border-white/5 bg-white/5 hover:bg-white/12 text-slate-300 rounded-lg cursor-pointer transition-all duration-150"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              id="geo-search-submit-btn"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-650/35 cursor-pointer select-none transition active:scale-98 disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Опрашиваем геоданные ИИ...
                </>
              ) : (
                <>
                  <Navigation size={14} /> Найти самый дешевый вариант
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-xs flex gap-2 items-center">
              <AlertCircle size={15} className="text-rose-450 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Advice cards */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl">
            <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1">Как ИИ подбирает выгоду?</h4>
            <p className="text-xs text-amber-250 leading-relaxed font-sans font-medium">
              Gemini считывает ваши координаты GPS, делает интеллектуальный гео-поиск по базам данных Google Maps, находит сетевые дискаунтеры («ДА!», «Магнит», «Чижик»), сравнивает их отзывы и доступность товара, предоставляя готовые ссылки на карты.
            </p>
          </div>

        </div>

        {/* Right Search Results */}
        <div className="lg:col-span-7">
          
          {isSearching ? (
            <div className="h-full border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 bg-white/2 min-h-[380px] space-y-4 text-center backdrop-blur-md">
              <Loader2 size={40} className="text-indigo-400 animate-spin" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">Сканируем ближайшие окрестности...</p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mt-1">
                  Используя Google Maps Grounding, ИИ измеряет пешие расстояния и выбирает аптечные и продовольственные прилавки с лучшей ценовой политикой.
                </p>
              </div>
            </div>
          ) : groundingText ? (
            <div className="border border-indigo-500/25 bg-indigo-950/10 rounded-3xl p-6 space-y-5">
              
              {/* Grounding markdown section */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm border-b border-white/10 pb-2">Результаты сравнения цен ИИ</h3>
                
                <div className="text-xs text-slate-200 leading-relaxed space-y-2 whitespace-pre-wrap font-sans font-medium">
                  {groundingText}
                </div>
              </div>

              {/* Suggestions Cards explicitly */}
              {fallbackStores.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Рекомендованные точки продаж на интерактивной карте:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fallbackStores.map((store, i) => (
                      <div key={i} className="bg-white/3 border border-white/8 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-md hover:border-indigo-500/35 transition">
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <Store size={15} className="text-indigo-400 mt-0.5 shrink-0" />
                            <h5 className="font-bold text-white text-xs leading-snug">{store.name}</h5>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{store.address}</p>
                          {store.productPrice && (
                            <p className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md inline-block">
                              {store.productPrice}
                            </p>
                          )}
                        </div>

                        {store.mapsUrl && (
                          <a
                            href={store.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            id={`maps-external-${i}`}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-end gap-1 cursor-pointer transition border-t border-white/5 pt-2 mt-2"
                          >
                            Посмотреть маршрут <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounding Attribution & links (MANDATORY per gemini-api skill instructions) */}
              {groundingChunks && groundingChunks.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block font-mono">Источники и привязка к картам:</span>
                  <div className="flex flex-wrap gap-2">
                    {groundingChunks.map((chunk: any, index: number) => {
                      if (chunk.web?.uri) {
                        return (
                          <a
                            key={index}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            id={`chunk-web-${index}`}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-indigo-300 rounded-lg flex items-center gap-1 border border-white/8 cursor-pointer transition"
                          >
                            <span>{chunk.web.title || `Источник ${index+1}`}</span>
                            <ExternalLink size={8} />
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full border border-white/10 rounded-2xl border-dashed flex flex-col items-center justify-center p-8 bg-white/2 min-h-[380px] text-center space-y-3 backdrop-blur-xs">
              <MapPin size={32} className="text-slate-500" />
              <div className="space-y-1">
                <p className="font-bold text-slate-300 text-xs uppercase tracking-wider font-mono">Данные поиска пусты</p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed mt-1">
                  Будь то туалетная бумага, хлеб или дорогое лекарство, введите запрос слева, зафиксируйте пешеходный радиус геолокации и найдите самую низкую цену поблизости.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
