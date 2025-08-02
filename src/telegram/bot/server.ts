// Сервер для запуска телеграм-бота
import express from 'express';
import bot from './index';
import { IS_PRODUCTION, BOT_TOKEN, WEBHOOK_URL } from './config';

// Создаем Express приложение для обработки веб-хуков
const app = express();

// Парсинг JSON
app.use(express.json());

// Простой маршрут для проверки работоспособности
app.get('/', (req, res) => {
  res.send('Сервер телеграм-бота запущен и работает');
});

// Маршрут для получения веб-хуков от Telegram
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  if (IS_PRODUCTION) {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

// Порт, на котором будет работать сервер
const PORT = process.env.PORT || 3002;

// Запускаем сервер
if (IS_PRODUCTION) {
  app.listen(PORT, () => {
    console.log(`[TelegramBot] Сервер запущен на порту ${PORT}`);
    console.log(`[TelegramBot] Webhook URL: ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
  });
} else {
  console.log('[TelegramBot] Сервер не запущен в режиме разработки (используется long polling)');
}

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('[TelegramBot] Необработанное исключение:', error);
});

// Обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  console.error('[TelegramBot] Необработанное отклонение промиса:', reason);
});

export default app; 