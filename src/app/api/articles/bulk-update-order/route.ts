import { NextRequest, NextResponse } from "next/server";
import { articlesAPI, ensureDirectories } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// POST /api/articles/bulk-update-order - массовое обновление порядка статей
export async function POST(request: NextRequest) {
  try {
    console.log('[bulk-update-order] Начало обработки запроса на обновление порядка статей');
    
    // Проверка авторизации
    const user = await getCurrentUser();
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
    
    console.log(`[bulk-update-order] Обновление порядка для ${data.length} статей...`);
    
    // Обновляем порядок статей с использованием новой функции updateBulkOrders
    const success = articlesAPI.updateBulkOrders(data);
    
    if (!success) {
      console.log('[bulk-update-order] Ошибка при обновлении порядка статей через API');
      return NextResponse.json(
        { error: 'Ошибка при обновлении порядка статей' },
        { status: 500 }
      );
    }
    
    console.log('[bulk-update-order] Порядок статей успешно обновлен, получаем обновленный список');
    
    // Возвращаем обновленный список статей
    const allArticles = articlesAPI.getAll();
    
    console.log(`[bulk-update-order] Возвращаем ${allArticles.length} статей`);
    
    return NextResponse.json({
      success: true,
      message: 'Порядок статей успешно обновлен',
      data: allArticles
    });
  } catch (error) {
    console.error('[bulk-update-order] Непредвиденная ошибка при обновлении порядка статей:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении порядка статей' },
      { status: 500 }
    );
  }
} 