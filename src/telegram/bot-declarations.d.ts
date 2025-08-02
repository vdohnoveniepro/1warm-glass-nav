// Отключение проверки типов для телеграм-бота
declare module 'node-telegram-bot-api' {
  export default any;
  export interface Message {
    [key: string]: any;
  }
  export interface InlineKeyboardButton {
    [key: string]: any;
  }
}

// Объявление глобальной переменной для бота
declare global {
  var bot: any;
} 