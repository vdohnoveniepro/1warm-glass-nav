import { NextRequest, NextResponse } from 'next/server';
import { AppointmentStatus, ApiResponse } from '@/models/types';
import { getCurrentUser } from '@/lib/auth';
import { sendBookingConfirmationEmail } from '@/lib/email';
import fs from 'fs';
import path from 'path';
import { specialistsAdapter, appointmentsAdapter, servicesAdapter, bonusAdapter } from '@/database/adapters';
import { initDB } from '@/app/api/db';
import { db } from '@/database/db';

// Расширенный интерфейс записи для работы с ценой
interface AppointmentWithPrice {
  id: string;
  specialistId: string;
  serviceId?: string;
  userId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  price?: number;
  promoCode?: string;
  discountAmount?: number;
  originalPrice?: number;
  [key: string]: any;
}

// Интерфейс для промокода
interface Promo {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Интерфейс для связи промокода с услугой
interface PromoService {
  promo_id: string;
  service_id: string;
}

// Инициализируем базу данных
initDB();

// Проверка, требуется ли подтверждение администратором
const checkRequireConfirmation = (): boolean => {
  try {
    // В базе данных SQLite это настройка может храниться в таблице settings
    // Временно возвращаем значение по умолчанию - false (не требуется подтверждение)
    return false;
  } catch (error) {
    console.error('[API] Непредвиденная ошибка при проверке настроек:', error);
    return true;
  }
};

// Создание бронирования
export async function POST(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Обновляем структуру таблицы appointments
    updateAppointmentsTableStructure();
    
    // Получаем текущего пользователя
    const currentUser = await getCurrentUser();
    console.log('[API] appointments POST: Текущий пользователь:', currentUser?.email || 'не авторизован');
    
    // Получаем данные запроса
    const data = await request.json();
    console.log('[API] appointments POST: Получены данные:', JSON.stringify(data, null, 2));
    
    // Проверяем обязательные поля
    const requiredFields = [
      'specialistId', 
      'date', 
      'timeStart', 
      'timeEnd',
      'userName',
      'userEmail',
      'userPhone'
    ];
    
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      console.error('[API] appointments POST: Отсутствуют обязательные поля:', missingFields);
      const response: ApiResponse<null> = {
        success: false,
        error: `Отсутствуют обязательные поля: ${missingFields.join(', ')}`
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Если пользователь авторизован, добавляем его ID к записи
    if (currentUser) {
      data.userId = currentUser.id;
      console.log('[API] appointments POST: Добавлен userId авторизованного пользователя:', currentUser.id);
    }
    
    // Проверяем доступность специалиста на указанные дату и время
    const date = new Date(data.date);
    date.setHours(
      parseInt(data.timeStart.split(':')[0], 10),
      parseInt(data.timeStart.split(':')[1], 10)
    );
    
    console.log('[API] appointments POST: Проверка доступности специалиста:', {
      specialistId: data.specialistId,
      date: date.toISOString(),
      formattedDate: data.date,
      timeStart: data.timeStart,
      timeEnd: data.timeEnd
    });
    
    try {
      // Используем формат даты YYYY-MM-DD для проверки доступности
      const dateStr = data.date.split('T')[0]; // Если дата в формате ISO, извлекаем только дату
      
      // TODO: Заменить на проверку доступности из адаптера specialistsAdapter
      // Временно предполагаем, что специалист доступен
      const availability = { available: true };
      
      console.log('[API] appointments POST: Результат проверки доступности:', availability);
      
      if (!availability.available) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Специалист недоступен в указанное время'
        };
        return NextResponse.json(response, { status: 400 });
      }
    } catch (availabilityError) {
      console.error('[API] appointments POST: Ошибка при проверке доступности:', availabilityError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Ошибка при проверке доступности специалиста'
      };
      return NextResponse.json(response, { status: 500 });
    }
    
    // Обрабатываем промокод, если он указан
    let finalPrice = data.price || 0;
    let discountAmount = 0;
    let promoCodeInfo = null;
    
    if (data.promoCode && data.serviceId) {
      try {
        console.log('[API] appointments POST: Проверка промокода:', data.promoCode);
        
        // Получаем промокод из базы данных
        const promo = db.prepare(`
          SELECT * FROM promos
          WHERE code = ? AND is_active = 1
        `).get(data.promoCode) as Promo | undefined;
        
        if (promo) {
          // Проверяем срок действия промокода
          const now = new Date();
          const startDate = new Date(promo.start_date);
          let isValid = startDate <= now;
          
          if (promo.end_date) {
            const endDate = new Date(promo.end_date);
            isValid = isValid && endDate >= now;
          }
          
          // Проверяем количество использований
          if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            isValid = false;
          }
          
          // Проверяем применимость к услуге
          let isApplicable = true;
          const promoServices = db.prepare(`
            SELECT * FROM promo_services
            WHERE promo_id = ?
          `).all(promo.id) as PromoService[];
          
          if (promoServices.length > 0) {
            isApplicable = promoServices.some((ps) => ps.service_id === data.serviceId);
          }
          
          if (isValid && isApplicable) {
            // Рассчитываем скидку
            if (promo.discount_type === 'percentage') {
              discountAmount = (data.price * promo.discount_value) / 100;
            } else {
              discountAmount = promo.discount_value;
            }
            
            // Ограничиваем скидку ценой услуги
            discountAmount = Math.min(discountAmount, data.price);
            
            // Рассчитываем финальную цену
            finalPrice = data.price - discountAmount;
            
            // Увеличиваем счетчик использований промокода
            db.prepare(`
              UPDATE promos
              SET current_uses = current_uses + 1
              WHERE id = ?
            `).run(promo.id);
            
            promoCodeInfo = {
              id: promo.id,
              code: promo.code,
              discountType: promo.discount_type,
              discountValue: promo.discount_value,
              discountAmount: discountAmount
            };
            
            console.log('[API] appointments POST: Промокод применен:', {
              code: promo.code,
              originalPrice: data.price,
              discount: discountAmount,
              finalPrice: finalPrice
            });
          } else {
            console.log('[API] appointments POST: Промокод не действителен или не применим к услуге');
          }
        } else {
          console.log('[API] appointments POST: Промокод не найден');
        }
      } catch (promoError) {
        console.error('[API] appointments POST: Ошибка при обработке промокода:', promoError);
        // Не блокируем создание записи из-за ошибки с промокодом
      }
    }
    
    // Собираем всю пользовательскую информацию в поле notes
    const userInfo = JSON.stringify({
      name: data.userName,
      email: data.userEmail,
      phone: data.userPhone,
      serviceName: data.serviceName,
      specialistName: data.specialistName,
      additionalNotes: data.notes || '',
      promoCode: data.promoCode || null,
      originalPrice: data.price || 0,
      discountAmount: discountAmount,
      finalPrice: finalPrice
    });
    
    // Проверяем, требуется ли подтверждение администратором
    const requireConfirmation = checkRequireConfirmation();
    console.log(`[API] appointments POST: Требуется подтверждение администратором: ${requireConfirmation}`);
    
    // Определяем начальный статус записи на основе настройки
    const initialStatus = requireConfirmation 
      ? AppointmentStatus.PENDING  // Ожидает подтверждения, если требуется подтверждение
      : AppointmentStatus.CONFIRMED; // Автоматически подтверждаем, если подтверждение не требуется
    
    // Создаем запись, используя адаптер appointmentsAdapter
    const appointmentData = {
      specialistId: data.specialistId,
      serviceId: data.serviceId || "",
      userId: data.userId || "",
      date: data.date,
      startTime: data.timeStart,
      endTime: data.timeEnd,
      userName: data.userName,
      userPhone: data.userPhone,
      status: initialStatus,
      comment: userInfo,
      price: finalPrice,
      promoCode: data.promoCode || null,
      discountAmount: discountAmount,
      originalPrice: data.price || 0,
      bonusAmount: data.bonusAmount || 0
    };
    
    // Создаем запись через адаптер SQLite
    const newAppointment = appointmentsAdapter.create(appointmentData);
    
    // Если запись создана успешно
    if (newAppointment) {
      // Если указан userId и количество бонусов для списания, обрабатываем бонусы
      if (newAppointment.userId && newAppointment.bonusAmount && newAppointment.bonusAmount > 0) {
        try {
          const bonusToSpend = newAppointment.bonusAmount;
          console.log(`[API] appointments POST: Списание ${bonusToSpend} бонусов для пользователя ${newAppointment.userId}`);
          
          // Проверяем баланс бонусов пользователя
          const userBalance = bonusAdapter.getUserBalance(newAppointment.userId);
          console.log(`[API] appointments POST: Текущий баланс пользователя: ${userBalance} бонусов`);
          
          if (userBalance >= bonusToSpend) {
            // Списываем бонусы со статусом "completed" (немедленное списание)
            const transaction = bonusAdapter.spendBonus(newAppointment.userId, bonusToSpend, newAppointment.id);
            console.log(`[API] appointments POST: Бонусы успешно списаны: ${bonusToSpend} ₽, ID транзакции: ${transaction.id}`);
            
            // Проверяем обновленный баланс
            const updatedBalance = bonusAdapter.getUserBalance(newAppointment.userId);
            console.log(`[API] appointments POST: Обновленный баланс после списания: ${updatedBalance} бонусов`);
          } else {
            console.error(`[API] appointments POST: Недостаточно бонусов для списания. Запрошено: ${bonusToSpend}, доступно: ${userBalance}`);
          }
        } catch (bonusError) {
          console.error('[API] appointments POST: Ошибка при списании бонусов:', bonusError);
          // Не блокируем создание записи из-за ошибки с бонусами
        }
      }
      
      // Если у записи есть userId и цена услуги больше 0, начисляем бонусы
      if (newAppointment.userId && finalPrice > 0) {
        try {
          // Начисляем бонусы за бронирование (в статусе pending)
          const bonusTransaction = bonusAdapter.addBookingBonus(
            newAppointment.userId,
            newAppointment.id
          );
          
          console.log('[API] appointments POST: Начислены бонусы за бронирование:', {
            userId: newAppointment.userId,
            appointmentId: newAppointment.id,
            bonusAmount: bonusTransaction.amount,
            status: bonusTransaction.status
          });
        } catch (bonusError) {
          console.error('[API] appointments POST: Ошибка при начислении бонусов:', bonusError);
          // Не блокируем создание записи из-за ошибки с бонусами
        }
      }
      
      try {
        // Отправляем письмо с подтверждением
        const specialist = specialistsAdapter.getById(data.specialistId);
        const service = data.serviceId ? servicesAdapter.getById(data.serviceId) : null;
        
        console.log('[API] appointments POST: Отправка письма подтверждения', {
          email: data.userEmail,
          name: data.userName,
          specialist: specialist ? `${specialist.firstName} ${specialist.lastName}` : 'Неизвестный специалист',
          service: service ? service.name : 'Консультация',
          date: data.date,
          time: `${data.timeStart} - ${data.timeEnd}`,
          price: finalPrice
        });
        
        await sendBookingConfirmationEmail({
          email: data.userEmail,
          name: data.userName,
          specialist: specialist ? `${specialist.firstName} ${specialist.lastName}` : 'Неизвестный специалист',
          service: service ? service.name : 'Консультация',
          date: data.date,
          time: `${data.timeStart} - ${data.timeEnd}`,
          status: requireConfirmation ? 'pending' : 'confirmed',
          appointmentId: newAppointment.id,
          price: finalPrice.toString(),
          originalPrice: data.promoCode ? data.price.toString() : undefined,
          discountAmount: data.promoCode ? discountAmount.toString() : undefined,
          promoCode: data.promoCode || undefined,
          to: data.userEmail,
          id: newAppointment.id
        });
      } catch (emailError) {
        console.error('[API] appointments POST: Ошибка при отправке письма:', emailError);
        // Не блокируем создание записи из-за ошибки с письмом
      }
    }
    
    // Добавляем информацию о промокоде в ответ
    const responseData = {
      ...newAppointment,
      promoCodeInfo
    };
    
    const response: ApiResponse<typeof responseData> = {
      success: true,
      data: responseData
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API] appointments POST: Ошибка при создании записи:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Ошибка при создании записи на прием'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// Проверяем и обновляем структуру таблицы appointments
const updateAppointmentsTableStructure = () => {
  try {
    // Проверяем, есть ли колонки price и originalPrice
    const columnsInfo = db.prepare("PRAGMA table_info(appointments)").all();
    const hasPriceColumn = columnsInfo.some((column: any) => column.name === 'price');
    const hasOriginalPriceColumn = columnsInfo.some((column: any) => column.name === 'originalPrice');
    
    if (!hasPriceColumn) {
      console.log('Добавляем колонку price в таблицу appointments');
      db.prepare("ALTER TABLE appointments ADD COLUMN price REAL DEFAULT 0").run();
    }
    
    if (!hasOriginalPriceColumn) {
      console.log('Добавляем колонку originalPrice в таблицу appointments');
      db.prepare("ALTER TABLE appointments ADD COLUMN originalPrice REAL DEFAULT 0").run();
    }
  } catch (error) {
    console.error('Ошибка при обновлении структуры таблицы appointments:', error);
  }
};

// Получение всех записей
export async function GET(request: NextRequest) {
  try {
    // Инициализируем базу данных
    initDB();
    
    // Обновляем структуру таблицы appointments
    updateAppointmentsTableStructure();
    
    // Получаем текущего пользователя
    const currentUser = await getCurrentUser();
    console.log('[API] appointments GET: Текущий пользователь:', currentUser?.email || 'не авторизован');

    // Если пользователь не авторизован, возвращаем пустой список
    if (!currentUser) {
      console.log('[API] appointments GET: Пользователь не авторизован, возвращаем пустой список');
      return NextResponse.json({
        success: true,
        data: []
      });
    }
    
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const specialistId = searchParams.get('specialistId');
    const userId = searchParams.get('userId');
    const serviceId = searchParams.get('serviceId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    console.log('[API] appointments GET: Параметры фильтрации:', {
      status, specialistId, userId, serviceId, dateFrom, dateTo
    });
    
    // Определяем, какие записи должен видеть текущий пользователь
    const isAdmin = currentUser.role === 'admin' || (Array.isArray(currentUser.roles) && currentUser.roles.includes('admin'));
    const isSpecialist = currentUser.specialistId || currentUser.role === 'specialist' || (Array.isArray(currentUser.roles) && currentUser.roles.includes('specialist'));
    
    console.log('[API] appointments GET: Роли пользователя:', {
      isAdmin, isSpecialist, specialistId: currentUser.specialistId
    });

    // Если не указан userId, используем ID текущего пользователя (для обычных пользователей)
    // Для админов и специалистов можно не указывать userId, чтобы получить все записи
    let effectiveUserId = userId;
    if (!isAdmin && !isSpecialist && !userId) {
      effectiveUserId = currentUser.id;
      console.log('[API] appointments GET: Задан effectiveUserId:', effectiveUserId);
    }
    
    // Если текущий пользователь - специалист, и не указан specialistId, используем его ID
    let effectiveSpecialistId = specialistId;
    if (isSpecialist && !isAdmin && !specialistId && currentUser.specialistId) {
      effectiveSpecialistId = currentUser.specialistId;
      console.log('[API] appointments GET: Задан effectiveSpecialistId:', effectiveSpecialistId);
    }
    
    // Получаем записи на прием
    let appointments = appointmentsAdapter.getAll();
    
    // Текущая дата и время для фильтрации записей
    const now = new Date();
    console.log('[API] Текущая дата и время:', now.toISOString());
    
    // Группируем записи по статусу (предстоящие, прошедшие, отмененные)
    const grouped = {
      upcoming: appointments.filter(app => {
        const appointmentDate = new Date(`${app.date}T${app.startTime}`);
        return (
          (app.status === AppointmentStatus.PENDING || app.status === AppointmentStatus.CONFIRMED) &&
          appointmentDate > now
        );
      }),
      past: appointments.filter(app => {
        const appointmentDate = new Date(`${app.date}T${app.startTime}`);
        return (
          (app.status === AppointmentStatus.COMPLETED || 
          (app.status === AppointmentStatus.CONFIRMED && appointmentDate <= now))
        );
      }),
      cancelled: appointments.filter(app => 
        app.status === AppointmentStatus.CANCELLED || app.status === AppointmentStatus.ARCHIVED
      )
    };
    
    console.log('[API] Группировка записей:', {
      предстоящие: grouped.upcoming.length,
      прошедшие: grouped.past.length,
      отмененные: grouped.cancelled.length
    });
    
    // Убедимся, что appointments всегда является массивом
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    
    // Перед отправкой дополним цену, если она отсутствует
    const appointmentsWithPrice = safeAppointments.map(app => {
      // Приводим к расширенному типу с ценой
      const appointment = app as AppointmentWithPrice;
      
      // Если цена не определена, устанавливаем в 0
      if (appointment.price === undefined || appointment.price === null) {
        return { ...appointment, price: 0 };
      }
      return appointment;
    });
    
    // Возвращаем всё вместе с Success: true
    console.log('[API] Возвращаем записей:', appointmentsWithPrice.length);
    return NextResponse.json({
      success: true,
      data: appointmentsWithPrice,
      meta: {
        total: appointmentsWithPrice.length,
        grouped: {
          upcoming: grouped.upcoming.length,
          past: grouped.past.length,
          cancelled: grouped.cancelled.length
        }
      }
    });
  } catch (error) {
    console.error('[API] appointments GET: Ошибка при получении записей:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении записей на прием' }, 
      { status: 500 }
    );
  }
} 