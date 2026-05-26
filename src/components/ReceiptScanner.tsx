import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Undo2,
  RefreshCw
} from 'lucide-react';
import { Transaction, CategoryType, TransactionItem } from '../types';

interface ReceiptScannerProps {
  onAddTransaction: (tx: any) => void;
}

export default function ReceiptScanner({ onAddTransaction }: ReceiptScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Partial<Transaction> | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setPreview(null);
    setFile(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setErrorMessage("Не удалось получить доступ к камере. Убедитесь, что разрешения предоставлены.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas resolutions to match video frame
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPreview(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  // Submit scan to backend Express endpoint
  const handleScanSubmit = async () => {
    if (!preview) return;

    setIsScanning(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/upload-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: preview,
          mimeType: 'image/jpeg'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при распознавании');
      }

      setScanResult(data.transaction);
      if (data.isMock) {
        setSuccessMessage("Демо-распознавание успешно выполнено! Новая транзакция создана.");
      } else {
        setSuccessMessage("ИИ успешно отсканировал чек! Проверьте данные и подтвердите сохранение.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Не удалось отправить чек на распознавание. Попробуйте еще раз.");
    } finally {
      setIsScanning(false);
    }
  };

  // Preset demo choices if user doesn't have a receipt on-hand
  const handleDemoScan = async (demoType: 'grocery' | 'restaurant' | 'utility') => {
    setIsScanning(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setScanResult(null);

    // Simulate standard base64 content
    let demoImageBase64 = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // tiny gif
    setPreview(demoImageBase64);

    try {
      const response = await fetch('/api/upload-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: demoImageBase64,
          mimeType: 'image/gif'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки демо чека');
      }

      setScanResult(data.transaction);
      setSuccessMessage(`Демонстрационный чек "${data.transaction.merchant}" успешно извлечен и добавлен в бухгалтерию!`);
      // Callback to root component to update list
      onAddTransaction(data.transaction);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Approve parsed items and save transaction
  const handleSaveTransaction = () => {
    if (!scanResult) return;
    onAddTransaction(scanResult);
    setSuccessMessage("Проводка успешно зафиксирована в реестр!");
    // reset state
    setFile(null);
    setPreview(null);
    setScanResult(null);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setScanResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    stopCamera();
  };

  return (
    <div className="frosted-panel rounded-3xl p-6 space-y-6 shadow-xl relative backdrop-blur-xl z-10">
      <div className="border-b border-white/10 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Распознавание и сканирование чеков ИИ</h2>
          <p className="text-xs text-slate-400 mt-1">
            Сделайте снимок или загрузите фото чека — ИИ автоматически разобьет товары по позициям и распределит по категориям бюджета
          </p>
        </div>
        {(preview || isCameraActive) && (
          <button 
            onClick={handleReset} 
            id="scan-reset-top-btn"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 active:scale-95 cursor-pointer font-bold transition"
          >
            <Undo2 size={14} /> Начать заново
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Image upload, webcam snapshot, triggers */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Status Display Banners */}
          {errorMessage && (
            <div className="p-3 frosted-panel-danger rounded-2xl text-rose-200 text-xs flex gap-2 items-center">
              <AlertCircle size={16} className="text-rose-450 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 frosted-panel-success rounded-2xl text-emerald-200 text-xs flex gap-2 items-center">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {!preview && !isCameraActive && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/15 hover:border-indigo-500 bg-white/2 rounded-3xl p-8 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center space-y-4 group min-h-[280px]"
            >
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full group-hover:scale-110 transition-transform">
                <UploadCloud size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-200">Перетащите сюда фото чека</p>
                <p className="text-xs text-slate-400">Поддерживаются JPEG, PNG, WEBP до 10мб</p>
              </div>
              <div className="flex gap-2 w-full max-w-xs pt-2">
                <label className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer text-center active:scale-95 transition">
                  Выбрать файл
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <button 
                  onClick={startCamera} 
                  id="scan-cam-start-btn"
                  className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Camera size={14} /> Сделать фото
                </button>
              </div>
            </div>
          )}

          {/* Camera Viewfinder */}
          {isCameraActive && (
            <div className="relative border border-white/10 bg-slate-950 rounded-2xl overflow-hidden aspect-video flex flex-col justify-between">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover transform rotate-0" 
                playsInline 
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                <button 
                  onClick={capturePhoto} 
                  id="scan-cam-capture-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md active:scale-95 transition cursor-pointer"
                >
                  Сделать снимок
                </button>
                <button 
                  onClick={stopCamera} 
                  id="scan-cam-stop-btn"
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-lg active:scale-95 transition cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Captured / Uploaded Image Preview */}
          {preview && !isCameraActive && (
            <div className="space-y-3">
              <div className="relative border border-white/10 rounded-3xl overflow-hidden bg-white/2 max-h-[320px] flex items-center justify-center p-2">
                <img src={preview} alt="Receipt preview" className="max-w-full max-h-[300px] object-contain rounded-xl shadow-sm" />
                <div className="absolute top-4 right-4 flex gap-1">
                  <button 
                    onClick={handleReset} 
                    id="scan-preview-delete-btn"
                    className="p-2 bg-slate-950/80 hover:bg-rose-600 text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                    title="Удалить снимок"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {!scanResult && (
                <button
                  onClick={handleScanSubmit}
                  id="scan-submit-image-btn"
                  disabled={isScanning}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:bg-white/5 disabled:text-slate-500 active:scale-98 transition cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Распознавание позиций ИИ...
                    </>
                  ) : (
                    <>
                      <FileText size={16} /> Начать ИИ-распознавание чека
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Quick simulation buttons for effortless onboarding */}
          <div className="bg-indigo-950/10 p-4 border border-indigo-500/15 rounded-3xl space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block">Быстрый тест без реального чека:</span>
            <p className="text-slate-400 text-xs">
              Нажмите одну из тестовых кнопок, чтобы скопировать реальное поведение распознавания чеков нейросетью:
            </p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleDemoScan('grocery')} 
                disabled={isScanning}
                id="scan-demo-grocery-btn"
                className="px-3 py-2 bg-white/5 border border-white/10 hover:border-indigo-500 text-slate-200 font-bold text-[11px] rounded-xl shadow-2xs cursor-pointer disabled:opacity-50 transition"
              >
                🛒 Сетевой Магнит (1171 ₽)
              </button>
              <button 
                onClick={() => handleDemoScan('restaurant')} 
                disabled={isScanning}
                id="scan-demo-sushi-btn"
                className="px-3 py-2 bg-white/5 border border-white/10 hover:border-indigo-500 text-slate-200 font-bold text-[11px] rounded-xl shadow-2xs cursor-pointer disabled:opacity-50 transition"
              >
                🍣 Суши ресторан (2530 ₽)
              </button>
              <button 
                onClick={() => handleDemoScan('utility')} 
                disabled={isScanning}
                id="scan-demo-hm-btn"
                className="px-3 py-2 bg-white/5 border border-white/10 hover:border-indigo-500 text-slate-200 font-bold text-[11px] rounded-xl shadow-2xs cursor-pointer disabled:opacity-50 transition"
              >
                💊 Аптека Неофарм (1710 ₽)
              </button>
            </div>
          </div>

        </div>

        {/* Right column: Extracted Details edit & preview form */}
        <div className="lg:col-span-7">
          {isScanning ? (
            <div className="h-full border border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 bg-white/1 min-h-[360px] space-y-4">
              <Loader2 size={40} className="text-indigo-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="font-bold text-white text-sm">Считываем реквизиты чека...</p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mx-auto">
                  Мы отправляем изображение ИИ. Модель считывает ФН/ФД/ФП, структуру товарных строк, подсчитывает стоимость и выделяет категорию бюджета.
                </p>
              </div>
            </div>
          ) : scanResult ? (
            <div className="border border-indigo-500/15 bg-indigo-500/5 rounded-3xl p-6 space-y-5">
              <div className="border-b border-indigo-550/15 pb-3 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Распознанные позиции</h3>
                <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-full uppercase font-mono">
                  Получено от Gemini
                </span>
              </div>

              {/* Vendor & Dates headers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Продавец / Магазин</label>
                  <input 
                    type="text" 
                    value={scanResult.merchant || ''} 
                    onChange={e => setScanResult({...scanResult, merchant: e.target.value})}
                    className="w-full input-glass rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Категория</label>
                  <select
                    value={scanResult.category || 'Другое'}
                    onChange={e => setScanResult({...scanResult, category: e.target.value as CategoryType})}
                    className="w-full input-glass rounded-lg px-2 py-2 text-xs font-bold bg-[#0f172a]"
                  >
                    <option className="bg-[#0f172a] text-white" value="Продукты">Продукты</option>
                    <option className="bg-[#0f172a] text-white" value="Транспорт">Транспорт</option>
                    <option className="bg-[#0f172a] text-white" value="Развлечения">Развлечения</option>
                    <option className="bg-[#0f172a] text-white" value="Коммунальные услуги">Коммунальные услуги</option>
                    <option className="bg-[#0f172a] text-white" value="Одежда и Обувь">Одежда и Обувь</option>
                    <option className="bg-[#0f172a] text-white" value="Здоровье и Аптека">Здоровье и Аптека</option>
                    <option className="bg-[#0f172a] text-white" value="Рестораны и Кафе">Рестораны и Кафе</option>
                    <option className="bg-[#0f172a] text-white" value="Другое">Другое</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Дата покупки</label>
                  <input 
                    type="date" 
                    value={scanResult.date || ''} 
                    onChange={e => setScanResult({...scanResult, date: e.target.value})}
                    className="w-full input-glass rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Комментарий</label>
                  <input 
                    type="text" 
                    value={scanResult.comment || ''} 
                    onChange={e => setScanResult({...scanResult, comment: e.target.value})}
                    placeholder="Добавить заметки"
                    className="w-full input-glass rounded-lg px-3 py-2 text-xs font-semibold placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Items details table */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Товарные позиции</label>
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2 text-xs text-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-[#0f172a]/80 text-slate-400 font-bold border-b border-white/10">
                      <tr>
                        <th className="p-3">Наименование</th>
                        <th className="p-3 text-right w-20 px-4">Цена</th>
                        <th className="p-3 text-center w-12">Кол-во</th>
                        <th className="p-3 text-right w-20 px-4">Итого</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {scanResult.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/2 transition">
                          <td className="p-3 font-semibold text-slate-200">{item.name}</td>
                          <td className="p-3 text-right text-slate-400 px-4">{item.price} ₽</td>
                          <td className="p-3 text-center text-slate-400">{item.quantity}</td>
                          <td className="p-3 text-right font-bold text-slate-100 px-4">{item.total} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Row */}
              <div className="bg-white/4 border border-white/10 p-4 rounded-2xl flex justify-between items-center text-white">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Итоговая сумма чека</span>
                <span className="text-2xl font-black">
                  {scanResult.total?.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Save Controls */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTransaction}
                  id="scan-approve-save-btn"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-700/20 text-center active:scale-95 transition cursor-pointer"
                >
                  Утвердить чек и сохранить расходы
                </button>
                <button
                  onClick={handleReset}
                  id="scan-decline-cancel-btn"
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs rounded-xl active:scale-95 transition cursor-pointer"
                >
                  Сбросить
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full border border-white/10 rounded-3xl border-dashed flex flex-col items-center justify-center p-8 bg-white/1 min-h-[360px] text-center space-y-4">
              <FileText size={32} className="text-slate-600" />
              <div className="space-y-1">
                <p className="font-bold text-slate-350 text-xs">Данные распознавания пусты</p>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Загрузите чек в левом поле или утилизируйте эмулятор быстрого распознавания для мгновенного теста.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
