import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../database/db';
import { specialistsAPI } from '../../../database/api/specialists';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Функция для проверки прав администратора
function isUserAdmin(user: any): boolean {
  if (!user) return false;
  
  // Проверяем email для специального пользователя
  if (user.email === 'bakeevd@yandex.ru') return true;
  
  // Проверяем роль в верхнем регистре
  if (typeof user.role === 'string' && user.role.toUpperCase() === 'ADMIN') return true;
  
  // Проверяем роль в нижнем регистре
  if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') return true;
  
  // Проверяем массив ролей
  if (Array.isArray(user.roles) && user.roles.some((role: string) => role.toLowerCase() === 'admin')) return true;
  
  // Проверяем, если роль - это объект с полем name
  if (user.role && typeof user.role === 'object' && user.role.name && 
      (user.role.name.toUpperCase() === 'ADMIN' || user.role.name.toLowerCase() === 'admin')) return true;
  
  return false;
}

// Получение списка специалистов
export async function GET(request: NextRequest) {
  console.log('[API Specialists] Начало обработки запроса GET /api/specialists');
  
  try {
    // Получаем список специалистов
    const specialists = specialistsAPI.getAll();
    
    console.log(`[API Specialists] Получено ${specialists.length} специалистов`);
    
    if (!specialists || specialists.length === 0) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Добавляем данные об отзывах к каждому специалисту
    const specialistsWithReviews = specialists.map(specialist => {
      try {
        // Получаем количество отзывов
        const reviewsCountQuery = db.prepare(`
          SELECT COUNT(*) as count 
          FROM reviews 
          WHERE specialistId = ? AND isPublished = 1
        `);
        const reviewsCount = reviewsCountQuery.get(specialist.id) as { count: number } | undefined;
        
        // Получаем средний рейтинг
        const ratingQuery = db.prepare(`
          SELECT AVG(rating) as average 
          FROM reviews 
          WHERE specialistId = ? AND isPublished = 1
        `);
        const rating = ratingQuery.get(specialist.id) as { average: number } | undefined;
        
        return {
          ...specialist,
          reviewsCount: reviewsCount?.count || 0,
          rating: rating?.average || 0
        };
      } catch (error) {
        console.error(`[API Specialists] Ошибка при получении данных отзывов для специалиста ${specialist.id}:`, error);
        return {
          ...specialist,
          reviewsCount: 0,
          rating: 0
        };
      }
    });
    
    // Возвращаем список специалистов
    return NextResponse.json(specialistsWithReviews, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    console.error('[API Specialists] Ошибка при получении специалистов:', error);
    return NextResponse.json({ error: 'Ошибка при получении специалистов' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

// Создание нового специалиста
export async function POST(request: NextRequest) {
  console.log('[API Specialists] Начало обработки запроса POST /api/specialists');
  
  try {
    // Проверка авторизации
    const user = await getCurrentUser(request);
    
    if (!user || !isUserAdmin(user)) {
      console.error('[API Specialists] Доступ запрещен: пользователь не авторизован или не является администратором');
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }
    
    // Получаем FormData из запроса
    const formData = await request.formData();
    console.log('[API Specialists] Получены данные формы');
    
    // Извлекаем основные поля
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const position = formData.get('position') as string;
    const description = formData.get('description') as string;
    const userId = formData.get('userId') as string;
    
    // Валидация обязательных полей
    if (!firstName || !lastName) {
      console.error('[API Specialists] Отсутствуют обязательные поля');
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    
    console.log('[API Specialists] Основные данные:', { firstName, lastName, position });
    
    // Создаем ID для нового специалиста
    const specialistId = uuidv4();
    
    // Обрабатываем фото, если оно есть
    let photoPath = null;
    const photo = formData.get('photo') as File;
    
    if (photo && photo instanceof File) {
      try {
        console.log('[API Specialists] Обработка фотографии:', { name: photo.name, size: photo.size, type: photo.type });
        
        // Создаем директорию для фото
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'specialists', specialistId);
        fs.mkdirSync(uploadsDir, { recursive: true });
        
        // Сохраняем оригинальное фото
        const buffer = Buffer.from(await photo.arrayBuffer());
        const originalPath = path.join(uploadsDir, `${specialistId}.jpg`);
        fs.writeFileSync(originalPath, buffer);
        
        // Создаем WebP версию для оптимизации
        const webpPath = path.join(uploadsDir, `${specialistId}.webp`);
        await sharp(buffer)
          .resize(500) // Ограничиваем размер для оптимизации
          .webp({ quality: 80 })
          .toFile(webpPath);
        
        // Создаем миниатюру
        const thumbPath = path.join(uploadsDir, `${specialistId}_thumb.webp`);
        await sharp(buffer)
          .resize(100) // Размер миниатюры
          .webp({ quality: 70 })
          .toFile(thumbPath);
        
        // Устанавливаем относительный путь к фото для сохранения в БД
        photoPath = `/uploads/specialists/${specialistId}/${specialistId}.webp`;
        console.log('[API Specialists] Фото сохранено:', photoPath);
      } catch (photoError) {
        console.error('[API Specialists] Ошибка при обработке фото:', photoError);
        // Продолжаем выполнение, даже если фото не удалось обработать
      }
    }
    
    // Обрабатываем дополнительные позиции
    let additionalPositions: string[] = [];
    const additionalPositionsJson = formData.get('additionalPositions');
    if (additionalPositionsJson && typeof additionalPositionsJson === 'string') {
      try {
        additionalPositions = JSON.parse(additionalPositionsJson);
        console.log('[API Specialists] Дополнительные позиции:', additionalPositions);
      } catch (error) {
        console.error('[API Specialists] Ошибка при парсинге дополнительных позиций:', error);
      }
    }
    
    // Обрабатываем выбранные услуги
    let selectedServices: string[] = [];
    const selectedServicesJson = formData.get('selectedServices');
    if (selectedServicesJson && typeof selectedServicesJson === 'string') {
      try {
        selectedServices = JSON.parse(selectedServicesJson);
        console.log('[API Specialists] Выбранные услуги:', selectedServices);
      } catch (error) {
        console.error('[API Specialists] Ошибка при парсинге выбранных услуг:', error);
      }
    }
    
    // Обрабатываем расписание работы
    let workSchedule: any = {
      enabled: true,
      workDays: [],
      vacations: []
    };
    
    const workScheduleJson = formData.get('workSchedule');
    if (workScheduleJson && typeof workScheduleJson === 'string') {
      try {
        workSchedule = JSON.parse(workScheduleJson);
        console.log('[API Specialists] Расписание работы получено');
      } catch (error) {
        console.error('[API Specialists] Ошибка при парсинге расписания работы:', error);
      }
    }
    
    // Обрабатываем документы
    let documents: any[] = [];
    const documentsInfoJson = formData.get('documentsInfo');
    
    if (documentsInfoJson && typeof documentsInfoJson === 'string') {
      try {
        const documentsInfo = JSON.parse(documentsInfoJson);
        console.log('[API Specialists] Информация о документах:', { count: documentsInfo.length });
        
        // Обрабатываем каждый документ
        for (const docInfo of documentsInfo) {
          const docFile = formData.get(`document_${docInfo.id}`) as File;
          
          if (docFile && docFile instanceof File) {
            try {
              // Создаем директорию для документов
              const documentsDir = path.join(process.cwd(), 'public', 'uploads', 'documents', specialistId);
              fs.mkdirSync(documentsDir, { recursive: true });
              
              // Генерируем уникальное имя файла
              const fileExt = path.extname(docFile.name).toLowerCase();
              const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}${fileExt}`;
              const filePath = path.join(documentsDir, fileName);
              
              // Сохраняем файл
              const buffer = Buffer.from(await docFile.arrayBuffer());
              fs.writeFileSync(filePath, buffer);
              
              // Добавляем информацию о документе
              documents.push({
                path: `/uploads/documents/${specialistId}/${fileName}`,
                name: docInfo.name,
                type: docInfo.type
              });
              
              console.log('[API Specialists] Документ сохранен:', { name: docInfo.name, path: `/uploads/documents/${specialistId}/${fileName}` });
            } catch (docError) {
              console.error('[API Specialists] Ошибка при обработке документа:', docError);
            }
          }
        }
      } catch (error) {
        console.error('[API Specialists] Ошибка при парсинге информации о документах:', error);
      }
    }
    
    // Создаем специалиста в БД
    const specialist = specialistsAPI.create({
      id: specialistId,
      firstName,
      lastName,
      photo: photoPath,
      description,
      position,
      experience: 0,
      order: 0, // Будет обновлено позже
      userId: userId || null,
      additionalPositions,
      documents,
      workSchedule,
      selectedServices
    });
    
    // Обновляем порядок специалистов
    try {
      // Получаем текущий список специалистов
      const allSpecialists = specialistsAPI.getAll();
      
      // Извлекаем ID всех специалистов в текущем порядке
      const specialistIds = allSpecialists.map(s => s.id);
      
      // Обновляем порядок
      specialistsAPI.setOrder(specialistIds);
      
      console.log('[API Specialists] Порядок специалистов обновлен');
    } catch (orderError) {
      console.error('[API Specialists] Ошибка при обновлении порядка специалистов:', orderError);
    }
    
    console.log('[API Specialists] Специалист успешно создан:', { id: specialist.id });
    
    // Возвращаем успешный ответ
    return NextResponse.json({ 
      success: true, 
      message: 'Специалист успешно создан',
      data: specialist
    });
  } catch (error) {
    console.error('[API Specialists] Ошибка при создании специалиста:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Ошибка при создании специалиста' 
    }, { status: 500 });
  }
}

// Обработка CORS OPTIONS запросов
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
