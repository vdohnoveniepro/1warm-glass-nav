// Обработчик команды /register
import { Message } from 'node-telegram-bot-api';
import { telegramUsers } from '../database';
import { getUserName, createDivider } from '../utils';
import { BotState } from '../types';

/**
 * Обрабатывает команду /register - регистрация или связывание аккаунта
 */
export default async function registerCommand(msg: Message): Promise<void> {
  const bot = global.bot;
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) {
    console.error('[TelegramBot] Не удалось получить ID пользователя');
    return;
  }
  
  // Получаем пользователя из базы данных
  const user = await telegramUsers.getById(userId);
  
  // Если пользователь уже зарегистрирован, показываем соответствующее сообщение
  if (user && user.is_registered) {
    const alreadyRegisteredMessage = `
✅ ${getUserName(msg)}, вы уже зарегистрированы!

${createDivider()}

Ваш аккаунт в Telegram уже связан с аккаунтом на сайте.
Вы можете использовать все функции бота.

Для просмотра вашего профиля используйте команду /profile.
    `;
    
    await bot.sendMessage(chatId, alreadyRegisteredMessage);
    return;
  }
  
  // Сообщение с информацией о регистрации
  const registerMessage = `
📝 Регистрация в системе "Вдохновение"

${createDivider()}

Для использования всех функций бота необходимо связать ваш аккаунт в Telegram с аккаунтом на сайте.

Выберите один из вариантов:

1️⃣ *У меня уже есть аккаунт на сайте*
   Войдите на сайт и перейдите в раздел "Настройки профиля" -> "Связать с Telegram"
   
2️⃣ *У меня нет аккаунта на сайте*
   Зарегистрируйтесь на сайте или зарегистрируйтесь прямо здесь в боте

${createDivider()}

Хотите зарегистрироваться через бот?
  `;
  
  // Создаем клавиатуру с кнопками
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Да, зарегистрироваться', callback_data: JSON.stringify({ action: 'register_start' }) },
        { text: '❌ Нет, позже', callback_data: JSON.stringify({ action: 'register_cancel' }) }
      ],
      [
        { text: '🌐 Перейти на сайт', url: 'https://vdohnovenie.pro/register' }
      ]
    ]
  };
  
  // Отправляем сообщение с кнопками
  await bot.sendMessage(chatId, registerMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  // Добавляем обработчик для колбэка от кнопок
  bot.on('callback_query', async (query) => {
    if (!query.data || !query.message) return;
    
    try {
      const data = JSON.parse(query.data);
      
      // Обрабатываем нажатие на кнопку регистрации
      if (data.action === 'register_start') {
        // Отвечаем на колбэк, чтобы убрать "часики" на кнопке
        await bot.answerCallbackQuery(query.id, {
          text: 'Начинаем процесс регистрации...'
        });
        
        // Удаляем предыдущее сообщение с кнопками
        await bot.deleteMessage(query.message.chat.id, query.message.message_id.toString());
        
        // Отправляем сообщение с запросом номера телефона
        const phoneRequestMessage = `
📱 Для регистрации нам нужен ваш номер телефона.

${createDivider()}

Пожалуйста, отправьте ваш номер телефона в формате:
+7XXXXXXXXXX или 8XXXXXXXXXX

Мы будем использовать его только для связи с вами и подтверждения записей.
        `;
        
        await bot.sendMessage(query.message.chat.id, phoneRequestMessage);
        
        // Устанавливаем состояние пользователя в "ожидание номера телефона"
        if (userId) {
          await telegramUsers.updateState(userId, BotState.AWAITING_PHONE);
        }
      }
      // Обрабатываем нажатие на кнопку отмены регистрации
      else if (data.action === 'register_cancel') {
        // Отвечаем на колбэк
        await bot.answerCallbackQuery(query.id, {
          text: 'Регистрация отменена'
        });
        
        // Отправляем сообщение о том, что регистрация отменена
        await bot.sendMessage(query.message.chat.id, 'Регистрация отменена. Вы можете пройти ее позже, используя команду /register.');
        
        // Сбрасываем состояние пользователя
        if (userId) {
          await telegramUsers.updateState(userId, BotState.IDLE);
        }
      }
    } catch (error) {
      console.error('[TelegramBot] Ошибка при обработке callback_query для регистрации:', error);
      
      // Отвечаем на колбэк в любом случае, чтобы не зависала кнопка
      await bot.answerCallbackQuery(query.id, {
        text: 'Произошла ошибка при обработке запроса'
      });
    }
  });
} 