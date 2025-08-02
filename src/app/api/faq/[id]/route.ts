import { NextRequest, NextResponse } from 'next/server';
import { faqAdapter } from '@/database/adapters/faq';
import { UpdateFAQRequest } from '@/types/faq';
import { logger } from '@/lib/logger';

// GET: получение FAQ по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    logger.info(`[API] Запрос на получение FAQ с ID: ${id}`);
    
    const faq = faqAdapter.getById(id);
    
    if (!faq) {
      logger.warn(`[API] FAQ с ID ${id} не найден`);
      return NextResponse.json(
        { success: false, message: 'FAQ не найден' },
        { status: 404 }
      );
    }
    
    logger.info(`[API] Успешно получен FAQ с ID: ${id}`);
    return NextResponse.json(faq);
  } catch (error) {
    logger.error(`[API] Ошибка при получении FAQ с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, message: 'Не удалось получить FAQ' },
      { status: 500 }
    );
  }
}

// PATCH: обновление FAQ
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    logger.info(`[API] Запрос на обновление FAQ с ID: ${id}`);
    
    // Проверяем существование FAQ
    const existingFAQ = faqAdapter.getById(id);
    
    if (!existingFAQ) {
      logger.warn(`[API] Попытка обновления несуществующего FAQ с ID ${id}`);
      return NextResponse.json(
        { success: false, message: 'FAQ не найден' },
        { status: 404 }
      );
    }
    
    const body: UpdateFAQRequest = await request.json();
    
    // Обновляем FAQ
    const updatedFAQ = faqAdapter.update(id, body);
    
    if (!updatedFAQ) {
      logger.error(`[API] Ошибка при обновлении FAQ с ID ${id}`);
      return NextResponse.json(
        { success: false, message: 'Не удалось обновить FAQ' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Успешно обновлен FAQ с ID: ${id}`);
    return NextResponse.json({
      success: true,
      data: updatedFAQ
    });
  } catch (error) {
    logger.error(`[API] Ошибка при обновлении FAQ с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, message: 'Не удалось обновить FAQ' },
      { status: 500 }
    );
  }
}

// DELETE: удаление FAQ
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    logger.info(`[API] Запрос на удаление FAQ с ID: ${id}`);
    
    // Проверяем существование FAQ
    const existingFAQ = faqAdapter.getById(id);
    
    if (!existingFAQ) {
      logger.warn(`[API] Попытка удаления несуществующего FAQ с ID ${id}`);
      return NextResponse.json(
        { success: false, message: 'FAQ не найден' },
        { status: 404 }
      );
    }
    
    // Удаляем FAQ
    const deleted = faqAdapter.delete(id);
    
    if (!deleted) {
      logger.error(`[API] Ошибка при удалении FAQ с ID ${id}`);
      return NextResponse.json(
        { success: false, message: 'Не удалось удалить FAQ' },
        { status: 500 }
      );
    }
    
    logger.info(`[API] Успешно удален FAQ с ID: ${id}`);
    return NextResponse.json({
      success: true,
      message: 'FAQ успешно удален'
    });
  } catch (error) {
    logger.error(`[API] Ошибка при удалении FAQ с ID ${params.id}:`, error);
    return NextResponse.json(
      { success: false, message: 'Не удалось удалить FAQ' },
      { status: 500 }
    );
  }
} 