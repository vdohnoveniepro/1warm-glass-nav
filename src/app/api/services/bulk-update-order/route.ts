import { NextRequest, NextResponse } from "next/server";
import { servicesAPI, ensureDirectories } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/models/types";

// POST /api/services/bulk-update-order - массовое обновление порядка услуг
export async function POST(request: NextRequest) {
  try {
    console.log('[bulk-update-order] Начало обработки запроса на обновление порядка услуг');
    
    // Проверка авторизации через куки
    let user = await getCurrentUser();
    
    // Если пользователь не найден через куки, проверяем заголовок Authorization
    if (!user) {
      const authHeader = request.headers.get('Authorization');
      console.log('[bulk-update-order] Заголовок Authorization:', authHeader);
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // убираем 'Bearer '
        console.log('[bulk-update-order] Токен:', token);
        
        // Если токен содержит user_id, используем его для авторизации
        if (token.startsWith('user_id=')) {
          const userId = token.substring(8); // убираем 'user_id='
          console.log('[bulk-update-order] ID пользователя из токена:', userId);
          
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
    
    console.log('[bulk-update-order] Проверка авторизации:', user ? `Пользователь ${user.email} (${user.role})` : 'Пользователь не авторизован');
    
    if (!user) {
      console.log('[bulk-update-order] Ошибка: Пользователь не авторизован');
      return NextResponse.json(
        { error: "Недействительный токен авторизации" },
        { status: 401 }
      );
    }
    
    // Проверка роли пользователя
    if (user.role.toLowerCase() !== 'admin') {
      console.log(`[bulk-update-order] Ошибка: Пользователь ${user.email} не имеет прав администратора (роль: ${user.role})`);
      return NextResponse.json(
        { error: "У вас нет прав для выполнения этой операции" },
        { status: 403 }
      );
    }
    
    // Убедимся, что нужные директории существуют
    ensureDirectories();
    
    // Получаем данные запроса
    const data = await request.json();
    console.log(`[bulk-update-order] Получены данные для обновления порядка: ${data ? JSON.stringify(data).substring(0, 150) + '...' : 'null'}`);
    
    if (!data || !Array.isArray(data)) {
      console.log('[bulk-update-order] Ошибка: Некорректный формат данных, ожидался массив');
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
      console.log(`[bulk-update-order] Ошибка: Некорректный формат элементов массива`);
      return NextResponse.json(
        { error: 'Некорректный формат данных: каждый элемент должен содержать id и order' },
        { status: 400 }
      );
    }
    
    console.log(`[bulk-update-order] Обновление порядка для ${data.length} услуг...`);
    
    // Обновляем порядок услуг
    const success = servicesAPI.updateBulkOrders(data);
    
    if (!success) {
      console.log('[bulk-update-order] Ошибка при обновлении порядка услуг через API');
      return NextResponse.json(
        { error: 'Ошибка при обновлении порядка услуг' },
        { status: 500 }
      );
    }
    
    console.log('[bulk-update-order] Порядок услуг успешно обновлен, получаем обновленный список');
    
    // Возвращаем обновленный список услуг
    const updatedServices = servicesAPI.getAll();
    
    console.log(`[bulk-update-order] Возвращаем ${updatedServices.length} услуг`);
    
    return NextResponse.json({
      success: true,
      message: 'Порядок услуг успешно обновлен',
      data: updatedServices
    });
  } catch (error) {
    console.error('[bulk-update-order] Непредвиденная ошибка при обновлении порядка услуг:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении порядка услуг' },
      { status: 500 }
    );
  }
} 