import { NextResponse } from 'next/server';
import { db } from '@/database/db';

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

interface PromoService {
  promo_id: string;
  service_id: string;
}

// POST /api/promos/validate - проверка валидности промокода
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { code, serviceId } = data;
    
    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Не указан код промокода' },
        { status: 400 }
      );
    }
    
    // Получаем промокод по коду
    const promo = db.prepare(`
      SELECT * FROM promos
      WHERE code = ? AND is_active = 1
    `).get(code) as Promo | undefined;
    
    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Промокод не найден или неактивен' },
        { status: 404 }
      );
    }
    
    // Проверяем срок действия
    const now = new Date();
    const startDate = new Date(promo.start_date);
    
    if (startDate > now) {
      return NextResponse.json(
        { success: false, message: 'Промокод еще не активен' },
        { status: 400 }
      );
    }
    
    if (promo.end_date) {
      const endDate = new Date(promo.end_date);
      if (endDate < now) {
        return NextResponse.json(
          { success: false, message: 'Срок действия промокода истек' },
          { status: 400 }
        );
      }
    }
    
    // Проверяем количество использований
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return NextResponse.json(
        { success: false, message: 'Промокод достиг максимального количества использований' },
        { status: 400 }
      );
    }
    
    // Проверяем применимость к услуге, если указан serviceId
    if (serviceId) {
      // Сначала проверяем, есть ли у промокода связанные услуги
      const promoServices = db.prepare(`
        SELECT * FROM promo_services
        WHERE promo_id = ?
      `).all(promo.id) as PromoService[];
      
      // Если у промокода есть связанные услуги, проверяем, входит ли указанная услуга в список
      if (promoServices.length > 0) {
        const isApplicable = promoServices.some((ps) => ps.service_id === serviceId);
        
        if (!isApplicable) {
          return NextResponse.json(
            { success: false, message: 'Промокод не применим к выбранной услуге' },
            { status: 400 }
          );
        }
      }
      // Если у промокода нет связанных услуг, он применим ко всем услугам
    }
    
    // Возвращаем информацию о промокоде
    return NextResponse.json({
      success: true,
      data: {
        id: promo.id,
        code: promo.code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        description: promo.description
      }
    });
    
  } catch (error) {
    console.error('Ошибка при проверке промокода:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при проверке промокода' },
      { status: 500 }
    );
  }
} 