import { NextRequest, NextResponse } from "next/server";
import { articlesAPI } from "../../../database/api/articles";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

// Директория для сохранения изображений
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'articles');

// Функция для проверки и создания директорий
const ensureDirectories = () => {
  const directories = [
    UPLOAD_DIR,
    path.join(process.cwd(), 'public/uploads/images'),
    path.join(process.cwd(), 'public/uploads/images/temp')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Создана директория: ${dir}`);
    }
  });
};

// Функция для сохранения изображения из base64
async function saveImage(base64Image: string): Promise<string> {
  try {
    if (!base64Image.startsWith('data:image')) {
      return base64Image; // Возвращаем исходный URL, если это не base64
    }
    
    // Создаем директорию, если она не существует
    await ensureUploadDirExists();
    
    // Извлекаем MIME тип и данные
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }
    
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Определяем расширение файла на основе MIME типа
    const extension = mimeType.split('/')[1] || 'jpeg';
    
    // Генерируем имя файла
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Сохраняем файл
    fs.writeFileSync(filePath, buffer);
    
    // Возвращаем путь к файлу для использования в веб
    return `/uploads/articles/${fileName}`;
  } catch (error) {
    console.error('Ошибка при сохранении изображения:', error);
    throw error;
  }
}

// Функция для извлечения идентификаторов изображений из HTML контента
function extractImageIds(content: string): string[] {
  const imageIds: string[] = [];
  const regex = /\/uploads\/images\/temp\/([a-z0-9-]+)\.[a-z]+/gi;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // match[1] содержит ID изображения (UUID)
    if (match[1]) {
      imageIds.push(match[1]);
    }
  }
  
  return imageIds;
}

// Функция для маркировки изображений как используемых
async function markImagesAsUsed(imageIds: string[]) {
  try {
    for (const imageId of imageIds) {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/images/save?imageId=${imageId}`, {
        method: 'GET',
      });
    }
  } catch (error) {
    console.error('Ошибка при маркировке изображений:', error);
  }
}

// Функция для обеспечения существования директории для загрузки
async function ensureUploadDirExists() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Ошибка при создании директории для загрузок:', error);
    throw error;
  }
}

// GET /api/articles - получить все статьи
export async function GET(request: NextRequest) {
  try {
    console.log('API: Получение статей');
    
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const specialistId = searchParams.get('specialistId');
    const userEmail = searchParams.get('userEmail');
    
    console.log('Параметры запроса:', { specialistId, userEmail });
    
    // Убедимся, что articlesAPI доступен
    if (!articlesAPI || typeof articlesAPI.getAll !== 'function') {
      console.error('API: articlesAPI не инициализирован или метод getAll отсутствует');
      return NextResponse.json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера', 
        details: 'API не инициализирован' 
      }, { status: 500 });
    }
    
    // Получаем статьи
    let articles = [];
    
    if (specialistId) {
      // Получаем статьи по ID специалиста
      console.log(`API: Получение статей для специалиста с ID: ${specialistId}`);
      articles = articlesAPI.getBySpecialistId(specialistId);
    } else if (userEmail) {
      // Получаем статьи по email пользователя
      console.log(`API: Получение статей для пользователя с email: ${userEmail}`);
      
      try {
        // Получаем пользователя по email
        const { usersAdapter } = await import('../../../database/adapters');
        const user = await usersAdapter.getByEmail(userEmail);
        
        if (user && 'specialistId' in user) {
          // Если у пользователя есть specialistId, получаем его статьи
          const specialistId = (user as any).specialistId;
          console.log(`API: Найден specialistId ${specialistId} для пользователя ${userEmail}`);
          articles = articlesAPI.getBySpecialistId(specialistId);
        } else {
          console.log(`API: У пользователя ${userEmail} нет specialistId`);
          articles = [];
        }
      } catch (error) {
        console.error(`API: Ошибка при получении пользователя по email ${userEmail}:`, error);
        articles = [];
      }
    } else {
      // Получаем все статьи
      console.log('API: Получение всех статей');
      articles = articlesAPI.getAll();
    }
    
    console.log(`API: Найдено ${articles.length} статей`);
    
    // Добавляем количество комментариев для каждой статьи
    const { db } = await import('../../../database/db');
    articles = articles.map(article => {
      try {
        // Получаем количество комментариев для статьи
        const result = db.prepare(
          'SELECT COUNT(*) as count FROM comments WHERE articleId = ?'
        ).get(article.id);
        
        // Приводим результат к нужному типу с проверкой
        const commentsCount = result && typeof result === 'object' && 'count' in result 
          ? (result.count as number) 
          : 0;
        
        return {
          ...article,
          commentsCount
        };
      } catch (error) {
        console.error(`Ошибка при получении комментариев для статьи ${article.id}:`, error);
        return {
          ...article,
          commentsCount: 0
        };
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      data: articles 
    });
  } catch (error) {
    console.error('API: Ошибка при получении статей:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/articles - создать новую статью
export async function POST(request: NextRequest) {
  try {
    // Убедимся, что нужные директории существуют
    ensureDirectories();
    
    // Проверяем тип содержимого запроса
    const contentType = request.headers.get('content-type') || '';
    
    let data: any = {};
    
    // Обработка FormData
    if (contentType.includes('multipart/form-data')) {
      console.log('Получен запрос с FormData');
      const formData = await request.formData();
      
      // Извлекаем поля из FormData
      data = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        excerpt: formData.get('excerpt') as string,
        category: formData.get('category') as string,
        status: formData.get('status') as string
      };
      
      // Получаем ID специалиста, если указан
      const specialistId = formData.get('specialistId') as string;
      if (specialistId) {
        data.specialistId = specialistId;
      }
      
      // Создание уникального slug из заголовка
      if (data.title && !data.slug) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
        
        // Добавляем случайные цифры для уникальности
        data.slug += '-' + Math.floor(Math.random() * 10000);
      }
      
      // Обработка загруженного файла изображения
      const imageFile = formData.get('image') as File;
      if (imageFile && imageFile.size > 0) {
        try {
          await ensureUploadDirExists();
          
          // Читаем файл изображения
          const arrayBuffer = await imageFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Генерируем уникальное имя файла
          const fileName = `${uuidv4()}-${imageFile.name}`.replace(/\s+/g, '-');
          const filePath = path.join(UPLOAD_DIR, fileName);
          
          // Сохраняем файл
          fs.writeFileSync(filePath, buffer);
          
          // Устанавливаем путь к изображению
          data.banner = `/uploads/articles/${fileName}`;
        } catch (error) {
          console.error('Ошибка при сохранении загруженного изображения:', error);
          return NextResponse.json(
            { error: 'Ошибка при сохранении изображения' },
            { status: 500 }
          );
        }
      } 
      // Обработка URL сгенерированного изображения
      else if (formData.has('imageUrl')) {
        const imageUrl = formData.get('imageUrl') as string;
        if (imageUrl) {
          data.banner = imageUrl;
        }
      }
    } 
    // Обработка JSON
    else {
      console.log('Получен запрос с JSON данными');
      data = await request.json();
      
      // Создание уникального slug из заголовка
      if (data.title && !data.slug) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
        
        // Добавляем случайные цифры для уникальности
        data.slug += '-' + Math.floor(Math.random() * 10000);
      }
      
      // Обработка изображения баннера, если оно в base64
      if (data.imageBase64) {
        try {
          // Удаляем префикс данных URL, если он есть
          let base64Data = data.imageBase64;
          if (!base64Data.startsWith('data:')) {
            // Преобразуем в правильный формат base64 с префиксом
            base64Data = `data:image/jpeg;base64,${base64Data.replace(/^data:image\/[a-z]+;base64,/, '')}`;
          }
          
          const bannerPath = await saveImage(base64Data);
          data.banner = bannerPath;
          delete data.imageBase64;
        } catch (error) {
          console.error('Ошибка при сохранении изображения:', error);
          return NextResponse.json(
            { error: 'Ошибка при сохранении изображения' },
            { status: 500 }
          );
        }
      }
    }
    
    // Извлекаем и помечаем изображения из контента как используемые
    if (data.content) {
      const imageIds = extractImageIds(data.content);
      if (imageIds.length > 0) {
        await markImagesAsUsed(imageIds);
      }
    }
    
    // Проверяем, есть ли привязка к специалисту
    if (data.specialistId) {
      try {
        const { specialistsAPI } = require('@/lib/api');
        const specialist = specialistsAPI.getById(data.specialistId);
        
        if (specialist) {
          console.log(`Найден специалист для статьи: ${specialist.firstName} ${specialist.lastName}`);
          // Используем данные специалиста как автора
          data.author = {
            id: specialist.id,
            name: `${specialist.firstName} ${specialist.lastName}`,
            avatar: specialist.photo || ''
          };
        } else {
          console.log('Специалист не найден, используем автора по умолчанию');
          data.author = {
            id: 'admin',
            name: 'Администратор',
            avatar: ''
          };
        }
      } catch (error) {
        console.error('Ошибка при получении информации о специалисте:', error);
        // В случае ошибки используем автора по умолчанию
        data.author = {
          id: 'admin',
          name: 'Администратор',
          avatar: ''
        };
      }
    }
    // Добавляем информацию об авторе, если специалист не указан
    else if (!data.author && request.headers.get('x-user-id')) {
      data.author = {
        id: request.headers.get('x-user-id'),
        name: request.headers.get('x-user-name') || 'Администратор',
        avatar: request.headers.get('x-user-avatar') || ''
      };
    } else if (!data.author) {
      data.author = {
        id: 'admin',
        name: 'Администратор',
        avatar: ''
      };
    }
    
    console.log('Данные статьи перед созданием:', data);
    const newArticle = articlesAPI.create(data);
    
    if (!newArticle) {
      return NextResponse.json(
        { error: 'Ошибка при создании статьи' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании статьи:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании статьи' },
      { status: 500 }
    );
  }
} 