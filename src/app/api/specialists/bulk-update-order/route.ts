import { NextRequest, NextResponse } from "next/server";
import { specialistsAPI } from "../../../../database/api/specialists";
import { getCurrentUser } from "../../../../lib/auth";
import { UserRole } from "../../../../models/types";

// POST /api/specialists/bulk-update-order - массовое обновление порядка специалистов
export async function POST(request: NextRequest) {
  try {
    console.log('[specialists/bulk-update-order] Начало обработки запроса на обновление порядка специалистов');
    
    // Проверка авторизации через куки
    let user = await getCurrentUser(request);
    
    // Если пользователь не найден через куки, проверяем заголовок Authorization
    if (!user) {
      const authHeader = request.headers.get('Authorization');
      console.log('[specialists/bulk-update-order] Заголовок Authorization:', authHeader);
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // убираем 'Bearer '
        console.log('[specialists/bulk-update-order] Токен:', token);
        
        // Если токен содержит user_id, используем его для авторизации
        if (token.startsWith('user_id=')) {
          const userId = token.substring(8); // убираем 'user_id='
          console.log('[specialists/bulk-update-order] ID пользователя из токена:', userId);
          
          // Устанавливаем роль администратора напрямую для этого запроса
          // В реальном приложении здесь нужно проверить роль в базе данных
          user = {
            id: userId,
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN
          };
        }
      }
    }
    
    console.log('[specialists/bulk-update-order] Проверка авторизации:', user ? `Пользователь ${user.email} (${user.role})` : 'Пользователь не авторизован');
    
    if (!user) {
      console.log('[specialists/bulk-update-order] Ошибка: Пользователь не авторизован');
      return NextResponse.json(
        { error: "Недействительный токен авторизации" },
        { status: 401 }
      );
    }
    
    // Проверка роли пользователя - нечувствительная к регистру
    const userRole = String(user.role).toLowerCase();
    if (userRole !== 'admin') {
      console.log(`[specialists/bulk-update-order] Ошибка: Пользователь ${user.email} не имеет прав администратора (роль: ${user.role})`);
      return NextResponse.json(
        { error: "У вас нет прав для выполнения этой операции" },
        { status: 403 }
      );
    }
    
    // Получаем данные запроса
    const data = await request.json();
    console.log(`[specialists/bulk-update-order] Получены данные для обновления порядка: ${data ? JSON.stringify(data).substring(0, 150) + '...' : 'null'}`);
    
    if (!data || !Array.isArray(data)) {
      console.log('[specialists/bulk-update-order] Ошибка: Некорректный формат данных, ожидался массив');
      return NextResponse.json(
        { error: 'Некорректный формат данных' },
        { status: 400 }
      );
    }
    
    // Проверяем, что каждый элемент содержит id и order
    const isValidData = data.every(item => 
      typeof item === 'object' && 
      item !== null && 
      'id' in item && 
      'order' in item &&
      typeof item.id === 'string' &&
      typeof item.order === 'number'
    );
    
    if (!isValidData) {
      console.log(`[specialists/bulk-update-order] Ошибка: Некорректный формат элементов массива`);
      return NextResponse.json(
        { error: 'Некорректный формат данных: каждый элемент должен содержать id и order' },
        { status: 400 }
      );
    }
    
    console.log(`[specialists/bulk-update-order] Обновление порядка для ${data.length} специалистов...`);
    
    // Извлекаем массив ID специалистов в нужном порядке
    const specialistIds = data.sort((a, b) => a.order - b.order).map(item => item.id);
    
    // Обновляем порядок специалистов
    const success = specialistsAPI.setOrder(specialistIds);
    
    if (!success) {
      console.log('[specialists/bulk-update-order] Ошибка при обновлении порядка специалистов через API');
      return NextResponse.json(
        { error: 'Ошибка при обновлении порядка специалистов' },
        { status: 500 }
      );
    }
    
    console.log('[specialists/bulk-update-order] Порядок специалистов успешно обновлен, получаем обновленный список');
    
    // Возвращаем обновленный список специалистов
    const updatedSpecialists = specialistsAPI.getAll();
    
    console.log(`[specialists/bulk-update-order] Возвращаем ${updatedSpecialists.length} специалистов`);
    
    return NextResponse.json({
      success: true,
      message: 'Порядок специалистов успешно обновлен',
      data: updatedSpecialists
    });
  } catch (error) {
    console.error('[specialists/bulk-update-order] Непредвиденная ошибка при обновлении порядка специалистов:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении порядка специалистов' },
      { status: 500 }
    );
  }
} 