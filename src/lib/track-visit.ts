'use client';

import { v4 as uuidv4 } from 'uuid';

// Ключ для хранения sessionId в localStorage
const SESSION_ID_KEY = 'vdohnovenie_session_id';

/**
 * Получает или создает идентификатор сессии для пользователя
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return uuidv4(); // Для SSR генерируем новый ID
  }
  
  // Проверяем, есть ли уже sessionId в localStorage
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  // Если нет, создаем новый
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Отправляет информацию о посещении страницы на сервер
 * @param page - URL страницы или идентификатор страницы
 */
export async function trackPageVisit(page: string): Promise<void> {
  try {
    // Получаем sessionId
    const sessionId = getSessionId();
    
    // Получаем referrer
    const referrer = document.referrer || null;
    
    // Отправляем данные на сервер
    await fetch('/api/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        sessionId,
        referrer
      }),
    });
    
    console.log(`[Статистика] Посещение страницы ${page} успешно отслежено`);
  } catch (error) {
    console.error('[Статистика] Ошибка при отслеживании посещения:', error);
  }
} 