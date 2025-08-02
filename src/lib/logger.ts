/**
 * Простой модуль для логирования в приложении.
 * Централизует обработку логов и предоставляет единый интерфейс для всех компонентов.
 */

// Уровни логирования
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

// Класс логгера
class Logger {
  private logToConsole(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Логирование информационных сообщений
   * @param message Сообщение для логирования
   */
  public info(message: string): void {
    this.logToConsole(LOG_LEVELS.INFO, message);
  }

  /**
   * Логирование предупреждений
   * @param message Сообщение для логирования
   */
  public warn(message: string): void {
    this.logToConsole(LOG_LEVELS.WARN, message);
  }

  /**
   * Логирование ошибок
   * @param message Сообщение для логирования
   */
  public error(message: string): void {
    this.logToConsole(LOG_LEVELS.ERROR, message);
  }

  /**
   * Логирование отладочной информации
   * @param message Сообщение для логирования
   */
  public debug(message: string): void {
    if (process.env.DEBUG) {
      this.logToConsole(LOG_LEVELS.DEBUG, message);
    }
  }
}

// Экспортируем единственный экземпляр логгера
export const logger = new Logger();

/**
 * Простой логгер для записи действий пользователей
 */

// Типы логируемых действий
export type LogAction = 
  | 'service_created'
  | 'service_updated'
  | 'service_deleted'
  | 'service_archived'
  | 'service_unarchived'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_deleted'
  | 'appointment_status_changed'
  | 'specialist_created'
  | 'specialist_updated'
  | 'specialist_deleted'
  | 'user_login'
  | 'user_logout'
  | 'user_registered';

/**
 * Логирует действие пользователя
 * @param userId ID пользователя, выполнившего действие
 * @param action Тип действия
 * @param data Дополнительные данные о действии
 */
export function logAction(userId: string, action: LogAction, data?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    userId,
    action,
    data
  };
  
  // Выводим в консоль для отладки
  console.log(`[AUDIT] ${timestamp} | Пользователь ${userId} | Действие: ${action}`, data || '');
  
  // В реальном приложении здесь был бы код для сохранения лога в БД или файл
} 