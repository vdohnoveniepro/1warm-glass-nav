import { NextRequest, NextResponse } from 'next/server';
import { faqAdapter } from '@/database/adapters/faq';
import { CreateFAQRequest } from '@/types/faq';
import { logger } from '@/lib/logger';

// GET: получение списка FAQ
export async function GET() {
  try {
    logger.info('[API] Запрос на получение списка FAQ');
    
    // Получаем все FAQ из базы данных SQLite
    const faqs = faqAdapter.getAll();
    
    logger.info(`[API] Получено ${faqs.length} FAQ`);
    
    // Возвращаем массив FAQ напрямую
    return NextResponse.json(faqs);
  } catch (error) {
    logger.error('[API] Ошибка при получении FAQ:', error);
    return NextResponse.json(
      { success: false, message: 'Не удалось получить список FAQ' },
      { status: 500 }
    );
  }
}

// POST: создание нового FAQ
export async function POST(request: NextRequest) {
  try {
    logger.info('[API] Запрос на создание нового FAQ');
    
    const body: CreateFAQRequest = await request.json();
    
    // Проверка обязательных полей
    if (!body.question || !body.answer) {
      logger.warn('[API] Отклонено создание FAQ: отсутствуют обязательные поля');
      return NextResponse.json(
        { success: false, message: 'Вопрос и ответ являются обязательными полями' },
        { status: 400 }
      );
    }
    
    // Устанавливаем значение isActive по умолчанию, если оно не указано
    if (body.isActive === undefined) {
      body.isActive = 1;
    }
    
    // Создаем новый FAQ
    const newFAQ = faqAdapter.create(body);
    
    if (!newFAQ) {
      logger.error('[API] Ошибка при создании FAQ');
      return NextResponse.json(
        { success: false, message: 'Не удалось создать новый FAQ' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Создан новый FAQ с ID: ${newFAQ.id}`);
    
    return NextResponse.json({
      success: true,
      data: newFAQ,
    }, { status: 201 });
  } catch (error) {
    logger.error('[API] Ошибка при создании FAQ:', error);
    return NextResponse.json(
      { success: false, message: 'Не удалось создать новый FAQ' },
      { status: 500 }
    );
  }
} 