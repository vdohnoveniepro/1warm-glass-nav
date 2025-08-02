import { v4 as uuidv4 } from 'uuid';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет классы с помощью clsx и tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Генерирует уникальный идентификатор
 * @returns Строка с уникальным ID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Форматирует сумму в рублях
 * @param amount Сумма в рублях
 * @returns Отформатированная строка с суммой
 */
export function formatCurrency(amount: number): string {
  if (!amount || amount === 0) {
    return 'Бесплатно';
  }
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Форматирует продолжительность в минутах в часы и минуты
 * @param minutes Продолжительность в минутах
 * @returns Отформатированная строка
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) {
    return '0 мин';
  }
  
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')}`;
  }
  
  return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')} ${remainingMinutes} мин`;
}

/**
 * Возвращает правильную форму слова в зависимости от числа
 * @param count Число
 * @param one Форма для числа 1
 * @param few Форма для чисел 2-4
 * @param many Форма для чисел 5-20
 * @returns Правильная форма слова
 */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return one;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
    return few;
  }
  
  return many;
}

// Функция для получения значения cookie на стороне клиента
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}