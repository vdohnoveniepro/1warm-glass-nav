import { NextRequest, NextResponse } from 'next/server';
import { saveOriginalImage } from '@/lib/server/imageProcessing';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Обработка загрузки изображений
export async function POST(request: NextRequest) {
  try {
    // Проверяем права пользователя
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Требуется авторизация.' 
      }, { status: 401 });
    }
    
    // Получаем данные формы
    const formData = await request.formData();
    
    // Извлекаем параметры
    const image = formData.get('image') as File;
    const subdirectory = formData.get('subdirectory') as string || 'uploads';
    
    if (!image) {
      return NextResponse.json({ 
        success: false, 
        error: 'Изображение не предоставлено' 
      }, { status: 400 });
    }
    
    // Преобразуем файл в base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${image.type};base64,${buffer.toString('base64')}`;
    
    // Сохраняем изображение
    const imagePath = await saveOriginalImage(base64, subdirectory);
    
    return NextResponse.json({ 
      success: true, 
      path: imagePath 
    });
  } catch (error) {
    console.error('Ошибка при загрузке изображения:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при загрузке изображения' 
    }, { status: 500 });
  }
}

// Обработка base64-изображений
export async function PUT(request: NextRequest) {
  try {
    // Проверяем права пользователя
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Требуется авторизация.' 
      }, { status: 401 });
    }
    
    // Получаем данные запроса
    const body = await request.json();
    
    // Извлекаем параметры
    const { base64, subdirectory = 'uploads' } = body;
    
    if (!base64) {
      return NextResponse.json({ 
        success: false, 
        error: 'Изображение не предоставлено' 
      }, { status: 400 });
    }
    
    // Сохраняем изображение
    const imagePath = await saveOriginalImage(base64, subdirectory);
    
    return NextResponse.json({ 
      success: true, 
      path: imagePath 
    });
  } catch (error) {
    console.error('Ошибка при загрузке изображения:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при загрузке изображения' 
    }, { status: 500 });
  }
} 

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const imagePath = url.searchParams.get('path');
    const isDebugMode = url.searchParams.get('debug') === 'true';
    
    if (!imagePath) {
      return new NextResponse('Image path not provided', { status: 400 });
    }
    
    // Ensure we're only accessing files from allowed directories
    if (!imagePath.startsWith('specialists/') && 
        !imagePath.startsWith('uploads/specialists/') && 
        !imagePath.startsWith('services/') && 
        !imagePath.startsWith('uploads/services/')) {
      return new NextResponse('Invalid path', { status: 403 });
    }
    
    // Construct the full path, handling both formats
    let fullPath;
    if (imagePath.startsWith('uploads/')) {
      // If path already includes 'uploads/', use it directly
      fullPath = path.join(process.cwd(), 'public', imagePath);
    } else {
      // Otherwise, prepend 'uploads/'
      fullPath = path.join(process.cwd(), 'public', 'uploads', imagePath);
    }
    
    if (isDebugMode) console.log(`Trying to serve image from: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      if (isDebugMode) console.log(`File not found at: ${fullPath}`);
      
      // Try alternative paths for specialists or services
      if (imagePath.includes('specialists') || imagePath.includes('services')) {
        // Проверяем наличие файла с суффиксом _original
        const pathParts = path.parse(fullPath);
        const dirName = pathParts.dir;
        const baseName = pathParts.name;
        
        // Проверяем разные варианты имен файлов в порядке приоритета
        const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const possiblePrefixes = ['_original', ''];
        const possiblePaths = [];
        
        // Создаем массив возможных путей в порядке приоритета
        for (const prefix of possiblePrefixes) {
          for (const ext of possibleExtensions) {
            possiblePaths.push(path.join(dirName, `${baseName}${prefix}${ext}`));
          }
        }
        
        // Проверяем каждый возможный путь
        let fileFound = false;
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            if (isDebugMode) console.log(`Found file at: ${testPath}`);
            fullPath = testPath;
            fileFound = true;
            break;
          }
        }
        
        // Если файл все еще не найден, используем заглушку
        if (!fileFound) {
          if (isDebugMode) console.log('Using placeholder image instead');
          fullPath = path.join(process.cwd(), 'public', 'images', 'photoPreview.jpg');
          
          if (!fs.existsSync(fullPath)) {
            return new NextResponse('Image not found', { status: 404 });
          }
        }
      } else {
        return new NextResponse('Image not found', { status: 404 });
      }
    }
    
    // Read file
    const imageBuffer = fs.readFileSync(fullPath);
    
    // Determine content type
    let contentType = 'image/jpeg'; // Default
    if (fullPath.endsWith('.png')) contentType = 'image/png';
    if (fullPath.endsWith('.webp')) contentType = 'image/webp';
    if (fullPath.endsWith('.svg')) contentType = 'image/svg+xml';
    
    // Return image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Error serving image', { status: 500 });
  }
} 