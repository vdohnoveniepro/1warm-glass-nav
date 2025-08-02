// Команды для телеграм-бота
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { BotCommand, CommandHandler } from '../types';
import { telegramUsers } from '../database';
import { getUserName, createDivider } from '../utils';
import startCommand from './start';
import helpCommand from './help';
import registerCommand from './register';
import profileCommand from './profile';
import appointmentsCommand from './appointments';
import newAppointmentCommand from './new-appointment';
import cancelAppointmentCommand from './cancel-appointment';
import notificationsCommand from './notifications';
import settingsCommand from './settings';
import specialistsCommand from './specialists';
import servicesCommand from './services';
import contactCommand from './contact';
import websiteCommand from './website';
import reviewsCommand from './reviews';
import articlesCommand from './articles';

// Экспортируем все команды
export {
  startCommand,
  helpCommand,
  registerCommand,
  profileCommand,
  appointmentsCommand,
  newAppointmentCommand,
  cancelAppointmentCommand,
  notificationsCommand,
  settingsCommand,
  specialistsCommand,
  servicesCommand,
  contactCommand,
  websiteCommand,
  reviewsCommand,
  articlesCommand
};

// Список всех доступных команд
export const commands: CommandHandler[] = [
  {
    command: BotCommand.START,
    handler: startCommand,
    description: 'Начать работу с ботом'
  },
  {
    command: BotCommand.HELP,
    handler: helpCommand,
    description: 'Получить справку и список команд'
  },
  {
    command: BotCommand.REGISTER,
    handler: registerCommand,
    description: 'Зарегистрироваться или связать аккаунт'
  },
  {
    command: BotCommand.PROFILE,
    handler: profileCommand,
    description: 'Информация о вашем профиле'
  },
  {
    command: BotCommand.APPOINTMENTS,
    handler: appointmentsCommand,
    description: 'Ваши записи на прием'
  },
  {
    command: BotCommand.NEW_APPOINTMENT,
    handler: newAppointmentCommand,
    description: 'Записаться на прием'
  },
  {
    command: BotCommand.CANCEL_APPOINTMENT,
    handler: cancelAppointmentCommand,
    description: 'Отменить запись на прием'
  },
  {
    command: BotCommand.NOTIFICATIONS,
    handler: notificationsCommand,
    description: 'Ваши уведомления'
  },
  {
    command: BotCommand.SETTINGS,
    handler: settingsCommand,
    description: 'Настройки бота'
  },
  {
    command: BotCommand.SPECIALISTS,
    handler: specialistsCommand,
    description: 'Список специалистов'
  },
  {
    command: BotCommand.SERVICES,
    handler: servicesCommand,
    description: 'Список услуг'
  },
  {
    command: BotCommand.CONTACT,
    handler: contactCommand,
    description: 'Связаться с нами'
  },
  {
    command: BotCommand.WEBSITE,
    handler: websiteCommand,
    description: 'Перейти на сайт'
  },
  {
    command: BotCommand.REVIEWS,
    handler: reviewsCommand,
    description: 'Отзывы о специалистах'
  },
  {
    command: BotCommand.ARTICLES,
    handler: articlesCommand,
    description: 'Статьи и новости'
  }
];

// Функция для регистрации всех команд в боте
export function registerCommands(bot: TelegramBot): void {
  // Регистрируем описания команд в меню бота
  const botCommands = commands.map(command => ({
    command: command.command.slice(1), // Убираем "/" из названия команды
    description: command.description
  }));
  
  bot.setMyCommands(botCommands);
  
  // Регистрируем обработчики команд
  commands.forEach(commandHandler => {
    bot.onText(
      commandHandler.command instanceof RegExp 
        ? commandHandler.command 
        : new RegExp(`^${commandHandler.command}$`),
      async (msg, match) => {
        try {
          await commandHandler.handler(msg, match);
        } catch (error) {
          console.error(`[TelegramBot] Ошибка при обработке команды ${commandHandler.command}:`, error);
          
          // Отправляем сообщение об ошибке пользователю
          bot.sendMessage(
            msg.chat.id,
            `❌ Произошла ошибка при выполнении команды.\n${createDivider()}\nПожалуйста, попробуйте позже или обратитесь к администратору.`
          );
        }
      }
    );
  });
  
  // Добавляем обработчик для неизвестных команд
  bot.onText(/^\/(.+)$/, async (msg, match) => {
    if (!match || !match[1]) return;
    
    const command = `/${match[1].split('@')[0]}`; // Учитываем возможность @botname в команде
    
    // Проверяем, существует ли такая команда
    const commandExists = commands.some(cmd => {
      if (cmd.command instanceof RegExp) {
        return cmd.command.test(command);
      }
      return cmd.command === command;
    });
    
    if (!commandExists) {
      bot.sendMessage(
        msg.chat.id,
        `❓ Неизвестная команда: ${command}\n\nВведите /help для получения списка доступных команд.`
      );
    }
  });
}

// Функция для обработки команды от неавторизованного пользователя
export async function handleUnauthorizedCommand(msg: Message): Promise<void> {
  const user = await telegramUsers.getById(msg.from?.id || 0);
  
  if (!user || !user.is_registered) {
    const bot = global.bot as TelegramBot;
    
    bot.sendMessage(
      msg.chat.id,
      `👋 Привет, ${getUserName(msg)}!\n\n` +
      `Для использования этой команды необходимо зарегистрироваться.\n\n` +
      `Пожалуйста, используйте команду /register для регистрации или связывания аккаунта.`
    );
    
    return Promise.reject('Пользователь не авторизован');
  }
  
  return Promise.resolve();
} 