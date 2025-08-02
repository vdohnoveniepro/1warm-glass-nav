// Утилитарные функции для работы с телеграм-ботом
import { Message, InlineKeyboardButton } from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import { CallbackData, AppointmentStatus } from './types';

// Имя бота в Telegram для использования в сообщениях и URL
export const BOT_USERNAME = 'vdohnoveniepro_bot';

// Получение полного имени бота для ссылок (включая символ @)
export function getBotUsername(): string {
  return `@${BOT_USERNAME}`;
}

// Форматирование даты
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Форматирование времени
export function formatTime(time: string): string {
  return time;
}

// Форматирование даты и времени
export function formatDateTime(date: Date | string, time?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  if (time) {
    return `${formattedDate} в ${time}`;
  }
  
  return formattedDate;
}

// Генерация ID для уведомлений
export function generateNotificationId(): string {
  return `notification_${uuidv4()}`;
}

// Форматирование статуса записи
export function formatAppointmentStatus(status: AppointmentStatus): string {
  const statusMap: Record<AppointmentStatus, string> = {
    [AppointmentStatus.PENDING]: '⏳ Ожидает подтверждения',
    [AppointmentStatus.CONFIRMED]: '✅ Подтверждена',
    [AppointmentStatus.CANCELLED]: '❌ Отменена',
    [AppointmentStatus.COMPLETED]: '✓ Завершена',
    [AppointmentStatus.NO_SHOW]: '⚠️ Неявка'
  };
  
  return statusMap[status] || status;
}

// Кодирование данных для callback запросов
export function encodeCallbackData(data: CallbackData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

// Декодирование данных из callback запросов
export function decodeCallbackData(data: string): CallbackData {
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
  } catch (error) {
    console.error('[TelegramBot] Ошибка при декодировании callback данных:', error);
    return { action: 'error' };
  }
}

// Создание кнопки с закодированными данными
export function createCallbackButton(
  text: string,
  data: CallbackData
): InlineKeyboardButton {
  return {
    text,
    callback_data: encodeCallbackData(data)
  };
}

// Разбиение массива кнопок на строки по N элементов
export function chunkButtons(
  buttons: InlineKeyboardButton[],
  buttonsPerRow: number = 2
): InlineKeyboardButton[][] {
  const chunks: InlineKeyboardButton[][] = [];
  
  for (let i = 0; i < buttons.length; i += buttonsPerRow) {
    chunks.push(buttons.slice(i, i + buttonsPerRow));
  }
  
  return chunks;
}

// Получение имени пользователя из сообщения
export function getUserName(msg: Message): string {
  const user = msg.from;
  if (!user) return 'Пользователь';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  return firstName || lastName || `User${user.id}`;
}

// Экранирование специальных символов в тексте для Markdown V2
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\~/g, '\\~')
    .replace(/\`/g, '\\`')
    .replace(/\>/g, '\\>')
    .replace(/\#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/\=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!');
}

// Валидация номера телефона
export function isValidPhoneNumber(phone: string): boolean {
  // Регулярное выражение для проверки формата телефона: +7XXXXXXXXXX или 8XXXXXXXXXX
  const phoneRegex = /^(\+7|8)[0-9]{10}$/;
  return phoneRegex.test(phone);
}

// Форматирование номера телефона в единый формат +7XXXXXXXXXX
export function formatPhoneNumber(phone: string): string {
  // Удаляем все не цифры
  const digits = phone.replace(/\D/g, '');
  
  // Если номер начинается с 8, заменяем на +7
  if (digits.startsWith('8') && digits.length === 11) {
    return '+7' + digits.substring(1);
  }
  
  // Если номер начинается с 7, добавляем +
  if (digits.startsWith('7') && digits.length === 11) {
    return '+' + digits;
  }
  
  // Если номер без кода страны, добавляем +7
  if (digits.length === 10) {
    return '+7' + digits;
  }
  
  return phone;
}

// Создание линии разделителя для сообщений
export function createDivider(length: number = 30): string {
  return '─'.repeat(length);
}

// Обрезка длинного текста с добавлением многоточия
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

// Преобразование объекта в строку для отладки
export function debugObject(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return `[Не удалось сериализовать объект: ${error}]`;
  }
}

// Задержка выполнения на указанное количество миллисекунд
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Разбиение длинного сообщения на части с учетом ограничений Telegram
export function splitLongMessage(message: string, maxLength: number = 4000): string[] {
  if (message.length <= maxLength) {
    return [message];
  }
  
  const parts: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < message.length) {
    // Ищем ближайший перенос строки или пробел в пределах максимальной длины
    let endIndex = currentIndex + maxLength;
    
    if (endIndex < message.length) {
      const lastNewLineIndex = message.lastIndexOf('\n', endIndex);
      const lastSpaceIndex = message.lastIndexOf(' ', endIndex);
      
      if (lastNewLineIndex > currentIndex && lastNewLineIndex > lastSpaceIndex) {
        endIndex = lastNewLineIndex + 1;
      } else if (lastSpaceIndex > currentIndex) {
        endIndex = lastSpaceIndex + 1;
      }
    } else {
      endIndex = message.length;
    }
    
    parts.push(message.substring(currentIndex, endIndex));
    currentIndex = endIndex;
  }
  
  return parts;
} 