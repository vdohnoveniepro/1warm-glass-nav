// Типы данных для телеграм-бота
import { Message, User } from 'node-telegram-bot-api';

// Интерфейс для хранения данных о пользователе бота
export interface TelegramUser {
  id: number; // Telegram user ID
  username?: string;
  first_name: string;
  last_name?: string;
  is_registered: boolean; // Зарегистрирован ли пользователь на сайте
  site_user_id?: string; // ID пользователя на сайте
  chat_id: number; // ID чата с пользователем
  created_at: Date;
  updated_at: Date;
  notification_settings: NotificationSettings;
  state?: BotState; // Текущее состояние диалога с ботом
  temp_data?: any; // Временные данные для многошаговых операций
}

// Настройки уведомлений
export interface NotificationSettings {
  appointments: boolean; // Уведомления о записях
  appointment_reminders: boolean; // Напоминания о предстоящих записях
  news: boolean; // Уведомления о новостях и статьях
  promotions: boolean; // Уведомления о акциях и скидках
  reviews: boolean; // Уведомления о новых отзывах (для специалистов)
  messages: boolean; // Уведомления о новых сообщениях
}

// Состояния бота для управления диалогом
export enum BotState {
  IDLE = 'idle', // Нет активного диалога
  AWAITING_PHONE = 'awaiting_phone', // Ожидание ввода номера телефона
  AWAITING_NAME = 'awaiting_name', // Ожидание ввода имени
  SELECTING_SPECIALIST = 'selecting_specialist', // Выбор специалиста
  SELECTING_SERVICE = 'selecting_service', // Выбор услуги
  SELECTING_DATE = 'selecting_date', // Выбор даты
  SELECTING_TIME = 'selecting_time', // Выбор времени
  CONFIRMING_APPOINTMENT = 'confirming_appointment', // Подтверждение записи
  WRITING_REVIEW = 'writing_review', // Написание отзыва
  WRITING_MESSAGE = 'writing_message', // Написание сообщения
  CANCELLING_APPOINTMENT = 'cancelling_appointment', // Отмена записи
}

// Типы уведомлений
export enum NotificationType {
  APPOINTMENT_CREATED = 'appointment_created', // Создана новая запись
  APPOINTMENT_CONFIRMED = 'appointment_confirmed', // Запись подтверждена
  APPOINTMENT_CANCELLED = 'appointment_cancelled', // Запись отменена
  APPOINTMENT_REMINDER = 'appointment_reminder', // Напоминание о предстоящей записи
  NEW_ARTICLE = 'new_article', // Новая статья
  NEW_PROMOTION = 'new_promotion', // Новая акция
  NEW_REVIEW = 'new_review', // Новый отзыв
  NEW_MESSAGE = 'new_message', // Новое сообщение
}

// Интерфейс для уведомления
export interface Notification {
  id: string;
  user_id: string; // ID пользователя на сайте
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // Ссылка на страницу сайта
  created_at: Date;
  read: boolean;
  sent_to_telegram: boolean;
  telegram_message_id?: number;
  additional_data?: any; // Дополнительные данные в зависимости от типа уведомления
}

// Интерфейс для записи на прием
export interface Appointment {
  id: string;
  user_id: string;
  specialist_id: string;
  specialist_name: string;
  service_id: string;
  service_name: string;
  date: Date;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

// Статусы записи на прием
export enum AppointmentStatus {
  PENDING = 'pending', // Ожидает подтверждения
  CONFIRMED = 'confirmed', // Подтверждена
  CANCELLED = 'cancelled', // Отменена
  COMPLETED = 'completed', // Завершена
  NO_SHOW = 'no_show', // Неявка
}

// Команды бота
export enum BotCommand {
  START = '/start',
  HELP = '/help',
  REGISTER = '/register',
  PROFILE = '/profile',
  APPOINTMENTS = '/appointments',
  NEW_APPOINTMENT = '/new_appointment',
  CANCEL_APPOINTMENT = '/cancel_appointment',
  NOTIFICATIONS = '/notifications',
  SETTINGS = '/settings',
  SPECIALISTS = '/specialists',
  SERVICES = '/services',
  CONTACT = '/contact',
  WEBSITE = '/website',
  REVIEWS = '/reviews',
  ARTICLES = '/articles',
}

// Интерфейс для хэндлера команд
export interface CommandHandler {
  command: BotCommand | RegExp;
  handler: (msg: Message, match?: RegExpExecArray | null) => Promise<void>;
  description: string;
}

// Интерфейс для обработчика обновлений состояния
export interface StateHandler {
  state: BotState;
  handler: (msg: Message) => Promise<void>;
}

// Интерфейс для данных callback запросов
export interface CallbackData {
  action: string;
  [key: string]: string | number | boolean;
} 