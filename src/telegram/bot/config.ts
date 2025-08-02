// Конфигурация для телеграм-бота
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла (если он существует)
dotenv.config();

// Токен бота, полученный от @BotFather
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7365896423:AAF9RJwe0SOD-Guh68ei7k_ccGYWusyHIs4';

// Базовый URL для API сайта
export const API_BASE_URL = process.env.API_BASE_URL || 'https://vdohnovenie.pro/api';

// Конфигурация для режима разработки/продакшн
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// URL для веб-хука (используется в продакшн режиме)
export const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://vdohnovenie.pro';

// Настройки для Mini App
export const MINI_APP_URL = process.env.MINI_APP_URL || 'https://t.me/vdohnoveniepro_bot/shop';

// Настройки уведомлений
export const NOTIFICATIONS = {
  // Интервал проверки новых уведомлений в миллисекундах (по умолчанию 5 минут)
  CHECK_INTERVAL: parseInt(process.env.NOTIFICATION_CHECK_INTERVAL || '300000', 10),
  // Максимальное количество уведомлений, отправляемых за один раз
  BATCH_SIZE: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '10', 10),
};

// ID администраторов бота
export const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => id.trim());

// Настройки для подключения к базе данных
export const DB_CONFIG = {
  path: process.env.DB_PATH || 'src/database/vdohnovenie.db',
}; 