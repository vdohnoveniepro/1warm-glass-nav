import { NextRequest, NextResponse } from 'next/server';
import { faqAdapter } from '@/database/adapters';
import { logger } from '@/lib/logger';

// PATCH: изменение порядка FAQ
export async function PATCH(request: NextRequest) {
  try {
    logger.info('[API] Запрос на изменение порядка FAQ');
    
    // Получаем данные из запроса
    const items = await request.json();
    
    if (!Array.isArray(items) || items.length === 0) {
      logger.warn('[API] Некорректные данные для изменения порядка FAQ');
      return NextResponse.json(
        { success: false, message: 'Некорректные данные для изменения порядка' },
        { status: 400 }
      );
    }
    
    // Проверяем формат данных
    const isValidFormat = items.every(item => 
      typeof item === 'object' && 
      item !== null && 
      'id' in item && 
      'order' in item &&
      typeof item.id === 'string' &&
      typeof item.order === 'number'
    );
    
    if (!isValidFormat) {
      logger.warn('[API] Некорректный формат данных для изменения порядка FAQ');
      return NextResponse.json(
        { success: false, message: 'Некорректный формат данных' },
        { status: 400 }
      );
    }
    
    // Обновляем порядок FAQ
    const updatedFAQs = faqAdapter.updateOrder(items);
    
    if (updatedFAQs.length === 0) {
      logger.error('[API] Ошибка при обновлении порядка FAQ');
      return NextResponse.json(
        { success: false, message: 'Не удалось обновить порядок FAQ' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Успешно обновлен порядок FAQ для ${items.length} элементов`);
    
    return NextResponse.json({
      success: true,
      data: updatedFAQs,
      message: 'Порядок FAQ успешно обновлен'
    });
  } catch (error) {
    logger.error('[API] Ошибка при изменении порядка FAQ:', error);
    return NextResponse.json(
      { success: false, message: 'Не удалось изменить порядок FAQ' },
      { status: 500 }
    );
  }
} 