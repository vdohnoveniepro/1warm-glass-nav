// Основной файл телеграм-бота
import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN, IS_PRODUCTION, WEBHOOK_URL, NOTIFICATIONS } from './config';
import { BotState } from './types';
import { telegramUsers, telegramNotifications } from './database';
import { registerCommands } from './commands';
import { delay } from './utils';

// Объявляем глобальный тип для бота
declare global {
  var bot: TelegramBot;
}

// Инициализация бота
let bot: TelegramBot;

if (IS_PRODUCTION && WEBHOOK_URL) {
  // Продакшн режим с веб-хуком
  bot = new TelegramBot(BOT_TOKEN, {
    webHook: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8443
    }
  });
  
  // Устанавливаем веб-хук
  bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
  console.log('[TelegramBot] Бот запущен в режиме webhook');
} else {
  // Режим разработки с long polling
  bot = new TelegramBot(BOT_TOKEN, {
    polling: true
  });
  console.log('[TelegramBot] Бот запущен в режиме long polling');
}

// Делаем бот доступным глобально
global.bot = bot;

// Регистрируем команды
registerCommands(bot);

// Обработчик состояний
bot.on('message', async (msg) => {
  // Пропускаем команды, они обрабатываются отдельно
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }
  
  const userId = msg.from?.id;
  if (!userId) return;
  
  // Получаем пользователя из базы данных
  const user = await telegramUsers.getById(userId);
  
  // Если пользователь не найден или нет активного состояния, пропускаем обработку
  if (!user || !user.state || user.state === BotState.IDLE) {
    return;
  }
  
  // Обработка сообщений в зависимости от состояния пользователя
  switch (user.state) {
    case BotState.AWAITING_PHONE:
      // Обработка ввода номера телефона
      await handlePhoneInput(msg, user.id);
      break;
      
    case BotState.AWAITING_NAME:
      // Обработка ввода имени
      await handleNameInput(msg, user.id);
      break;
      
    case BotState.WRITING_REVIEW:
      // Обработка ввода текста отзыва
      await handleReviewInput(msg, user.id);
      break;
      
    case BotState.WRITING_MESSAGE:
      // Обработка ввода сообщения для связи
      await handleMessageInput(msg, user.id);
      break;
      
    default:
      // Для неизвестных состояний сбрасываем в IDLE
      await telegramUsers.updateState(user.id, BotState.IDLE);
      bot.sendMessage(msg.chat.id, 'Извините, я не понимаю, что от меня требуется. Используйте команды для взаимодействия со мной.');
  }
});

// Обработчик колбэков от кнопок
bot.on('callback_query', async (query) => {
  if (!query.data || !query.message) return;
  
  try {
    // Распарсить данные из callback_query
    const data = JSON.parse(query.data);
    
    // Обработка различных типов колбэков
    switch (data.action) {
      case 'appointment_select_specialist':
        // Выбор специалиста для записи
        await handleSpecialistSelection(query, data);
        break;
        
      case 'appointment_select_service':
        // Выбор услуги для записи
        await handleServiceSelection(query, data);
        break;
        
      case 'appointment_select_date':
        // Выбор даты для записи
        await handleDateSelection(query, data);
        break;
        
      case 'appointment_select_time':
        // Выбор времени для записи
        await handleTimeSelection(query, data);
        break;
        
      case 'appointment_confirm':
        // Подтверждение записи
        await handleAppointmentConfirmation(query, data);
        break;
        
      case 'appointment_cancel':
        // Отмена записи
        await handleAppointmentCancellation(query, data);
        break;
        
      case 'notification_read':
        // Отметка уведомления как прочитанного
        await handleNotificationRead(query, data);
        break;
        
      case 'settings_update':
        // Обновление настроек уведомлений
        await handleSettingsUpdate(query, data);
        break;
        
      default:
        // Неизвестный тип колбэка
        bot.answerCallbackQuery(query.id, {
          text: 'Неизвестное действие'
        });
    }
  } catch (error) {
    console.error('[TelegramBot] Ошибка при обработке callback_query:', error);
    
    // Отвечаем на колбэк в любом случае, чтобы не зависала кнопка
    bot.answerCallbackQuery(query.id, {
      text: 'Произошла ошибка при обработке запроса'
    });
  }
});

// Заглушки для обработчиков
async function handlePhoneInput(msg: TelegramBot.Message, userId: number) {
  // TODO: Реализовать обработку ввода номера телефона
  await telegramUsers.updateState(userId, BotState.IDLE);
  bot.sendMessage(msg.chat.id, 'Функция ввода номера телефона будет доступна позже.');
}

async function handleNameInput(msg: TelegramBot.Message, userId: number) {
  // TODO: Реализовать обработку ввода имени
  await telegramUsers.updateState(userId, BotState.IDLE);
  bot.sendMessage(msg.chat.id, 'Функция ввода имени будет доступна позже.');
}

async function handleReviewInput(msg: TelegramBot.Message, userId: number) {
  // TODO: Реализовать обработку ввода отзыва
  await telegramUsers.updateState(userId, BotState.IDLE);
  bot.sendMessage(msg.chat.id, 'Функция отправки отзывов будет доступна позже.');
}

async function handleMessageInput(msg: TelegramBot.Message, userId: number) {
  // TODO: Реализовать обработку сообщения для связи
  await telegramUsers.updateState(userId, BotState.IDLE);
  bot.sendMessage(msg.chat.id, 'Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.');
}

async function handleSpecialistSelection(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку выбора специалиста
  bot.answerCallbackQuery(query.id, {
    text: 'Функция выбора специалиста будет доступна позже.'
  });
}

async function handleServiceSelection(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку выбора услуги
  bot.answerCallbackQuery(query.id, {
    text: 'Функция выбора услуги будет доступна позже.'
  });
}

async function handleDateSelection(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку выбора даты
  bot.answerCallbackQuery(query.id, {
    text: 'Функция выбора даты будет доступна позже.'
  });
}

async function handleTimeSelection(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку выбора времени
  bot.answerCallbackQuery(query.id, {
    text: 'Функция выбора времени будет доступна позже.'
  });
}

async function handleAppointmentConfirmation(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку подтверждения записи
  bot.answerCallbackQuery(query.id, {
    text: 'Функция подтверждения записи будет доступна позже.'
  });
}

async function handleAppointmentCancellation(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку отмены записи
  bot.answerCallbackQuery(query.id, {
    text: 'Функция отмены записи будет доступна позже.'
  });
}

async function handleNotificationRead(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку отметки уведомления как прочитанного
  bot.answerCallbackQuery(query.id, {
    text: 'Функция отметки уведомления как прочитанного будет доступна позже.'
  });
}

async function handleSettingsUpdate(query: TelegramBot.CallbackQuery, data: any) {
  // TODO: Реализовать обработку обновления настроек
  bot.answerCallbackQuery(query.id, {
    text: 'Функция обновления настроек будет доступна позже.'
  });
}

// Функция для отправки уведомлений пользователям
async function sendNotifications() {
  try {
    // Получаем неотправленные уведомления
    const notifications = await telegramNotifications.getUnsent(NOTIFICATIONS.BATCH_SIZE);
    
    if (notifications.length === 0) {
      return;
    }
    
    console.log(`[TelegramBot] Найдено ${notifications.length} неотправленных уведомлений`);
    
    // Отправляем каждое уведомление
    for (const notification of notifications) {
      try {
        // Получаем пользователя телеграм по ID пользователя сайта
        const user = await telegramUsers.getBySiteUserId(notification.user_id);
        
        if (!user) {
          console.log(`[TelegramBot] Пользователь с ID ${notification.user_id} не найден в Telegram`);
          // Отмечаем уведомление как отправленное, чтобы не пытаться отправить его снова
          await telegramNotifications.markAsSent(notification.id);
          continue;
        }
        
        // Формируем текст уведомления
        const message = `
📣 *${notification.title}*

${notification.message}

${notification.link ? `[Подробнее](${notification.link})` : ''}
        `;
        
        // Отправляем уведомление
        const sentMessage = await bot.sendMessage(user.chat_id, message, {
          parse_mode: 'Markdown'
        });
        
        // Отмечаем уведомление как отправленное
        await telegramNotifications.markAsSent(notification.id, sentMessage.message_id);
        
        console.log(`[TelegramBot] Отправлено уведомление ${notification.id} пользователю ${user.id}`);
        
        // Добавляем задержку, чтобы не превысить лимит API Telegram
        await delay(100);
      } catch (error) {
        console.error(`[TelegramBot] Ошибка при отправке уведомления ${notification.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[TelegramBot] Ошибка при отправке уведомлений:', error);
  }
}

// Запускаем периодическую отправку уведомлений
if (IS_PRODUCTION) {
  setInterval(sendNotifications, NOTIFICATIONS.CHECK_INTERVAL);
  console.log(`[TelegramBot] Запущена периодическая отправка уведомлений с интервалом ${NOTIFICATIONS.CHECK_INTERVAL}ms`);
}

// Экспортируем бота
export default bot;

// Экспортируем основные функции
export {
  sendNotifications
}; 