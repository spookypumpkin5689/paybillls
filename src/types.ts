export type CategoryType =
  | 'Продукты'
  | 'Транспорт'
  | 'Развлечения'
  | 'Коммунальные услуги'
  | 'Одежда и Обувь'
  | 'Здоровье и Аптека'
  | 'Рестораны и Кафе'
  | 'Другое';

export interface TransactionItem {
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  items: TransactionItem[];
  total: number;
  category: CategoryType;
  rawResponse?: string;
  comment?: string;
}

export interface BudgetLimit {
  category: CategoryType;
  limit: number;
}

export interface NearbyStore {
  name: string;
  address: string;
  productPrice?: string;
  distanceMeter?: number;
  mapsUrl?: string;
  notes?: string;
}

export interface AlertNotification {
  id: string;
  type: 'info' | 'warning' | 'danger';
  message: string;
  date: string;
  dismissed: boolean;
  category?: CategoryType;
}
