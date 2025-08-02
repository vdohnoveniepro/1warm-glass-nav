// Обработчик команды /start
import { Message } from 'node-telegram-bot-api';
import { telegramUsers } from '../database';
import { getUserName } from '../utils';

/**
 * Обрабатывает команду /start - начало работы с ботом
 */
export default async function startCommand(msg: Message): Promise<void> {
  const bot = global.bot;
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) {
    console.error('[TelegramBot] Не удалось получить ID пользователя');
    return;
  }
  
  // Получаем существующего пользователя или создаем нового
  let user = await telegramUsers.getById(userId);
  
  if (!user) {
    // Создаем нового пользователя в базе данных
    user = telegramUsers.create({
      id: userId,
      username: msg.from?.username,
      first_name: msg.from?.first_name || 'Пользователь',
      last_name: msg.from?.last_name,
      chat_id: chatId,
      is_registered: false
    });
    
    console.log(`[TelegramBot] Создан новый пользователь: ${user.id}`);
  }
  
  // Приветственное сообщение
  const welcomeMessage = `
👋 Здравствуйте, ${getUserName(msg)}!

Добро пожаловать в официальный бот центра "Вдохновение"! 

Здесь вы можете:
• Записаться на прием к специалисту
• Получать уведомления о записях
• Узнавать о новых статьях и акциях
• Оставлять отзывы после посещения

${user.is_registered 
  ? '✅ Ваш аккаунт уже связан с сайтом.' 
  : '📝 Чтобы связать бот с вашим аккаунтом на сайте, используйте команду /register.'}

Для получения списка всех доступных команд введите /help.
  `;
  
  // Отправляем приветственное сообщение
  await bot.sendMessage(chatId, welcomeMessage);
} 