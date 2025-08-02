import nodemailer from 'nodemailer';
import { User, Specialist, Service, Appointment, Review, NotificationEventType, AppointmentStatus } from '@/models/types';
import { db } from '@/app/api/db';

// Интерфейс для настроек уведомлений
interface NotificationSettings {
  enabledTemplates?: {
    registration?: boolean;
    passwordReset?: boolean;
    appointmentCreated?: boolean;
    appointmentConfirmed?: boolean;
    appointmentCancelled?: boolean;
    appointmentReminder?: boolean;
    reviewPublished?: boolean;
    booking?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Функция для получения настроек уведомлений из базы данных
const getNotificationSettings = (): NotificationSettings => {
  try {
    // Получаем настройки уведомлений из таблицы settings
    const stmt = db.prepare('SELECT value FROM settings WHERE name = ?');
    const result = stmt.get('notifications') as { value: string } | undefined;
    
    if (result && result.value) {
      try {
        // Пробуем распарсить JSON из поля value
        const settings = JSON.parse(result.value);
        return settings;
      } catch (parseError) {
        console.error('Ошибка при парсинге настроек уведомлений:', parseError);
      }
    }
    
    // Если настройки не найдены или произошла ошибка парсинга, возвращаем настройки по умолчанию
    return {
      enabledTemplates: {
        registration: true,
        passwordReset: true,
        appointmentCreated: true,
        appointmentConfirmed: true,
        appointmentCancelled: true,
        appointmentReminder: true,
        reviewPublished: true,
        booking: true
      }
    };
  } catch (error) {
    console.error('Ошибка при получении настроек уведомлений из базы данных:', error);
    // В случае ошибки предполагаем, что все шаблоны включены
    return {
      enabledTemplates: {
        registration: true,
        passwordReset: true,
        appointmentCreated: true,
        appointmentConfirmed: true,
        appointmentCancelled: true,
        appointmentReminder: true,
        reviewPublished: true,
        booking: true
      }
    };
  }
};

// Функция для проверки, включено ли отправление для данного типа уведомлений
const isNotificationEnabled = (templateName: string): boolean => {
  const settings = getNotificationSettings();
  
  // Если настройки не определены или включено по умолчанию
  if (!settings.enabledTemplates) {
    return true;
  }
  
  // Проверяем, есть ли настройка для данного типа и выключена ли она явно
  return settings.enabledTemplates[templateName] !== false;
};

// Создаем транспортер для отправки почты
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'user@example.com',
      pass: process.env.SMTP_PASSWORD || 'password',
    },
  });

  return transporter;
};

/**
 * Отправляет электронное письмо пользователю
 * @param to Email получателя
 * @param subject Тема письма
 * @param htmlContent HTML содержимое письма
 * @returns Promise<void>
 */
export async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'info.vdohnovenie.pro@gmail.com',
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        ${htmlContent}
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/favicon.ico" width="16" height="16" style="margin-right: 5px; vertical-align: middle;" alt="" />
            &copy; Центр "Вдохновение". Все права защищены.
          </p>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

/**
 * Отправляет электронное письмо для восстановления пароля
 * @param to Email получателя
 * @param resetUrl URL для сброса пароля
 * @returns Promise<void>
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'info.vdohnovenie.pro@gmail.com',
    to,
    subject: 'Восстановление пароля - Вдохновение',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #48a9a6; text-align: center;">Восстановление пароля</h1>
        <p>Вы получили это письмо, потому что запросили восстановление пароля для вашей учетной записи на сайте "Вдохновение".</p>
        <p>Чтобы сбросить пароль, нажмите на кнопку ниже:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Сбросить пароль</a>
        </div>
        <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо. Ссылка действительна в течение 1 часа.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          &copy; Центр "Вдохновение". Все права защищены.
        </p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

/**
 * Отправляет электронное письмо для подтверждения адреса электронной почты
 * @param to Email получателя
 * @param verificationUrl URL для подтверждения
 * @returns Promise<void>
 */
export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'info.vdohnovenie.pro@gmail.com',
    to,
    subject: 'Подтверждение адреса электронной почты - Вдохновение',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #48a9a6; text-align: center;">Подтверждение почты</h1>
        <p>Благодарим за регистрацию на сайте "Вдохновение"!</p>
        <p>Для подтверждения вашего адреса электронной почты, нажмите на кнопку ниже:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Подтвердить Email</a>
        </div>
        <p>Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          &copy; Центр "Вдохновение". Все права защищены.
        </p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

/**
 * Отправляет уведомление о создании записи на прием
 * @param user Пользователь
 * @param appointment Запись на прием
 * @param specialist Специалист
 * @param service Услуга
 * @returns Promise<void>
 */
export async function sendAppointmentCreatedEmail(
  user: User, 
  appointment: Appointment, 
  specialist: Specialist, 
  service: Service
): Promise<void> {
  // Проверяем, включено ли отправление для данного типа уведомлений
  if (!isNotificationEnabled('appointmentCreated')) {
    console.log('Отправка уведомлений о создании записи отключена в настройках');
    return;
  }
  
  const dateStr = new Date(appointment.date).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const htmlContent = `
    <h1 style="color: #48a9a6; text-align: center;">Запись на прием создана</h1>
    <p>Уважаемый(ая) ${user.firstName} ${user.lastName},</p>
    <p>Ваша запись на прием успешно создана.</p>
    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Специалист:</strong> ${specialist.firstName} ${specialist.lastName}</p>
      <p><strong>Услуга:</strong> ${service.name}</p>
      <p><strong>Дата:</strong> ${dateStr}</p>
      <p><strong>Время:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
      <p><strong>Статус:</strong> ${getAppointmentStatusText(appointment.status)}</p>
    </div>
    <p>Вы получите уведомление, когда запись будет подтверждена специалистом.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/cabinet/appointments" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Перейти к моим записям</a>
    </div>
  `;
  
  await sendEmail(user.email, 'Запись на прием создана - Вдохновение', htmlContent);
}

/**
 * Отправляет уведомление о подтверждении записи на прием
 * @param user Пользователь
 * @param appointment Запись на прием
 * @param specialist Специалист
 * @param service Услуга
 * @returns Promise<void>
 */
export async function sendAppointmentConfirmedEmail(
  user: User, 
  appointment: Appointment, 
  specialist: Specialist, 
  service: Service
): Promise<void> {
  // Проверяем, включено ли отправление для данного типа уведомлений
  if (!isNotificationEnabled('appointmentConfirmed')) {
    console.log('Отправка уведомлений о подтверждении записи отключена в настройках');
    return;
  }
  
  const dateStr = new Date(appointment.date).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const htmlContent = `
    <h1 style="color: #48a9a6; text-align: center;">Запись на прием подтверждена</h1>
    <p>Уважаемый(ая) ${user.firstName} ${user.lastName},</p>
    <p>Ваша запись на прием была подтверждена специалистом.</p>
    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Специалист:</strong> ${specialist.firstName} ${specialist.lastName}</p>
      <p><strong>Услуга:</strong> ${service.name}</p>
      <p><strong>Дата:</strong> ${dateStr}</p>
      <p><strong>Время:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
      <p><strong>Статус:</strong> ${getAppointmentStatusText(appointment.status)}</p>
    </div>
    <p>Ждем вас в назначенное время в нашем центре!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/cabinet/appointments" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Перейти к моим записям</a>
    </div>
  `;
  
  await sendEmail(user.email, 'Запись на прием подтверждена - Вдохновение', htmlContent);
}

/**
 * Отправляет уведомление об отмене записи на прием
 * @param user Пользователь
 * @param appointment Запись на прием
 * @param specialist Специалист
 * @param service Услуга
 * @param reason Причина отмены (опционально)
 * @returns Promise<void>
 */
export async function sendAppointmentCancelledEmail(
  user: User, 
  appointment: Appointment, 
  specialist: Specialist, 
  service: Service,
  reason?: string
): Promise<void> {
  // Проверяем, включено ли отправление для данного типа уведомлений
  if (!isNotificationEnabled('appointmentCancelled')) {
    console.log('Отправка уведомлений об отмене записи отключена в настройках');
    return;
  }
  
  const dateStr = new Date(appointment.date).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const htmlContent = `
    <h1 style="color: #48a9a6; text-align: center;">Запись на прием отменена</h1>
    <p>Уважаемый(ая) ${user.firstName} ${user.lastName},</p>
    <p>Ваша запись на прием была отменена.</p>
    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Специалист:</strong> ${specialist.firstName} ${specialist.lastName}</p>
      <p><strong>Услуга:</strong> ${service.name}</p>
      <p><strong>Дата:</strong> ${dateStr}</p>
      <p><strong>Время:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
      ${reason ? `<p><strong>Причина отмены:</strong> ${reason}</p>` : ''}
    </div>
    <p>Вы можете создать новую запись в удобное для вас время.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/specialists" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Выбрать специалиста</a>
    </div>
  `;
  
  await sendEmail(user.email, 'Запись на прием отменена - Вдохновение', htmlContent);
}

/**
 * Отправляет уведомление-напоминание о предстоящей записи на прием
 * @param user Пользователь
 * @param appointment Запись на прием
 * @param specialist Специалист
 * @param service Услуга
 * @returns Promise<void>
 */
export async function sendAppointmentReminderEmail(
  user: User, 
  appointment: Appointment, 
  specialist: Specialist, 
  service: Service
): Promise<void> {
  // Проверяем, включено ли отправление для данного типа уведомлений
  if (!isNotificationEnabled('appointmentReminder')) {
    console.log('Отправка напоминаний о записи отключена в настройках');
    return;
  }
  
  const dateStr = new Date(appointment.date).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const htmlContent = `
    <h1 style="color: #48a9a6; text-align: center;">Напоминание о записи</h1>
    <p>Уважаемый(ая) ${user.firstName} ${user.lastName},</p>
    <p>Напоминаем, что у вас запланирован прием завтра.</p>
    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Специалист:</strong> ${specialist.firstName} ${specialist.lastName}</p>
      <p><strong>Услуга:</strong> ${service.name}</p>
      <p><strong>Дата:</strong> ${dateStr}</p>
      <p><strong>Время:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
    </div>
    <p>Ждем вас в назначенное время в нашем центре!</p>
    <p>Если вы не сможете прийти, пожалуйста, отмените запись заранее.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/cabinet/appointments" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Перейти к моим записям</a>
    </div>
  `;
  
  await sendEmail(user.email, 'Напоминание о записи - Вдохновение', htmlContent);
}

/**
 * Отправляет уведомление о публикации отзыва
 * @param user Пользователь
 * @param review Отзыв
 * @param specialist Специалист
 * @returns Promise<void>
 */
export async function sendReviewPublishedEmail(
  user: User, 
  review: Review, 
  specialist: Specialist
): Promise<void> {
  // Проверяем, включено ли отправление для данного типа уведомлений
  if (!isNotificationEnabled('reviewPublished')) {
    console.log('Отправка уведомлений о публикации отзывов отключена в настройках');
    return;
  }
  
  const htmlContent = `
    <h1 style="color: #48a9a6; text-align: center;">Ваш отзыв опубликован</h1>
    <p>Уважаемый(ая) ${user.firstName} ${user.lastName},</p>
    <p>Ваш отзыв о специалисте ${specialist.firstName} ${specialist.lastName} успешно опубликован на сайте.</p>
    <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Оценка:</strong> ${review.rating}/5</p>
      <p><strong>Текст отзыва:</strong> ${review.text}</p>
      <p><strong>Дата публикации:</strong> ${new Date(review.updatedAt).toLocaleDateString('ru-RU')}</p>
    </div>
    <p>Благодарим вас за ваш отзыв! Ваше мнение помогает нам становиться лучше.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/specialists/${specialist.id}" style="background-color: #48a9a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Перейти к странице специалиста</a>
    </div>
  `;
  
  await sendEmail(user.email, 'Ваш отзыв опубликован - Вдохновение', htmlContent);
}

/**
 * Возвращает текстовое описание статуса записи
 * @param status Статус записи
 * @returns Текстовое описание статуса
 */
function getAppointmentStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ожидает подтверждения';
    case 'confirmed':
      return 'Подтверждена';
    case 'completed':
      return 'Завершена';
    case 'cancelled':
      return 'Отменена';
    default:
      return status;
  }
}

/**
 * Отправляет тестовое письмо с заданным шаблоном
 * @param to Email получателя
 * @param templateName Имя шаблона уведомления
 * @param templateContent Содержимое шаблона
 * @returns Promise<void>
 */
export async function sendTestEmail(
  to: string, 
  templateName: string, 
  templateContent: string
): Promise<void> {
  const transporter = createTransporter();
  
  let subject = 'Тестовое письмо - Вдохновение';
  
  // Определяем тему письма в зависимости от типа шаблона
  switch (templateName) {
    case 'registration':
      subject = 'Регистрация в центре "Вдохновение"';
      break;
    case 'passwordReset':
      subject = 'Восстановление пароля - Вдохновение';
      break;
    case 'appointmentCreated':
      subject = 'Запись на прием создана - Вдохновение';
      break;
    case 'appointmentConfirmed':
      subject = 'Запись на прием подтверждена - Вдохновение';
      break;
    case 'appointmentCancelled':
      subject = 'Запись на прием отменена - Вдохновение';
      break;
    case 'appointmentReminder':
      subject = 'Напоминание о записи - Вдохновение';
      break;
    case 'reviewPublished':
      subject = 'Публикация отзыва - Вдохновение';
      break;
    case 'booking':
      subject = 'Ваша запись подтверждена - Вдохновение';
      break;
  }
  
  // Заполняем тестовые данные для переменных
  const processedContent = templateContent
    .replace(/{firstName}/g, 'Иван')
    .replace(/{lastName}/g, 'Иванов')
    .replace(/{email}/g, to)
    .replace(/{siteName}/g, 'Вдохновение')
    .replace(/{verificationUrl}/g, 'https://vdohnovenie.pro/verify-email?token=test')
    .replace(/{resetUrl}/g, 'https://vdohnovenie.pro/reset-password?token=test')
    .replace(/{serviceName}/g, 'Массаж спины')
    .replace(/{specialistName}/g, 'Петр Петров')
    .replace(/{date}/g, '15 мая 2023')
    .replace(/{startTime}/g, '10:00')
    .replace(/{endTime}/g, '11:00')
    .replace(/{price}/g, '2000')
    .replace(/{cancelReason}/g, 'По просьбе клиента')
    .replace(/{rating}/g, '5')
    .replace(/{reviewText}/g, 'Отличный специалист, рекомендую!')
    .replace(/{specialistUrl}/g, 'https://vdohnovenie.pro/specialists/1')
    .replace(/{siteUrl}/g, 'https://vdohnovenie.pro')
    .replace(/{sitePhone}/g, '+7 (999) 123-45-67')
    .replace(/{client_name}/g, 'Иван Иванов')
    .replace(/{service_name}/g, 'Массаж спины')
    .replace(/{date_time}/g, '15 мая 2023, 10:00-11:00')
    .replace(/{specialist_name}/g, 'Петр Петров');
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'info.vdohnovenie.pro@gmail.com',
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #48a9a6; text-align: center;">Тестовое письмо</h2>
        <p style="color: #666; font-style: italic; text-align: center; margin-bottom: 20px;">
          Это тестовое письмо для проверки шаблона "${templateName}"
        </p>
        <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; margin: 15px 0;">
          ${processedContent}
        </div>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
          Это письмо отправлено с целью тестирования шаблонов уведомлений центра "Вдохновение".
        </p>
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://vdohnovenie.pro'}/favicon.ico" width="16" height="16" style="margin-right: 5px; vertical-align: middle;" alt="" />
            &copy; Центр "Вдохновение". Все права защищены.
          </p>
        </div>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

/**
 * Отправляет электронное письмо с подтверждением бронирования
 * @param options - Объект с параметрами для подтверждения бронирования
 */
export async function sendBookingConfirmationEmail(options: {
  email: string;
  name: string;
  specialist: string;
  service: string;
  date: string;
  time: string;
  status: string;
  appointmentId: string;
  price?: string;
  to?: string;
  id?: string;
}): Promise<void> {
  try {
    const transporter = createTransporter();
    
    // Определяем статус для отображения клиенту
    let statusText = 'Подтверждено';
    if (options.status === 'pending') {
      statusText = 'Ожидает подтверждения';
    } else if (options.status === 'cancelled') {
      statusText = 'Отменено';
    }
    
    // Определяем заголовок письма в зависимости от статуса
    const subject = options.status === 'pending'
      ? 'Запрос на бронирование принят'
      : 'Бронирование подтверждено';
    
    // Формируем содержимое письма
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Информация о бронировании</h2>
        <p>Здравствуйте, ${options.name}!</p>
        
        <p>Ваше бронирование ${options.status === 'pending' ? 'принято и ожидает подтверждения' : 'подтверждено'}.</p>
        
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #444;">Детали бронирования:</h3>
          <p><strong>Услуга:</strong> ${options.service}</p>
          <p><strong>Специалист:</strong> ${options.specialist}</p>
          <p><strong>Дата:</strong> ${options.date}</p>
          <p><strong>Время:</strong> ${options.time}</p>
          ${options.price ? `<p><strong>Стоимость:</strong> ${options.price} руб.</p>` : ''}
          <p><strong>Статус:</strong> ${statusText}</p>
        </div>
        
        ${options.status === 'pending' ? `
          <p style="color: #666;">
            Администратор рассмотрит ваш запрос в ближайшее время и подтвердит бронирование.
            Вы получите уведомление по электронной почте, когда статус бронирования изменится.
          </p>
        ` : `
          <p style="color: #666;">
            Пожалуйста, приходите за 10-15 минут до начала приема.
          </p>
        `}
        
        <p>Если у вас возникли вопросы или вам нужно изменить или отменить бронирование, 
        пожалуйста, свяжитесь с нами по телефону или электронной почте.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 0.9em;">
          <p>С уважением, Команда Vdohnovenie</p>
          <p>Телефон: ${process.env.CONTACT_PHONE || '+7 (XXX) XXX-XX-XX'}</p>
          <p>Email: ${process.env.CONTACT_EMAIL || 'info@example.com'}</p>
        </div>
      </div>
    `;
    
    // Отправляем письмо
    const info = await transporter.sendMail({
      from: `"Vdohnovenie" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to: options.email || options.to,
      subject,
      html,
    });
    
    console.log(`[Email] Письмо с подтверждением бронирования отправлено: ${info.messageId}`);
    
  } catch (error) {
    console.error('[Email] Ошибка при отправке письма с подтверждением бронирования:', error);
    throw error;
  }
} 