// Перечисления

/**
 * Роли пользователей в системе
 */
export enum UserRole {
  USER = 'user',         // Обычный пользователь
  SPECIALIST = 'specialist', // Специалист
  ADMIN = 'admin',       // Администратор
  CLIENT = 'client'       // Клиент
}

/**
 * Статусы записей на прием
 */
export enum AppointmentStatus {
  PENDING = 'pending',     // Ожидает подтверждения
  CONFIRMED = 'confirmed', // Подтверждена
  COMPLETED = 'completed', // Завершена
  CANCELLED = 'cancelled', // Отменена
  ARCHIVED = 'archived',   // В архиве
}

// Логирует информацию о статусах для отладки
console.log('[types.ts] AppointmentStatus enum загружен:', {
  PENDING: AppointmentStatus.PENDING,
  CONFIRMED: AppointmentStatus.CONFIRMED,
  COMPLETED: AppointmentStatus.COMPLETED,
  CANCELLED: AppointmentStatus.CANCELLED,
  ARCHIVED: AppointmentStatus.ARCHIVED,
  'typeof PENDING': typeof AppointmentStatus.PENDING
});

// Интерфейсы

/**
 * Пользователь
 */
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  specialistId?: string;  // ID связанного профиля специалиста
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string; // Время последнего входа
  emailVerified?: boolean; // Статус верификации email
  telegramId?: string;  // ID пользователя в Telegram
  telegramUsername?: string; // Username пользователя в Telegram
  googleId?: string;    // ID пользователя в Google
  passwordResetToken?: string; // Токен для сброса пароля
  passwordResetExpires?: string; // Время истечения токена сброса пароля
  favorites: Favorites;
  // Поля для бонусной системы
  bonusBalance?: number; // Баланс бонусов
  referralCode?: string; // Реферальный код пользователя
  referredById?: string; // ID пользователя, который пригласил текущего
}

/**
 * Услуга центра
 */
export interface Service {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  image: string;
  price: number;
  duration: number;
  color: string;
  specialists: {
    id: string;
    firstName: string;
    lastName: string;
    photo: string;
  }[];
  order: number;
  isArchived?: boolean; // Флаг для обозначения архивных услуг
}

/**
 * Специалист центра
 */
export interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  description: string;
  userId?: string;       // ID связанного пользователя
  services: {
    id: string;
    name: string;
    color: string;
  }[];
  order: number;
  position?: string;
  additionalPositions?: string[];
  experience?: number;
  documents?: string[];
  workSchedule?: {
    enabled: boolean;
    workDays: WorkDay[];
    vacations: Vacation[];
    bookingPeriodMonths: number; // Период доступности бронирования в месяцах (2, 6, 12)
  };
}

/**
 * Рабочий день специалиста
 */
export interface WorkDay {
  day: number; // 1-7, где 1 - понедельник, 7 - воскресенье
  active: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  lunchBreaks: LunchBreak[];
}

/**
 * Обеденный перерыв
 */
export interface LunchBreak {
  id: string;
  enabled: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

/**
 * Отпуск специалиста
 */
export interface Vacation {
  id: string;
  enabled: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * День расписания специалиста
 */
export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

/**
 * Временной слот в расписании
 */
export interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
  isAvailable: boolean;
  appointmentId?: string; // ID записи, если слот занят
}

/**
 * Запись на прием
 */
export interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  timeStart?: string; // для обратной совместимости
  timeEnd?: string;   // для обратной совместимости
  price: number;
  status: AppointmentStatus;
  notes?: string;
}

/**
 * Статья блога
 */
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  banner: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  views: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: number; // Порядок отображения статьи в списке
}

/**
 * Отзыв клиента
 */
export interface Review {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: UserRole;
  };
  specialistId: string;
  serviceId?: string;
  serviceName?: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isPublished: boolean;
  isModerated: boolean;
  replies?: Array<{
    id: string;
    reviewId: string;
    parentReplyId?: string;
    userId: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
      role: UserRole;
    };
    text: string;
    attachments: Array<{
      type: string;
      url: string;
    }>;
    reactions: Array<any>;
    isModerated: boolean;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  attachments: Array<{
    type: string;
    url: string;
  }>;
  reactions: Array<{
    id: string;
    userId: string;
    reviewId: string;
    type: ReviewReactionType;
    createdAt: string;
  }>;
}

/**
 * Вложение к отзыву
 */
export interface ReviewAttachment {
  id: string;
  reviewId: string;       // ID отзыва
  type: 'image' | 'file'; // Тип вложения
  url: string;            // URL вложения
  name?: string;          // Имя файла
  createdAt: string;
}

/**
 * Типы реакций на отзыв
 */
export enum ReviewReactionType {
  LIKE = 'like',
  LOVE = 'love',
  THANKS = 'thanks',
  WOW = 'wow',
  SAD = 'sad'
}

/**
 * Реакция на отзыв
 */
export interface ReviewReaction {
  id: string;
  reviewId: string;          // ID отзыва
  userId: string;            // ID пользователя
  type: ReviewReactionType;  // Тип реакции
  createdAt: string;
}

/**
 * Ответ на отзыв
 */
export interface ReviewReply {
  id: string;
  reviewId: string;          // ID родительского отзыва
  parentReplyId?: string;    // ID родительского ответа (для вложенных ответов)
  userId: string;            // ID автора ответа
  user?: {                   // Информация об авторе (опционально)
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role?: UserRole;         // Роль пользователя (чтобы отличать ответы от специалиста/админа)
  };
  text: string;              // Текст ответа
  attachments?: ReviewAttachment[]; // Вложения
  reactions: ReviewReaction[]; // Реакции на ответ
  isModerated: boolean;      // Проверен ли ответ модератором
  isPublished: boolean;      // Опубликован ли ответ
  createdAt: string;
  updatedAt: string;
}

/**
 * Мероприятие центра
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  maxParticipants: number;
  price: number;
  specialistIds: string[]; // ID ведущих специалистов
  participantIds: string[]; // ID записавшихся участников
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Настройки уведомлений
 */
export interface NotificationSettings {
  id: string;
  emailEnabled: boolean;       // Включена ли отправка email уведомлений
  siteEnabled: boolean;        // Включены ли уведомления на сайте
  eventTypes: NotificationEventType[]; // Типы событий, для которых включены уведомления
  createdAt: string;
  updatedAt: string;
}

/**
 * Тип события для уведомления
 */
export enum NotificationEventType {
  REGISTRATION = 'registration',        // Регистрация пользователя
  PASSWORD_RESET = 'password_reset',    // Сброс пароля
  APPOINTMENT_CREATED = 'appointment_created', // Создание записи на прием
  APPOINTMENT_CONFIRMED = 'appointment_confirmed', // Подтверждение записи на прием
  APPOINTMENT_CANCELLED = 'appointment_cancelled', // Отмена записи на прием
  APPOINTMENT_REMINDER = 'appointment_reminder', // Напоминание о записи на прием
  REVIEW_PUBLISHED = 'review_published', // Публикация отзыва
  REVIEW_LIKED = 'review_liked',        // Лайк отзыва
  COMMENT_REPLIED = 'comment_replied',  // Ответ на комментарий
}

/**
 * Шаблон уведомления
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationEventType;  // Тип события
  subject: string;              // Тема письма (для email)
  emailTemplate: string;        // HTML шаблон для email
  siteTemplate: string;         // Текст уведомления на сайте
  variables: string[];          // Список переменных, используемых в шаблоне
  createdAt: string;
  updatedAt: string;
}

/**
 * Уведомление
 */
export interface Notification {
  id: string;
  userId: string;              // ID пользователя, которому адресовано уведомление
  type: NotificationEventType; // Тип события
  title: string;               // Заголовок уведомления
  message: string;             // Текст уведомления
  isRead: boolean;             // Прочитано ли уведомление
  linkUrl?: string;            // Ссылка, связанная с уведомлением
  createdAt: string;
  updatedAt: string;
}

// Типы для избранного
export interface Favorites {
  articles: string[];
  services: string[];
  specialists: string[];
  [key: string]: string[];
}

// Типы API-ответов
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

/**
 * Расширенная информация о записи на прием для отображения в интерфейсе
 */
export interface AppointmentWithDetails extends Appointment {
  // Дополнительные поля для отображения на клиенте
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  serviceName?: string;
  specialistName?: string;
  service?: {
    id?: string;
    name?: string;
    price?: number;
    duration?: number;
  };
  specialist?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
  };
  createdAt?: string;
  updatedAt?: string;
} 