# Телеграм-бот для сайта "Вдохновение"

Данный модуль предоставляет функциональность телеграм-бота для взаимодействия с сайтом "Вдохновение".

## Возможности

- Регистрация и авторизация пользователей
- Запись на прием к специалистам
- Управление записями (просмотр, отмена)
- Уведомления о записях и новостях
- Получение информации о специалистах и услугах
- Просмотр и написание отзывов
- Просмотр статей и новостей

## Установка и настройка

### Предварительные требования

- Node.js 16 или выше
- NPM или Yarn
- База данных SQLite (создается автоматически)

### Переменные окружения

Создайте файл `.env` в корне проекта с следующими переменными:

```
# Telegram Bot API
TELEGRAM_BOT_TOKEN=7365896423:AAF9RJwe0SOD-Guh68ei7k_ccGYWusyHIs4
NODE_ENV=development
API_BASE_URL=https://vdohnovenie.pro/api

# Webhook (только для продакшн)
WEBHOOK_URL=https://vdohnovenie.pro
PORT=3002

# Администраторы бота (ID в Telegram через запятую)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Настройки уведомлений
NOTIFICATION_CHECK_INTERVAL=300000
NOTIFICATION_BATCH_SIZE=10
```

### Запуск в режиме разработки

```bash
# Установка зависимостей
npm install

# Запуск бота
npx ts-node src/telegram/bot/start.ts
```

### Запуск в продакшн режиме

```bash
# Установка зависимостей
npm install

# Компиляция TypeScript в JavaScript
npm run build

# Запуск бота
node dist/telegram/bot/start.js
```

## Структура проекта

```
src/telegram/bot/
├── commands/          # Команды бота
├── config.ts          # Конфигурация
├── database.ts        # Работа с базой данных
├── index.ts           # Основной файл бота
├── server.ts          # Express сервер для веб-хуков
├── start.ts           # Скрипт для запуска бота
├── types.ts           # Типы данных
└── utils.ts           # Вспомогательные функции
```

## API для интеграции с сайтом

Бот использует следующие API эндпоинты сайта:

- `GET /api/specialists` - Получение списка специалистов
- `GET /api/specialists/:id` - Получение информации о специалисте
- `GET /api/services` - Получение списка услуг
- `GET /api/services/:id` - Получение информации об услуге
- `GET /api/appointments` - Получение списка записей пользователя
- `POST /api/appointments` - Создание новой записи
- `DELETE /api/appointments/:id` - Отмена записи
- `GET /api/notifications` - Получение уведомлений пользователя
- `PUT /api/notifications/:id` - Отметка уведомления как прочитанного
- `GET /api/articles` - Получение списка статей
- `GET /api/articles/:id` - Получение статьи
- `GET /api/reviews` - Получение отзывов
- `POST /api/reviews` - Создание отзыва

## Mini App

Бот имеет поддержку Telegram Mini App для удобного доступа к функциям сайта.

Для открытия Mini App используйте меню бота или команду `/website`.

## Разработка

### Добавление новых команд

1. Создайте новый файл в директории `commands/`
2. Экспортируйте функцию-обработчик команды
3. Зарегистрируйте команду в `commands/index.ts`

Пример новой команды:

```typescript
// commands/mycommand.ts
import { Message } from 'node-telegram-bot-api';

export default async function myCommandHandler(msg: Message): Promise<void> {
  const bot = global.bot;
  await bot.sendMessage(msg.chat.id, 'Это моя новая команда!');
}

// commands/index.ts
import myCommandHandler from './mycommand';

// Добавьте в список команд
export const commands: CommandHandler[] = [
  // ... другие команды
  {
    command: '/mycommand',
    handler: myCommandHandler,
    description: 'Моя новая команда'
  }
];
```

## Лицензия

MIT 