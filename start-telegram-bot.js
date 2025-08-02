// Скрипт для запуска телеграм-бота
console.log('Запуск телеграм-бота для сайта "Вдохновение"...');

try {
  // Импортируем и запускаем бот
  require('./src/telegram/bot/start');
  console.log('Бот успешно запущен!');
} catch (error) {
  console.error('Ошибка при запуске бота:', error);
  process.exit(1);
} 