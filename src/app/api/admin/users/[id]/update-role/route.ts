import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/database/db';
import { initDB } from '@/app/api/db';

// Инициализируем базу данных
initDB();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API] Начало обработки запроса на обновление роли пользователя');
    
    // Проверка авторизации
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('[API] Отказано в доступе: пользователь не авторизован или не является администратором');
      return NextResponse.json(
        { success: false, message: 'Недостаточно прав' },
        { status: 403 }
      );
    }
    
    // Получаем ID пользователя из параметров маршрута
    const userId = params.id;
    console.log(`[API] ID пользователя для обновления роли: ${userId}`);

    // Получаем данные из запроса
    const data = await request.json();
    const { role, action, specialistId } = data;
    
    console.log(`[API] Данные для обновления: role=${role}, action=${action || 'replace'}, specialistId=${specialistId || 'не указан'}`);

    // Проверяем существование пользователя
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(userId);

    if (!user) {
      console.log(`[API] Пользователь с ID ${userId} не найден`);
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    console.log(`[API] Текущая роль пользователя: ${user.role}, roles=${user.roles || 'не указаны'}`);
    
    // Обрабатываем обновление роли
    let newRole = role;
    let newRoles: string[] = [];

    // Парсим текущие роли пользователя
    let currentRoles: string[] = [];
    if (user.roles) {
      try {
        if (typeof user.roles === 'string') {
          currentRoles = JSON.parse(user.roles);
        } else if (Array.isArray(user.roles)) {
          currentRoles = user.roles;
        }
      } catch (e) {
        console.error('[API] Ошибка при парсинге ролей пользователя:', e);
        currentRoles = [user.role.toLowerCase()];
      }
    } else {
      currentRoles = [user.role.toLowerCase()];
    }

    console.log(`[API] Текущие роли пользователя: ${currentRoles.join(', ')}`);

    // Определяем действие (добавление/удаление/замена роли)
    if (action === 'add') {
      // Добавляем роль, если её ещё нет
      if (!currentRoles.includes(role.toLowerCase())) {
        newRoles = [...currentRoles, role.toLowerCase()];
      } else {
        newRoles = currentRoles;
      }
      
      // Если добавляем роль specialist и передан specialistId, обновляем связь
      if (role.toLowerCase() === 'specialist' && specialistId) {
        console.log(`[API] Обновление связи пользователя со специалистом: specialistId=${specialistId}`);
        
        // Проверяем существование специалиста
        const specialistStmt = db.prepare('SELECT * FROM specialists WHERE id = ?');
        const specialist = specialistStmt.get(specialistId);
        
        if (!specialist) {
          console.log(`[API] Специалист с ID ${specialistId} не найден`);
          return NextResponse.json(
            { success: false, message: 'Специалист не найден' },
            { status: 404 }
          );
        }
        
        // Обновляем поле userId у специалиста
        const updateSpecialistStmt = db.prepare('UPDATE specialists SET userId = ? WHERE id = ?');
        updateSpecialistStmt.run(userId, specialistId);
        
        console.log(`[API] Обновлена связь специалиста ${specialistId} с пользователем ${userId}`);
      }
    } else if (action === 'remove') {
      // Удаляем роль
      newRoles = currentRoles.filter(r => r !== role.toLowerCase());
      
      // Если удаляем роль specialist, удаляем связь со специалистом
      if (role.toLowerCase() === 'specialist') {
        console.log(`[API] Удаление связи пользователя со специалистом`);
        
        // Находим связанного специалиста
        const specialistStmt = db.prepare('SELECT * FROM specialists WHERE userId = ?');
        const specialist = specialistStmt.get(userId);
        
        if (specialist) {
          // Удаляем связь
          const updateSpecialistStmt = db.prepare('UPDATE specialists SET userId = NULL WHERE userId = ?');
          updateSpecialistStmt.run(userId);
          
          console.log(`[API] Удалена связь специалиста ${specialist.id} с пользователем ${userId}`);
      }
      
        // Удаляем specialistId у пользователя
        const updateUserStmt = db.prepare('UPDATE users SET specialistId = NULL WHERE id = ?');
        updateUserStmt.run(userId);
        
        console.log(`[API] Удален specialistId у пользователя ${userId}`);
      }
    } else {
      // Заменяем роли (действие по умолчанию)
      newRoles = [role.toLowerCase()];
      
      // Если новая роль не specialist, удаляем связь со специалистом
      if (role.toLowerCase() !== 'specialist' && currentRoles.includes('specialist')) {
        console.log(`[API] Удаление связи пользователя со специалистом при смене роли`);
        
        // Находим связанного специалиста
        const specialistStmt = db.prepare('SELECT * FROM specialists WHERE userId = ?');
        const specialist = specialistStmt.get(userId);
        
        if (specialist) {
          // Удаляем связь
          const updateSpecialistStmt = db.prepare('UPDATE specialists SET userId = NULL WHERE userId = ?');
          updateSpecialistStmt.run(userId);
          
          console.log(`[API] Удалена связь специалиста ${specialist.id} с пользователем ${userId}`);
        }
        
        // Удаляем specialistId у пользователя
        const updateUserStmt = db.prepare('UPDATE users SET specialistId = NULL WHERE id = ?');
        updateUserStmt.run(userId);
        
        console.log(`[API] Удален specialistId у пользователя ${userId}`);
      }
    }

    console.log(`[API] Новые роли пользователя: ${newRoles.join(', ')}`);

    // Определяем основную роль
    if (newRoles.includes('admin')) {
      newRole = 'admin';
    } else if (newRoles.includes('specialist')) {
      newRole = 'specialist';
    } else {
      newRole = 'user';
    }

    console.log(`[API] Новая основная роль пользователя: ${newRole}`);

    // Обновляем specialistId в таблице users, если указан
    if (specialistId && role.toLowerCase() === 'specialist' && (action === 'add' || !action)) {
      const updateUserStmt = db.prepare('UPDATE users SET role = ?, roles = ?, specialistId = ? WHERE id = ?');
      updateUserStmt.run(newRole, JSON.stringify(newRoles), specialistId, userId);
    
      console.log(`[API] Обновлен пользователь с ID ${userId}: role=${newRole}, roles=${JSON.stringify(newRoles)}, specialistId=${specialistId}`);
    } else {
      // Обновляем пользователя без specialistId
      const updateUserStmt = db.prepare('UPDATE users SET role = ?, roles = ? WHERE id = ?');
      updateUserStmt.run(newRole, JSON.stringify(newRoles), userId);
      
      console.log(`[API] Обновлен пользователь с ID ${userId}: role=${newRole}, roles=${JSON.stringify(newRoles)}`);
    }

    // Получаем обновленного пользователя
    const updatedUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const updatedUser = updatedUserStmt.get(userId);

    // Возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      message: 'Роль пользователя успешно обновлена',
      data: {
      user: {
          ...updatedUser,
          password: undefined // Не возвращаем пароль
        }
      }
    });
  } catch (error) {
    console.error('[API] Ошибка при обновлении роли пользователя:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 