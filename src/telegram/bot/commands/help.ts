// Обработчик команды /help
import { Message } from 'node-telegram-bot-api';
import { BotCommand } from '../types';
import { createDivider } from '../utils';
import { MINI_APP_URL } from '../config';

/**
 * Обрабатывает команду /help - получение справки и списка команд
 */
export default async function helpCommand(msg: Message): Promise<void> {
  const bot = global.bot;
  const chatId = msg.chat.id;
  
  // Формируем список доступных команд
  const commandsList = [
    `${BotCommand.START} - Начать работу с ботом`,
    `${BotCommand.HELP} - Получить справку и список команд`,
    `${BotCommand.REGISTER} - Зарегистрироваться или связать аккаунт`,
    `${BotCommand.PROFILE} - Информация о вашем профиле`,
    `${BotCommand.APPOINTMENTS} - Ваши записи на прием`,
    `${BotCommand.NEW_APPOINTMENT} - Записаться на прием`,
    `${BotCommand.CANCEL_APPOINTMENT} - Отменить запись на прием`,
    `${BotCommand.NOTIFICATIONS} - Ваши уведомления`,
    `${BotCommand.SETTINGS} - Настройки бота`,
    `${BotCommand.SPECIALISTS} - Список специалистов`,
    `${BotCommand.SERVICES} - Список услуг`,
    `${BotCommand.CONTACT} - Связаться с нами`,
    `${BotCommand.WEBSITE} - Перейти на сайт`,
    `${BotCommand.REVIEWS} - Отзывы о специалистах`,
    `${BotCommand.ARTICLES} - Статьи и новости`,
  ].join('\n');
  
  // Формируем справочное сообщение
  const helpMessage = `
📚 *Справка по боту "Вдохновение"*

Вот список доступных команд:

${commandsList}

${createDivider()}

📱 *Mini App*
Для удобного доступа к функциям бота вы можете использовать встроенное приложение Telegram. Нажмите на кнопку ниже, чтобы открыть Mini App.

💬 *Поддержка*
Если у вас возникли вопросы или проблемы, вы можете использовать команду /contact, чтобы связаться с нашей поддержкой.

🌐 *Веб-сайт*
Для получения дополнительной информации о центре "Вдохновение" посетите наш веб-сайт, используя команду /website.
  `;
  
  // Создаем кнопку для открытия Mini App
  const keyboard = {
    inline_keyboard: [
      [{
        text: '📱 Открыть Mini App',
        web_app: { url: MINI_APP_URL }
      }]
    ]
  };
  
  // Отправляем справочное сообщение с кнопкой
  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
} 