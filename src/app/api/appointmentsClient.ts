// API клиент для работы с записями
import { AppointmentStatus } from '@/models/types';

/**
 * Получить все записи текущего пользователя
 */
export async function getAppointments() {
  console.log('Запрос записей пользователя...');
  
  try {
    const response = await fetch('/api/appointments');
    
    console.log('Получен ответ от API:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      console.error(`Ошибка загрузки записей: ${response.status} ${response.statusText}`);
      
      // Пытаемся прочитать текст ошибки из ответа
      try {
        const errorText = await response.text();
        console.error('Текст ошибки:', errorText);
      } catch (e) {
        console.error('Не удалось прочитать текст ошибки');
      }
      
      throw new Error(`Ошибка загрузки записей: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('Данные ответа (структура):', {
      success: data.success,
      hasData: !!data.data,
      dataLength: data.data?.length,
      error: data.error
    });
    
    if (!data.success) {
      console.error('API вернул ошибку:', data.error);
      throw new Error(data.error || 'Ошибка при загрузке записей');
    }
    
    // Проверяем, пустой ли ответ
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.log('API вернул пустой список записей');
      return [];
    }
    
    console.log('Получены записи пользователя:', data.data.length);
    
    // Логирование примера записи для отладки
    if (data.data.length > 0) {
      console.log('Пример первой записи:', data.data[0]);
    }
    
    // Возвращаем данные как есть, без дополнительной обработки,
    // так как обработка уже сделана на стороне сервера
    return data.data;
  } catch (error) {
    console.error('Ошибка при загрузке записей:', error);
    throw error;
  }
}

/**
 * Отменить запись
 */
export async function cancelAppointment(appointmentId: string) {
  const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Ошибка при отмене записи');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Ошибка при отмене записи');
  }
  
  return data;
}

/**
 * Архивировать запись
 */
export async function archiveAppointment(appointmentId: string) {
  const response = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: AppointmentStatus.ARCHIVED }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('Ошибка при архивации записи:', {
      status: response.status,
      errorData
    });
    throw new Error(errorData?.error || `Ошибка при архивации записи: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Ошибка при архивации записи');
  }
  
  return data;
}

/**
 * Удалить запись из архива
 */
export async function deleteAppointment(appointmentId: string) {
  const response = await fetch(`/api/appointments/${appointmentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Ошибка при удалении записи');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Ошибка при удалении записи');
  }
  
  return data;
}

/**
 * Перенести запись на другое время
 */
export async function rescheduleAppointment(appointmentId: string, date: string, startTime: string, endTime: string) {
  const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, startTime, endTime }),
  });
  
  if (!response.ok) {
    throw new Error('Ошибка при переносе записи');
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Ошибка при переносе записи');
  }
  
  return data;
} 