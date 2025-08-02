#!/usr/bin/env node

// Скрипт для запуска телеграм-бота
import './index';
import { IS_PRODUCTION } from './config';

// Импортируем сервер, если мы в продакшн режиме
if (IS_PRODUCTION) {
  require('./server');
}

console.log('[TelegramBot] Бот успешно запущен!');
console.log(`[TelegramBot] Режим: ${IS_PRODUCTION ? 'Продакшн (webhook)' : 'Разработка (long polling)'}`);
console.log('[TelegramBot] Нажмите Ctrl+C для остановки бота'); 