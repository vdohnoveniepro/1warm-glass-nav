import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getCurrentUser } from '@/lib/auth';
import { usersAPI } from '@/lib/api';
import { logger } from '@/lib/logger';

// Получение конкретной заметки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    logger.info(`[API] Запрос на получение заметки: специалист ${params.id}, заметка ${params.noteId}`);
    const sessionUser = await getCurrentUser();
    
    // Проверка авторизации
    if (!sessionUser) {
      logger.warn(`[API] Доступ запрещен: пользователь не авторизован`);
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    // Получаем полные данные пользователя из БД
    const user = usersAPI.getById(sessionUser.id);
    
    // Проверка прав доступа (только специалист может видеть свои заметки)
    const isSpecialist = user && (user as any).specialistId === params.id;
    const isAdmin = user && user.role === 'admin';
    
    logger.info(`[API] Проверка прав доступа: isSpecialist=${isSpecialist}, isAdmin=${isAdmin}`);
    
    if (!isSpecialist && !isAdmin) {
      logger.warn(`[API] Доступ запрещен для пользователя ${sessionUser.id}`);
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Получаем заметку из базы данных
    const stmt = db.prepare('SELECT * FROM specialist_notes WHERE id = ? AND specialistId = ?');
    const note = stmt.get(params.noteId, params.id);
    
    if (!note) {
      logger.warn(`[API] Заметка не найдена: ${params.noteId}`);
      return NextResponse.json(
        { error: 'Заметка не найдена' },
        { status: 404 }
      );
    }
    
    // Преобразуем JSON-строки в объекты
    const noteData = note as any;
    const formattedNote = {
      ...noteData,
      tags: noteData.tags ? JSON.parse(noteData.tags) : [],
      images: noteData.images ? JSON.parse(noteData.images) : []
    };
    
    return NextResponse.json({ success: true, data: formattedNote });
  } catch (error) {
    logger.error(`[API] Ошибка при получении заметки: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении заметки' },
      { status: 500 }
    );
  }
}

// Обновление заметки
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    logger.info(`[API] Запрос на обновление заметки: специалист ${params.id}, заметка ${params.noteId}`);
    const sessionUser = await getCurrentUser();
    
    // Проверка авторизации
    if (!sessionUser) {
      logger.warn(`[API] Доступ запрещен: пользователь не авторизован`);
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    // Получаем полные данные пользователя из БД
    const user = usersAPI.getById(sessionUser.id);
    
    // Проверка прав доступа (только специалист может обновлять свои заметки)
    const isSpecialist = user && (user as any).specialistId === params.id;
    const isAdmin = user && user.role === 'admin';
    
    logger.info(`[API] Проверка прав доступа: isSpecialist=${isSpecialist}, isAdmin=${isAdmin}`);
    
    if (!isSpecialist && !isAdmin) {
      logger.warn(`[API] Доступ запрещен для пользователя ${sessionUser.id}`);
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем, существует ли заметка
    const checkStmt = db.prepare('SELECT id FROM specialist_notes WHERE id = ? AND specialistId = ?');
    const existingNote = checkStmt.get(params.noteId, params.id);
    
    if (!existingNote) {
      logger.warn(`[API] Заметка не найдена при обновлении: ${params.noteId}`);
      return NextResponse.json(
        { error: 'Заметка не найдена' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.title) {
      logger.warn(`[API] Отсутствует обязательное поле title при обновлении заметки ${params.noteId}`);
      return NextResponse.json(
        { error: 'Заголовок заметки обязателен' },
        { status: 400 }
      );
    }
    
    // Преобразуем массивы в JSON-строки
    const tags = data.tags ? JSON.stringify(data.tags) : null;
    const images = data.images ? JSON.stringify(data.images) : null;
    
    // Обновляем заметку в базе данных
    try {
      // Проверяем, есть ли колонка appointmentId в таблице
      const tableInfo = db.prepare('PRAGMA table_info(specialist_notes)').all();
      const hasAppointmentId = tableInfo.some((col: any) => col.name === 'appointmentId');

      let stmt;
      let result;
      
      if (hasAppointmentId) {
        stmt = db.prepare(`
          UPDATE specialist_notes SET
            title = ?,
            content = ?,
            clientName = ?,
            clientId = ?,
            serviceId = ?,
            serviceName = ?,
            appointmentId = ?,
            tags = ?,
            images = ?,
            updatedAt = ?
          WHERE id = ? AND specialistId = ?
        `);
        
        result = stmt.run(
          data.title,
          data.content || '',
          data.clientName || null,
          data.clientId || null,
          data.serviceId || null,
          data.serviceName || null,
          data.appointmentId || null,
          tags,
          images,
          new Date().toISOString(),
          params.noteId,
          params.id
        );
      } else {
        // Если колонки appointmentId нет, используем запрос без нее
        stmt = db.prepare(`
          UPDATE specialist_notes SET
            title = ?,
            content = ?,
            clientName = ?,
            clientId = ?,
            serviceId = ?,
            serviceName = ?,
            tags = ?,
            images = ?,
            updatedAt = ?
          WHERE id = ? AND specialistId = ?
        `);
        
        result = stmt.run(
          data.title,
          data.content || '',
          data.clientName || null,
          data.clientId || null,
          data.serviceId || null,
          data.serviceName || null,
          tags,
          images,
          new Date().toISOString(),
          params.noteId,
          params.id
        );
      }
      
      logger.info(`[API] Результат обновления заметки: успешно`);
      
      // Проверяем, была ли заметка действительно обновлена
      if (result.changes === 0) {
        logger.warn(`[API] Заметка ${params.noteId} не была обновлена (0 изменений)`);
        return NextResponse.json(
          { error: 'Не удалось обновить заметку' },
          { status: 500 }
        );
      }
      
      // Получаем обновленную заметку
      const getStmt = db.prepare('SELECT * FROM specialist_notes WHERE id = ?');
      const note = getStmt.get(params.noteId);
      
      if (!note) {
        logger.error(`[API] Не удалось получить обновленную заметку с ID ${params.noteId}`);
        return NextResponse.json(
          { error: 'Не удалось обновить заметку' },
          { status: 500 }
        );
      }
      
      // Преобразуем JSON-строки обратно в объекты
      const noteData = note as any;
      const formattedNote = {
        ...noteData,
        tags: noteData.tags ? JSON.parse(noteData.tags) : [],
        images: noteData.images ? JSON.parse(noteData.images) : []
      };
      
      logger.info(`[API] Заметка ${params.noteId} успешно обновлена`);
      return NextResponse.json({ success: true, data: formattedNote });
    } catch (dbError) {
      logger.error(`[API] Ошибка базы данных при обновлении заметки: ${dbError}`);
      return NextResponse.json(
        { error: 'Ошибка базы данных при обновлении заметки' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(`[API] Ошибка при обновлении заметки: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при обновлении заметки' },
      { status: 500 }
    );
  }
}

// Удаление заметки
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    logger.info(`[API] Запрос на удаление заметки: специалист ${params.id}, заметка ${params.noteId}`);
    
    const sessionUser = await getCurrentUser();
    
    // Проверка авторизации
    if (!sessionUser) {
      logger.warn(`[API] Удаление заметки: пользователь не авторизован`);
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    logger.info(`[API] Удаление заметки: пользователь ${sessionUser.id}, роль ${sessionUser.role}`);
    
    // Получаем полные данные пользователя из БД
    const user = usersAPI.getById(sessionUser.id);
    
    // Проверка прав доступа (только специалист может удалять свои заметки)
    const isSpecialist = user && (user as any).specialistId === params.id;
    const isAdmin = user && user.role === 'admin';
    
    logger.info(`[API] Удаление заметки: проверка прав доступа: isSpecialist=${isSpecialist}, isAdmin=${isAdmin}`);
    
    if (!isSpecialist && !isAdmin) {
      logger.warn(`[API] Удаление заметки: доступ запрещен для пользователя ${sessionUser.id}`);
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    // Проверяем, существует ли заметка
    const checkStmt = db.prepare('SELECT id FROM specialist_notes WHERE id = ? AND specialistId = ?');
    const existingNote = checkStmt.get(params.noteId, params.id);
    
    if (!existingNote) {
      logger.warn(`[API] Удаление заметки: заметка ${params.noteId} не найдена для специалиста ${params.id}`);
      return NextResponse.json(
        { error: 'Заметка не найдена' },
        { status: 404 }
      );
    }
    
    logger.info(`[API] Удаление заметки: заметка ${params.noteId} найдена, выполняем удаление`);
    
    // Удаляем заметку
    try {
      const stmt = db.prepare('DELETE FROM specialist_notes WHERE id = ? AND specialistId = ?');
      const result = stmt.run(params.noteId, params.id);
      
      logger.info(`[API] Удаление заметки: результат операции: ${JSON.stringify(result)}`);
      
      // Проверяем, была ли заметка действительно удалена
      if (result.changes === 0) {
        logger.warn(`[API] Удаление заметки: заметка ${params.noteId} не была удалена (0 изменений)`);
        return NextResponse.json(
          { error: 'Не удалось удалить заметку' },
          { status: 500 }
        );
      }
      
      logger.info(`[API] Удаление заметки: заметка ${params.noteId} успешно удалена`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Заметка успешно удалена' 
      });
    } catch (dbError) {
      logger.error(`[API] Ошибка базы данных при удалении заметки: ${dbError}`);
      return NextResponse.json(
        { error: 'Ошибка базы данных при удалении заметки' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(`[API] Ошибка при удалении заметки: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при удалении заметки' },
      { status: 500 }
    );
  }
} 