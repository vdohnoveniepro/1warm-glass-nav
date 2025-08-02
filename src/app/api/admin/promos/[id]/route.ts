import { NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { Promo, ServiceItem } from '@/types/promo';

// GET /api/admin/promos/[id] - получение промокода по ID
export async function GET(
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
    
    // Получаем промокод
    const promo = db.prepare(`
      SELECT * FROM promos WHERE id = ?
    `).get(id) as Promo;
    
    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Промокод не найден' },
        { status: 404 }
      );
    }
    
    // Получаем связанные услуги
    const services = db.prepare(`
      SELECT s.id, s.name as title
      FROM services s
      JOIN promo_services ps ON s.id = ps.service_id
      WHERE ps.promo_id = ?
    `).all(id) as ServiceItem[];
    
    promo.services = services;
    
    return NextResponse.json({ 
      success: true, 
      data: promo 
    });
  } catch (error) {
    console.error('Ошибка при получении промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении промокода' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/promos/[id] - обновление промокода
export async function PUT(
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
    
    // Проверяем обязательные поля
    if (!data.code || !data.discountType || !data.discountValue) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
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
    
    // Проверяем уникальность кода (если он изменился)
    const codeCheck = db.prepare(`
      SELECT * FROM promos WHERE code = ? AND id != ?
    `).all(data.code, id);
    
    if (codeCheck.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Промокод с таким кодом уже существует' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Обновляем промокод
    db.prepare(`
      UPDATE promos SET
        code = ?,
        description = ?,
        discount_type = ?,
        discount_value = ?,
        start_date = ?,
        end_date = ?,
        max_uses = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.code,
      data.description || '',
      data.discountType,
      data.discountValue,
      data.startDate || now,
      data.endDate || null,
      data.maxUses || null,
      // Явно проверяем, что isActive равно false
      data.isActive === false ? 0 : 1,
      now,
      id
    );
    
    // Обновляем связи с услугами
    // Сначала удаляем все существующие связи
    db.prepare(`DELETE FROM promo_services WHERE promo_id = ?`).run(id);
    
    // Затем добавляем новые связи
    if (data.services && Array.isArray(data.services) && data.services.length > 0) {
      const insertServiceStmt = db.prepare(`
        INSERT INTO promo_services (promo_id, service_id)
        VALUES (?, ?)
      `);
      
      for (const serviceId of data.services) {
        insertServiceStmt.run(id, serviceId);
      }
    }
    
    // Получаем обновленный промокод с услугами
    const promo = db.prepare(`
      SELECT * FROM promos WHERE id = ?
    `).get(id) as Promo;
    
    const services = db.prepare(`
      SELECT s.id, s.name as title
      FROM services s
      JOIN promo_services ps ON s.id = ps.service_id
      WHERE ps.promo_id = ?
    `).all(id) as ServiceItem[];
    
    promo.services = services;
    
    return NextResponse.json({
      success: true,
      data: promo,
      message: 'Промокод успешно обновлен'
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении промокода' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/promos/[id] - удаление промокода
export async function DELETE(
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
    
    // Удаляем связи с услугами
    db.prepare(`DELETE FROM promo_services WHERE promo_id = ?`).run(id);
    
    // Удаляем промокод
    db.prepare(`DELETE FROM promos WHERE id = ?`).run(id);
    
    return NextResponse.json({
      success: true,
      message: 'Промокод успешно удален'
    });
    
  } catch (error) {
    console.error('Ошибка при удалении промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении промокода' },
      { status: 500 }
    );
  }
} 