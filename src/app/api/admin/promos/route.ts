import { NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { Promo, ServiceItem } from '@/types/promo';

// GET /api/admin/promos - получение всех промокодов
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Проверка прав доступа
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Получаем все промокоды
    const promos = db.prepare(`
      SELECT * FROM promos
      ORDER BY created_at DESC
    `).all() as Promo[];
    
    console.log('Промокоды из базы данных:', promos);
    
    // Получаем связанные услуги для каждого промокода
    for (const promo of promos) {
      const services = db.prepare(`
        SELECT s.id, s.name as title
        FROM services s
        JOIN promo_services ps ON s.id = ps.service_id
        WHERE ps.promo_id = ?
      `).all(promo.id) as ServiceItem[];
      
      promo.services = services;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: promos 
    });
  } catch (error) {
    console.error('Ошибка при получении промокодов:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении промокодов' },
      { status: 500 }
    );
  }
}

// POST /api/admin/promos - создание нового промокода
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    // Проверка прав доступа
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    console.log('Полученные данные для создания промокода:', data);
    
    // Проверяем обязательные поля
    if (!data.code || !data.discountType || !data.discountValue) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }
    
    // Проверяем уникальность кода
    const existingPromos = db.prepare(`
      SELECT * FROM promos WHERE code = ?
    `).all(data.code);
    
    if (existingPromos.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Промокод с таким кодом уже существует' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    const promoId = uuidv4();
    
    // Проверяем значение isActive
    // Явно проверяем, что isActive равно false
    const isActiveValue = data.isActive === false ? 0 : 1;
    console.log('Значение isActive:', data.isActive, 'Преобразовано в:', isActiveValue, 'Тип:', typeof data.isActive);
    
    // Создаем промокод
    db.prepare(`
      INSERT INTO promos (
        id, code, description, discount_type, discount_value, 
        start_date, end_date, max_uses, current_uses, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      promoId,
      data.code,
      data.description || '',
      data.discountType,
      data.discountValue,
      data.startDate || now,
      data.endDate || null,
      data.maxUses || null,
      0,
      isActiveValue,
      now,
      now
    );
    
    // Связываем с услугами
    if (data.services && Array.isArray(data.services) && data.services.length > 0) {
      const insertServiceStmt = db.prepare(`
        INSERT INTO promo_services (promo_id, service_id)
        VALUES (?, ?)
      `);
      
      for (const serviceId of data.services) {
        insertServiceStmt.run(promoId, serviceId);
      }
    }
    
    // Получаем созданный промокод с услугами
    const promo = db.prepare(`
      SELECT * FROM promos WHERE id = ?
    `).get(promoId) as Promo;
    
    const services = db.prepare(`
      SELECT s.id, s.name as title
      FROM services s
      JOIN promo_services ps ON s.id = ps.service_id
      WHERE ps.promo_id = ?
    `).all(promoId) as ServiceItem[];
    
    promo.services = services;
    
    return NextResponse.json({
      success: true,
      data: promo,
      message: 'Промокод успешно создан'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Ошибка при создании промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании промокода' },
      { status: 500 }
    );
  }
} 