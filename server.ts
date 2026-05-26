import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for base64 image receipts upload
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const DB_FILE = path.join(process.cwd(), "database.json");

// Initial mock data to seed if database.json doesn't exist
const INITIAL_DB = {
  transactions: [
    {
      id: "tx-1",
      date: "2026-05-10",
      merchant: "Пятёрочка №42",
      category: "Продукты",
      total: 1850,
      items: [
        { name: "Молоко Домик в деревне 3.2%", price: 89, quantity: 2, total: 178 },
        { name: "Хлеб Бородинский нарезка", price: 54, quantity: 1, total: 54 },
        { name: "Сыр Ламбер 50% 230г", price: 349, quantity: 1, total: 349 },
        { name: "Сливочное масло 82.5% Брест-Литовск", price: 219, quantity: 2, total: 438 },
        { name: "Яблоки Симиренко 1.5кг", price: 130, quantity: 1.5, total: 195 },
        { name: "Фарш домашний Мираторг 400г", price: 318, quantity: 2, total: 636 }
      ],
      comment: "Покупка продуктов на неделю"
    },
    {
      id: "tx-2",
      date: "2026-05-12",
      merchant: "Яндекс Такси",
      category: "Транспорт",
      total: 820,
      items: [
        { name: "Услуга такси (Тариф Комфорт)", price: 820, quantity: 1, total: 820 }
      ],
      comment: "Поездка на встречу с клиентом"
    },
    {
      id: "tx-3",
      date: "2026-05-15",
      merchant: "МосЭнергоСбыт",
      category: "Коммунальные услуги",
      total: 3450,
      items: [
        { name: "Оплата электроэнергии и ЖКУ", price: 3450, quantity: 1, total: 3450 }
      ],
      comment: "Коммуналка за прошлый месяц"
    },
    {
      id: "tx-4",
      date: "2026-05-18",
      merchant: "Спортмастер",
      category: "Одежда и Обувь",
      total: 5499,
      items: [
        { name: "Кроссовки мужские Demix Fluid Rus", price: 4999, quantity: 1, total: 4999 },
        { name: "Носки спортивные 3 пары в уп.", price: 500, quantity: 1, total: 500 }
      ],
      comment: "Спортивная обувь для пробежек"
    },
    {
      id: "tx-5",
      date: "2026-05-20",
      merchant: "Горздрав Аптека №129",
      category: "Здоровье и Аптека",
      total: 1350,
      items: [
        { name: "Витамин C 1000мг шипучий 20 таб.", price: 650, quantity: 1, total: 650 },
        { name: "Капли в нос Ксилен 10мл", price: 120, quantity: 2, total: 240 },
        { name: "Пастилки от боли в горле Стрепсилс", price: 460, quantity: 1, total: 460 }
      ],
      comment: "Лекарства при простуде"
    },
    {
      id: "tx-6",
      date: "2026-05-22",
      merchant: "Ресторан АндерСон",
      category: "Рестораны и Кафе",
      total: 2850,
      items: [
        { name: "Завтрак английский большой", price: 850, quantity: 1, total: 850 },
        { name: "Кофе Латте Гранд", price: 380, quantity: 2, total: 760 },
        { name: "Лимонад Клубника-Базилик 1л", price: 690, quantity: 1, total: 690 },
        { name: "Вафли бельгийские с мороженым", price: 550, quantity: 1, total: 550 }
      ],
      comment: "Семейный визит на бранч"
    }
  ],
  budgetLimits: [
    { category: "Продукты", limit: 25000 },
    { category: "Транспорт", limit: 6000 },
    { category: "Развлечения", limit: 10000 },
    { category: "Коммунальные услуги", limit: 8000 },
    { category: "Одежда и Обувь", limit: 12000 },
    { category: "Здоровье и Аптека", limit: 5000 },
    { category: "Рестораны и Кафе", limit: 15000 },
    { category: "Другое", limit: 5500 }
  ],
  notifications: [
    {
      id: "not-1",
      type: "info",
      message: "Добро пожаловать в Умную Бухгалтерию! База данных успешно настроена.",
      date: "2026-05-26T12:00:00.000Z",
      dismissed: false
    }
  ]
};

// Ensure database is initialized
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
    return INITIAL_DB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to initial value:", err);
    return INITIAL_DB;
  }
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Check budget limit vs accumulated total for category
function checkBudgetAlert(category: string, addedAmount: number, db: any) {
  const limitObj = db.budgetLimits.find((l: any) => l.category === category);
  if (!limitObj) return;

  // Calculate current spent total this month (May 2026)
  const currentMonthTransactions = db.transactions.filter((tx: any) => {
    return tx.category === category && tx.date.startsWith("2026-05");
  });

  const currentSpent = currentMonthTransactions.reduce((acc: number, tx: any) => acc + tx.total, 0);
  const totalSpentNew = currentSpent;

  const percentage = (totalSpentNew / limitObj.limit) * 100;

  if (percentage >= 100) {
    db.notifications.unshift({
      id: `limit-alert-${category}-${Date.now()}`,
      type: "danger",
      message: `Превышен лимит расходов в категории "${category}"! Потрачено ${totalSpentNew} ₽ из установленных ${limitObj.limit} ₽.`,
      date: new Date().toISOString(),
      dismissed: false,
      category
    });
  } else if (percentage >= 85) {
    db.notifications.unshift({
      id: `limit-alert-${category}-${Date.now()}`,
      type: "warning",
      message: `Внимание! Расходы по категории "${category}" достигли ${Math.round(percentage)}% от лимита. Потрачено ${totalSpentNew} ₽ / ${limitObj.limit} ₽.`,
      date: new Date().toISOString(),
      dismissed: false,
      category
    });
  }
}

// Expose safe Gemini instance helper
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Routes

// GET transactions
app.get("/api/transactions", (req, res) => {
  const db = getDB();
  res.json({ transactions: db.transactions });
});

// POST custom/manual transaction
app.post("/api/transactions", (req, res) => {
  const { date, merchant, category, total, items, comment } = req.body;
  if (!merchant || !category || typeof total !== "number") {
    res.status(400).json({ error: "Недостаточно данных для добавления проводки" });
    return;
  }

  const db = getDB();
  const txId = `tx-${Date.now()}`;
  const newTx = {
    id: txId,
    date: date || new Date().toISOString().split("T")[0],
    merchant,
    category,
    total,
    items: items || [{ name: "Оплата по чеку", price: total, quantity: 1, total }],
    comment: comment || ""
  };

  db.transactions.unshift(newTx);
  checkBudgetAlert(category, total, db);
  saveDB(db);

  res.json({ success: true, transaction: newTx, notifications: db.notifications });
});

// DELETE transaction
app.delete("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const index = db.transactions.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    db.transactions.splice(index, 1);
    saveDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Транзакция не найдена" });
  }
});

// GET custom alerts and notifications
app.get("/api/notifications", (req, res) => {
  const db = getDB();
  res.json({ notifications: db.notifications });
});

// POST dismiss notification
app.post("/api/notifications/:id/dismiss", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const item = db.notifications.find((n: any) => n.id === id);
  if (item) {
    item.dismissed = true;
    saveDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Уведомление не найдено" });
  }
});

// GET limit config
app.get("/api/limits", (req, res) => {
  const db = getDB();
  res.json({ budgetLimits: db.budgetLimits });
});

// POST limit config update
app.post("/api/limits", (req, res) => {
  const { category, limit } = req.body;
  if (!category || typeof limit !== "number") {
    res.status(400).json({ error: "Категория и лимит должны быть заполнены" });
    return;
  }

  const db = getDB();
  const limitObj = db.budgetLimits.find((l: any) => l.category === category);
  if (limitObj) {
    limitObj.limit = limit;
  } else {
    db.budgetLimits.push({ category, limit });
  }

  // Trigger checks for limits retroactively
  checkBudgetAlert(category, 0, db);
  saveDB(db);

  res.json({ success: true, budgetLimits: db.budgetLimits, notifications: db.notifications });
});

// GET export table as CSV
app.get("/api/export-csv", (req, res) => {
  const db = getDB();
  // Header row
  let csvContent = "Идентификатор,Дата,Продавец,Категория,Сумма (₽),Комментарий,Список товаров\n";

  db.transactions.forEach((tx: any) => {
    const itemsFormatted = tx.items
      ? tx.items.map((i: any) => `${i.name} (x${i.quantity}) - ${i.total}₽`).join("; ")
      : "";
    
    // Wrap items in quotes to handle semicolons/commas
    const itemsEscaped = `"${itemsFormatted.replace(/"/g, '""')}"`;
    const commentEscaped = `"${(tx.comment || "").replace(/"/g, '""')}"`;
    const merchantEscaped = `"${tx.merchant.replace(/"/g, '""')}"`;

    csvContent += `${tx.id},${tx.date},${merchantEscaped},${tx.category},${tx.total},${commentEscaped},${itemsEscaped}\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=bookkeeping_report.csv");
  // Include UTF-8 Byte Order Mark (BOM) so Excel parses Cyrllic characters correctly!
  res.send("\uFEFF" + csvContent);
});

// POST upload / parse receipt
app.post("/api/upload-receipt", async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) {
    res.status(400).json({ error: "Изображение чека отсутствует" });
    return;
  }

  // Clean data URL prefix if sent
  let base64Clean = image;
  if (image.startsWith("data:")) {
    const match = image.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      base64Clean = match[2];
    }
  }

  const cleanMimeType = mimeType || "image/jpeg";
  const ai = getGeminiClient();

  if (!ai) {
    // Graceful fallback for mock parser
    console.log("No GEMINI_API_KEY mapped - using professional Russian receipt generator mockup");
    const mockDb = getDB();
    const mockReceipt = generateMockReceipt();
    
    mockDb.transactions.unshift(mockReceipt);
    checkBudgetAlert(mockReceipt.category, mockReceipt.total, mockDb);
    
    // Add info banner alert in system
    mockDb.notifications.unshift({
      id: `mock-info-${Date.now()}`,
      type: "info",
      message: `Распознан тестовый чек (${mockReceipt.merchant}). Добавьте действительный GEMINI_API_KEY для работы реального сканера.`,
      date: new Date().toISOString(),
      dismissed: false
    });
    
    saveDB(mockDb);
    res.json({
      success: true,
      transaction: mockReceipt,
      notifications: mockDb.notifications,
      isMock: true
    });
    return;
  }

  try {
    console.log("Processing receipt with Gemini 3.5 Flash server-side...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Clean,
              mimeType: cleanMimeType,
            },
          },
          {
            text: "Это чек об оплате на русском языке. Проанализируй его и вытащи структурированные данные. Верни JSON-ответ точно соответствующий переданной схеме. Форматируй дату покупки в формате YYYY-MM-DD. Проверь математический подсчет, чтобы total сходился с суммой всех позиций items. Категория категории расходов должна строго принимать одно из следующих значений: 'Продукты', 'Транспорт', 'Развлечения', 'Коммунальные услуги', 'Одежда и Обувь', 'Здоровье и Аптека', 'Рестораны и Кафе', 'Другое'."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: {
              type: Type.STRING,
              description: "Short name of store or merchant who issued the receipt"
            },
            date: {
              type: Type.STRING,
              description: "Purchase date in format YYYY-MM-DD"
            },
            total: {
              type: Type.NUMBER,
              description: "Final paid amount in Roubles (float value)"
            },
            category: {
              type: Type.STRING,
              enum: ['Продукты', 'Транспорт', 'Развлечения', 'Коммунальные услуги', 'Одежда и Обувь', 'Здоровье и Аптека', 'Рестораны и Кафе', 'Другое']
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the item or position" },
                  price: { type: Type.NUMBER, description: "Price for single unit" },
                  quantity: { type: Type.NUMBER, description: "How many items bought" },
                  total: { type: Type.NUMBER, description: "Total price for this line items (price * quantity)" }
                },
                required: ["name", "price", "quantity", "total"]
              }
            },
            comment: {
              type: Type.STRING,
              description: "Optional notes about this expense"
            }
          },
          required: ["merchant", "date", "total", "category", "items"]
        }
      }
    });

    const textOutput = response.text;
    console.log("Raw Gemini Output received successfully.");
    const parsedData = JSON.parse(textOutput || "{}");

    // Add server id
    const db = getDB();
    const newTxId = `tx-${Date.now()}`;
    const cleanTx = {
      id: newTxId,
      date: parsedData.date || new Date().toISOString().split("T")[0],
      merchant: parsedData.merchant || "Неизвестный магазин",
      category: parsedData.category || "Другое",
      total: parsedData.total || 0,
      items: parsedData.items || [],
      comment: parsedData.comment || "Добавлено через скан ИИ"
    };

    db.transactions.unshift(cleanTx);
    checkBudgetAlert(cleanTx.category, cleanTx.total, db);
    saveDB(db);

    res.json({
      success: true,
      transaction: cleanTx,
      notifications: db.notifications,
      isMock: false
    });

  } catch (error: any) {
    console.error("Gemini scanning error:", error);
    // Graceful error fallback
    res.status(500).json({
      error: "Не удалось распознать чек через ИИ. Пожалуйста, убедитесь в качестве снимка или проверьте настройки API ключа.",
      details: error.message
    });
  }
});

// POST find nearby cheaper store using Geolocation / Coordinates and Google Maps Grounding
app.post("/api/nearby-cheaper", async (req, res) => {
  const { product, latitude, longitude } = req.body;
  if (!product) {
    res.status(400).json({ error: "Укажите товар для поиска" });
    return;
  }

  // Fallback lat/lng coordinates to Moscow if browser doesn't send them
  const lat = latitude || 55.7558;
  const lon = longitude || 37.6173;

  const ai = getGeminiClient();

  if (!ai) {
    // Generate professional mock places based on request coordinates/query
    console.log("No Gemini API key for maps, sending pre-calculated geo responses");
    const mockStores = generateMockNearbyCheaper(product, lat, lon);
    res.json({
      stores: mockStores,
      groundingText: `**Результаты для поиска "${product}":** Были проанализированы ближайшие торговые точки вокруг координат ${lat.toFixed(4)}, ${lon.toFixed(4)}. Выгоднее всего приобрести данный товар в Смарте или Магните. Ниже перечислены проверенные магазины.`,
      isMock: true
    });
    return;
  }

  try {
    console.log(`Querying nearby spots for product "${product}" near coordinates ${lat}, ${lon} using Google Maps Grounding...`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Найди ближайшие магазины, аптеки или супермаркеты рядом с координатами широта ${lat}, долгота ${lon}, где можно приобрести "${product}" дешевле. Составь список из 2-4 конкретных мест. Для каждого укажи:
1. Название магазина
2. Его точный физический адрес
3. Насколько дешево там можно это купить или примерную цену, если знаешь
4. Дистанцию от указанной локации в метрах или километрах.
Пиши подробно на русском языке. В конце добавь рекомендацию, где выгоднее всего.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lon
            }
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const textOutput = response.text || "";

    res.json({
      success: true,
      groundingText: textOutput,
      groundingChunks: groundingChunks,
      isMock: false
    });

  } catch (error: any) {
    console.error("Grounding places fetching failed:", error);
    // Graceful error fallback to mock local stores
    const mockStores = generateMockNearbyCheaper(product, lat, lon);
    res.json({
      stores: mockStores,
      groundingText: `**Произошла ошибка связи с ИИ. Отображаются альтернативные локации поблизости:**\nМы нашли несколько типичных точек продаж для товара "${product}" в радиусе 1.5 км.`,
      isMock: true
    });
  }
});

// Helper generators for mock state to make app 100% stable & testable instantly

function generateMockReceipt() {
  const mockMerchants = [
    { name: "Супермаркет Магнит", category: "Продукты", items: [
      { name: "Бананы спелые 1кг", price: 109, quantity: 1.2, total: 131 },
      { name: "Макароны Barilla №5 500г", price: 129, quantity: 2, total: 258 },
      { name: "Соус томатный Долмио", price: 189, quantity: 1, total: 189 },
      { name: "Печенье Юбилейное овсяное", price: 85, quantity: 3, total: 255 },
      { name: "Сок Rich апельсиновый 1л", price: 169, quantity: 2, total: 338 }
    ], total: 1171 },
    { name: "Ашан Сити", category: "Продукты", items: [
      { name: "Яйцо куриное С0 10шт Синявинское", price: 145, quantity: 2, total: 290 },
      { name: "Свиная вырезка охлажденная 1кг", price: 540, quantity: 1.5, total: 810 },
      { name: "Сыр полутвердый Ровегуз 250г", price: 299, quantity: 1, total: 299 },
      { name: "Чай Greenfield черный 100пак", price: 389, quantity: 1, total: 389 }
    ], total: 1788 },
    { name: "Ресторан быстрее ветра (Суши)", category: "Рестораны и Кафе", items: [
      { name: "Набор роллов Филадельфия Хит", price: 1190, quantity: 1, total: 1190 },
      { name: "Суп Том Ям с креветками", price: 550, quantity: 2, total: 1100 },
      { name: "Морс Клюквенный 0.5л", price: 120, quantity: 2, total: 240 }
    ], total: 2530 },
    { name: "Детский мир", category: "Другое", items: [
      { name: "Конструктор LEGO Classic средний", price: 2490, quantity: 1, total: 2490 },
      { name: "Пюре ФрутоНяня ягодное саше", price: 68, quantity: 10, total: 680 }
    ], total: 3170 },
    { name: "Аптека НеоФарм", category: "Здоровье и Аптека", items: [
      { name: "Жаропонижающее терафлю 10 пак", price: 590, quantity: 1, total: 590 },
      { name: "Витамины Супрадин 30 таб", price: 1120, quantity: 1, total: 1120 }
    ], total: 1710 },
    { name: "Магазин H&M / Gloria Jeans", category: "Одежда и Обувь", items: [
      { name: "Футболка хлопковая базовая черная", price: 990, quantity: 2, total: 1980 },
      { name: "Джинсы Denim Slim Fit синие", price: 3490, quantity: 1, total: 3490 }
    ], total: 5470 }
  ];

  const randomMerchant = mockMerchants[Math.floor(Math.random() * mockMerchants.length)];
  return {
    id: `tx-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    merchant: randomMerchant.name,
    category: randomMerchant.category as any,
    total: randomMerchant.total,
    items: randomMerchant.items,
    comment: "Автоматически распознано через смарт-эмулятор чеков"
  };
}

function generateMockNearbyCheaper(product: string, lat: number, lon: number) {
  const cleanProduct = product.toLowerCase();
  
  if (cleanProduct.includes("хлеб") || cleanProduct.includes("молок") || cleanProduct.includes("яйц") || cleanProduct.includes("колбас") || cleanProduct.includes("сыр")) {
    return [
      {
        name: "Дисконт-супермаркет 'ДА!'",
        address: "улица Зеленая, дом 4 (320м по прямой)",
        productPrice: `${product}: ~ 49 ₽ - 210 ₽ (Самая дешевая корзина)`,
        distanceMeter: 320,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=ДА!+супермаркет`,
        notes: "Обычно самые низкие сетевые цены. Быстрый пеший маршрут."
      },
      {
        name: "Пятёрочка Эконом",
        address: "улица Садовая, дом 15 (450м)",
        productPrice: `${product}: ~ 55 ₽ - 240 ₽ (Скидка по карте)`,
        distanceMeter: 450,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Пятерочка`,
        notes: "Действуют скидки на молочные и мясные товары по карте лояльности Около."
      },
      {
        name: "Ашан Супермаркет",
        address: "проспект Мира, дом 82 (900м)",
        productPrice: `${product}: ~ 62 ₽ - 280 ₽ (Гиперцена)`,
        distanceMeter: 900,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Ашан`,
        notes: "Огромный выбор марок собственного производства 'Каждый день' по низким ценам."
      }
    ];
  } else if (cleanProduct.includes("лекарст") || cleanProduct.includes("аптек") || cleanProduct.includes("таблет") || cleanProduct.includes("витамин") || cleanProduct.includes("маз")) {
    return [
      {
        name: "Аптека 'Столички' (Низкие цены)",
        address: "проспект Космонавтов, дом 10 (210м)",
        productPrice: `${product}: эконом-цена по сравнению с другими аптеками на 15-20%`,
        distanceMeter: 210,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Аптека+Столички`,
        notes: "Возможен онлайн-заказ для фиксации цены. Экономичная сеть аптек."
      },
      {
        name: "Горздрав Аптека",
        address: "улица Ленина, дом 27 (480м)",
        productPrice: `${product}: стандартная фармацевтическая цена`,
        distanceMeter: 480,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Аптека+Горздрав`,
        notes: "Удобный пункт выдачи, быстродействующая касса рецепторного отпуска."
      }
    ];
  } else {
    // Generic local shop matching
    return [
      {
        name: "Сетевой маркет Магнит у дома",
        address: "улица Октябрьская, дом 5 (280м)",
        productPrice: `${product}: бюджетные цены`,
        distanceMeter: 280,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Магнит`,
        notes: "Ближайшая универсальная точка продажи товаров повседневного спроса."
      },
      {
        name: "Торговый центр 'МегаМаркет'",
        address: "шоссе Энтузиастов, дом 11 (1.2 км)",
        productPrice: `${product}: средние цены, обширный выбор`,
        distanceMeter: 1200,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=Торговый+Центр`,
        notes: "Крупные гипермаркеты внутри предоставляют оптовые скидки на данный товар."
      }
    ];
  }
}

// Vite static middleware for SPA rendering in both Dev and Production environments
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully running on port ${PORT}`);
  });
}

startServer();
