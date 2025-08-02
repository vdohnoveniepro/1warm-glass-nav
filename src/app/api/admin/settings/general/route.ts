import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

// Путь к файлу настроек
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Временный обходной путь для проверки авторизации
// TODO: Заменить на правильную проверку сессии
const checkAuth = async () => {
  try {
    const session = await getServerSession(authOptions);
    
    // В реальном проекте здесь должна быть проверка роли
    return true;
  } catch (error) {
    console.error('Ошибка при проверке сессии:', error);
    // Временно разрешаем доступ даже при ошибке
    return true;
  }
};

export async function POST(req: NextRequest) {
  try {
    // Временно отключаем проверку авторизации
    const isAuthorized = await checkAuth();
    
    // Получаем данные запроса
    const data = await req.json();
    
    if (!data || !data.system) {
      return NextResponse.json(
        { error: 'Некорректные данные' },
        { status: 400 }
      );
    }
    
    // Читаем текущие настройки
    let settings;
    try {
      const fileContent = await readFile(SETTINGS_FILE, 'utf-8');
      settings = JSON.parse(fileContent);
    } catch (error) {
      // Если файл не существует или поврежден, создаем новый объект настроек
      settings = { system: {}, notifications: {} };
    }
    
    // Обновляем настройки системы
    settings.system = {
      ...settings.system,
      siteName: data.system.siteName,
      siteDescription: data.system.siteDescription,
      contactPhone: data.system.contactPhone,
      contactEmail: data.system.contactEmail,
      contactAddress: data.system.contactAddress || '',
      metaTitle: data.system.metaTitle,
      metaDescription: data.system.metaDescription,
      // Сохраняем остальные настройки без изменений
      favicon: settings.system.favicon || data.system.favicon || '',
      imageSizes: settings.system.imageSizes || data.system.imageSizes || {
        hero: '1200x630',
        thumbnail: '300x300',
        gallery: '800x600',
      },
      enableImageCompression: data.system.enableImageCompression !== undefined 
        ? data.system.enableImageCompression 
        : settings.system.enableImageCompression || true,
      imageCompressionQuality: data.system.imageCompressionQuality || settings.system.imageCompressionQuality || 85,
      enableWebp: data.system.enableWebp !== undefined 
        ? data.system.enableWebp 
        : settings.system.enableWebp || true,
      enableLazyLoading: data.system.enableLazyLoading !== undefined 
        ? data.system.enableLazyLoading 
        : settings.system.enableLazyLoading || true,
      maxUploadFileSize: data.system.maxUploadFileSize || settings.system.maxUploadFileSize || 10,
      maxVideoUploadSize: data.system.maxVideoUploadSize || settings.system.maxVideoUploadSize || 10,
      videoCompressionEnabled: data.system.videoCompressionEnabled !== undefined 
        ? data.system.videoCompressionEnabled 
        : settings.system.videoCompressionEnabled || false,
      videoCompressionQuality: data.system.videoCompressionQuality || settings.system.videoCompressionQuality || 85,
      cachingEnabled: data.system.cachingEnabled !== undefined 
        ? data.system.cachingEnabled 
        : settings.system.cachingEnabled || true,
      cacheDuration: data.system.cacheDuration || settings.system.cacheDuration || 3600,
      maintenanceMode: data.system.maintenanceMode !== undefined 
        ? data.system.maintenanceMode 
        : settings.system.maintenanceMode || false,
      maintenanceMessage: data.system.maintenanceMessage || settings.system.maintenanceMessage || 'Сайт находится в режиме обслуживания',
    };
    
    // Записываем обновленные настройки в файл
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: 'Настройки успешно сохранены'
    });
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении настроек' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Временно отключаем проверку авторизации
    const isAuthorized = await checkAuth();
    
    // Читаем текущие настройки
    try {
      const fileContent = await readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(fileContent);
      
      return NextResponse.json({
        success: true,
        settings: settings.system
      });
    } catch (error) {
      // Если файл не существует или поврежден, возвращаем пустые настройки
      return NextResponse.json({
        success: true,
        settings: {
          siteName: 'Вдохновение',
          siteDescription: 'Центр психологии и релаксации',
          contactPhone: '+7 (999) 123-45-67',
          contactEmail: 'info.vdohnovenie.pro@gmail.com',
          contactAddress: '',
          favicon: '/images/logo-flower.png',
          metaTitle: 'Вдохновение - Центр психологии и релаксации',
          metaDescription: 'Профессиональные услуги массажа, йоги, психологии и медитации для вашего здоровья и благополучия.',
          imageSizes: {
            hero: '1200x630',
            thumbnail: '300x300',
            gallery: '800x600',
          },
          enableImageCompression: true,
          imageCompressionQuality: 85,
          enableWebp: true,
          enableLazyLoading: true,
          maxUploadFileSize: 10,
          maxVideoUploadSize: 10,
          videoCompressionEnabled: false,
          videoCompressionQuality: 85,
          cachingEnabled: true,
          cacheDuration: 3600,
          maintenanceMode: false,
          maintenanceMessage: 'Сайт находится в режиме обслуживания',
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при получении настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек' },
      { status: 500 }
    );
  }
} 