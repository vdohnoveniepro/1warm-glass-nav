import { NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH /api/admin/promos/[id]/status - изменение статуса промокода
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    // Проверка прав доступа
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    const { id } = params;
    const data = await request.json();
    
    // Проверяем наличие поля isActive
    if (data.isActive === undefined) {
      return NextResponse.json(
        { success: false, message: 'Не указан статус активности' },
        { status: 400 }
      );
    }
    
    // Проверяем существование промокода
    const existingPromo = db.prepare(`
      SELECT * FROM promos WHERE id = ?
    `).get(id);
    
    if (!existingPromo) {
      return NextResponse.json(
        { success: false, message: 'Промокод не найден' },
        { status: 404 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Обновляем статус промокода
    db.prepare(`
      UPDATE promos SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      // Явно проверяем, что isActive равно false
      data.isActive === false ? 0 : 1,
      now,
      id
    );
    
    return NextResponse.json({
      success: true,
      message: data.isActive 
        ? 'Промокод успешно активирован' 
        : 'Промокод успешно деактивирован'
    });
    
  } catch (error) {
    console.error('Ошибка при изменении статуса промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при изменении статуса промокода' },
      { status: 500 }
    );
  }
} 