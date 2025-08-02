import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';
import { usersAPI } from '@/lib/api';
import { logger } from '@/lib/logger';

// Получение всех заметок специалиста
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[API] Запрос на получение заметок специалиста: ${params.id}`);
    
    // Получаем заметки из базы данных без проверки авторизации (временное решение)
    const stmt = db.prepare(`
      SELECT * FROM specialist_notes 
      WHERE specialistId = ? 
      ORDER BY updatedAt DESC
    `);
    
    const notes = stmt.all(params.id);
    logger.info(`[API] Получено ${notes.length} заметок для специалиста ${params.id}`);
    
    // Преобразуем JSON-строки в объекты
    const formattedNotes = notes.map((note: any) => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : [],
      images: note.images ? JSON.parse(note.images) : []
    }));
    
    return NextResponse.json({ success: true, data: formattedNotes });
  } catch (error) {
    logger.error(`[API] Ошибка при получении заметок специалиста: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при получении заметок специалиста' },
      { status: 500 }
    );
  }
}

// Создание новой заметки
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[API] Запрос на создание заметки для специалиста: ${params.id}`);
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
    
    // Проверка прав доступа (специалист может видеть свои заметки, администратор может видеть все заметки)
    const isSpecialist = user && (user as any).specialistId === params.id;
    const isAdmin = user && (user.role === 'admin' || user.role === 'ADMIN');
    
    // В режиме разработки пропускаем дополнительную проверку
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    logger.info(`[API] Проверка прав доступа: isSpecialist=${isSpecialist}, isAdmin=${isAdmin}, isDevelopment=${isDevelopment}`);
    
    // Специальная проверка для bakeevd@yandex.ru (всегда разрешаем доступ этому пользователю)
    const isSpecialUser = user && user.email === 'bakeevd@yandex.ru';
    
    if (!isSpecialist && !isAdmin && !isDevelopment && !isSpecialUser) {
      logger.warn(`[API] Доступ запрещен для пользователя ${sessionUser.id}`);
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.title) {
      return NextResponse.json(
        { error: 'Заголовок заметки обязателен' },
        { status: 400 }
      );
    }
    
    // Преобразуем массивы в JSON-строки
    const tags = data.tags ? JSON.stringify(data.tags) : null;
    const images = data.images ? JSON.stringify(data.images) : null;
    
    // Генерируем ID для новой заметки
    const noteId = data.id || uuidv4();
    const now = new Date().toISOString();
    
    // Создаем заметку в базе данных
    try {
      // Проверяем, есть ли колонка appointmentId в таблице
      const tableInfo = db.prepare('PRAGMA table_info(specialist_notes)').all();
      const hasAppointmentId = tableInfo.some((col: any) => col.name === 'appointmentId');
      
      let stmt;
      
      if (hasAppointmentId) {
        stmt = db.prepare(`
          INSERT INTO specialist_notes (
            id, specialistId, title, content, clientName, clientId, 
            serviceId, serviceName, appointmentId, tags, images, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          noteId,
          params.id,
          data.title,
          data.content || '',
          data.clientName || null,
          data.clientId || null,
          data.serviceId || null,
          data.serviceName || null,
          data.appointmentId || null,
          tags,
          images,
          data.createdAt || now,
          now
        );
      } else {
        // Если колонки appointmentId нет, используем запрос без нее
        stmt = db.prepare(`
          INSERT INTO specialist_notes (
            id, specialistId, title, content, clientName, clientId, 
            serviceId, serviceName, tags, images, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          noteId,
          params.id,
          data.title,
          data.content || '',
          data.clientName || null,
          data.clientId || null,
          data.serviceId || null,
          data.serviceName || null,
          tags,
          images,
          data.createdAt || now,
          now
        );
      }
      
      logger.info(`[API] Результат создания заметки: успешно`);
      
      // Получаем созданную заметку
      const getStmt = db.prepare('SELECT * FROM specialist_notes WHERE id = ?');
      const note = getStmt.get(noteId);
      
      if (!note) {
        logger.error(`[API] Не удалось получить созданную заметку с ID ${noteId}`);
        return NextResponse.json(
          { error: 'Не удалось создать заметку' },
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
      
      logger.info(`[API] Заметка успешно создана с ID ${noteId}`);
      return NextResponse.json({ success: true, data: formattedNote });
    } catch (dbError) {
      logger.error(`[API] Ошибка базы данных при создании заметки: ${dbError}`);
      return NextResponse.json(
        { error: 'Ошибка базы данных при создании заметки' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(`[API] Ошибка при создании заметки: ${error}`);
    return NextResponse.json(
      { error: 'Ошибка при создании заметки' },
      { status: 500 }
    );
  }
} 