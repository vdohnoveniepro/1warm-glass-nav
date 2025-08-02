import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { getSettings, saveSettings } from '@/lib/settings';
import fs from 'fs';

// Функция для проверки доступа администратора
async function checkAdminAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, error: 'Не авторизован' };
  }

  if (user.role.toUpperCase() !== 'ADMIN') {
    return { authorized: false, error: 'Недостаточно прав' };
  }

  return { authorized: true, user };
}

// Вспомогательная функция для сохранения настроек напрямую в БД
async function saveShopSettingsDirectly(settings: any) {
  try {
    const settingsJSON = JSON.stringify(settings);
    console.log('Сохраняем JSON в БД:', settingsJSON);
    
    // Проверяем существование записи
    const checkStmt = db.prepare('SELECT id FROM settings WHERE name = ?');
    const existingRecord = checkStmt.get('shop_settings');
    console.log('Существующая запись:', existingRecord);
    
    const now = new Date().toISOString();
    
    if (existingRecord && typeof existingRecord === 'object' && 'id' in existingRecord) {
      // Обновляем существующую запись
      const updateStmt = db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE name = ?');
      updateStmt.run(settingsJSON, now, 'shop_settings');
      console.log('Обновлена существующая запись shop_settings');
    } else {
      // Создаем новую запись
      const insertStmt = db.prepare('INSERT INTO settings (id, name, value, updatedAt) VALUES (?, ?, ?, ?)');
      insertStmt.run('shop_settings', 'shop_settings', settingsJSON, now);
      console.log('Создана новая запись shop_settings');
    }
    
    // Проверяем, что настройки сохранились
    const verifyStmt = db.prepare('SELECT value FROM settings WHERE name = ?');
    const result = verifyStmt.get('shop_settings');
    console.log('Проверка сохраненных настроек:', result);
    
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек напрямую в БД:', error);
    return false;
  }
}

// GET: Получение настроек магазина
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await checkAdminAccess();
    if (!authorized) {
      return NextResponse.json({ success: false, error }, { status: 403 });
    }

    // Проверяем напрямую в БД
    try {
      const stmt = db.prepare('SELECT value FROM settings WHERE name = ?');
      const result = stmt.get('shop_settings');
      console.log('Результат прямого запроса к БД:', result);
      
      if (result && typeof result === 'object' && 'value' in result) {
        try {
          const valueStr = result.value as string;
          const settings = JSON.parse(valueStr);
          console.log('Настройки магазина из БД:', settings);
          
          return NextResponse.json({
            success: true,
            data: settings
          });
        } catch (parseError) {
          console.error('Ошибка при парсинге JSON настроек:', parseError);
        }
      }
    } catch (dbError) {
      console.error('Ошибка при прямом запросе к БД:', dbError);
    }

    // Запасной вариант - получаем через getSettings
    const allSettings = await getSettings();
    console.log('Загруженные настройки через getSettings:', allSettings);
    
    // Если настройки магазина не найдены, возвращаем значения по умолчанию
    const shopSettings = allSettings?.shop_settings || {
      enabled: false,
      buttonText: 'Магазин',
      buttonUrl: 'https://www.wildberries.ru/',
      buttonImage: '/images/shop.jpg',
      showProducts: false,
      products: []
    };

    console.log('Настройки магазина для ответа:', shopSettings);

    return NextResponse.json({
      success: true,
      data: shopSettings
    });
  } catch (error) {
    console.error('Ошибка при получении настроек магазина:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении настроек магазина'
    }, { status: 500 });
  }
}

// POST: Сохранение настроек магазина
export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await checkAdminAccess();
    if (!authorized) {
      return NextResponse.json({ success: false, error }, { status: 403 });
    }

    // Получаем данные формы
    const formData = await request.formData();
    
    // Получаем JSON настроек
    const settingsJson = formData.get('settingsJson') as string;
    
    if (!settingsJson) {
      return NextResponse.json({
        success: false,
        error: 'Отсутствуют данные настроек'
      }, { status: 400 });
    }
    
    // Парсим настройки
    let shopSettings;
    try {
      shopSettings = JSON.parse(settingsJson);
      console.log('Получены настройки магазина:', shopSettings);
    } catch (parseError) {
      console.error('Ошибка при парсинге JSON настроек:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка при парсинге JSON настроек'
      }, { status: 400 });
    }
    
    // Проверяем наличие новых изображений
    const hasNewImages = formData.get('hasNewImages') === 'true';
    
    if (hasNewImages) {
      // Обрабатываем загруженные изображения
      for (let i = 0; i < shopSettings.buttons.length; i++) {
        const buttonId = formData.get(`buttonId_${i}`) as string;
        const buttonImage = formData.get(`buttonImage_${i}`) as File | null;
        
        if (buttonId && buttonImage) {
          // Находим кнопку по ID
          const buttonIndex = shopSettings.buttons.findIndex((b: any) => b.id === buttonId);
          
          if (buttonIndex !== -1) {
            // Загружаем новое изображение
            const bytes = await buttonImage.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            // Генерируем уникальное имя файла
            const fileName = `shop-${uuidv4()}.${buttonImage.name.split('.').pop()}`;
            const uploadDir = path.join(process.cwd(), 'public', 'images', 'uploads');
            
            // Проверяем существование директории и создаем её при необходимости
            if (!fs.existsSync(uploadDir)) {
              await mkdir(uploadDir, { recursive: true });
              console.log(`Создана директория: ${uploadDir}`);
            }
            
            const filePath = path.join(uploadDir, fileName);
            
            // Сохраняем файл
            await writeFile(filePath, buffer);
            console.log(`Файл сохранен: ${filePath}`);
            
            // Обновляем путь к изображению в настройках
            shopSettings.buttons[buttonIndex].buttonImage = `/images/uploads/${fileName}`;
          }
        }
      }
    }
    
    // Сохраняем настройки напрямую в БД
    const directSaveResult = await saveShopSettingsDirectly(shopSettings);
    
    if (directSaveResult) {
      console.log('Настройки успешно сохранены напрямую в БД');
      return NextResponse.json({
        success: true,
        data: shopSettings,
        message: 'Настройки магазина успешно сохранены'
      });
    }
    
    // Запасной вариант сохранения
    try {
      // Получаем существующие настройки
      const allSettings = await getSettings() || {};
      
      // Обновляем настройки магазина
      allSettings.shop_settings = shopSettings;
      
      console.log('Все настройки перед сохранением:', allSettings);
      
      // Сохраняем все настройки
      const saveResult = await saveSettings(allSettings);
      console.log('Результат сохранения настроек:', saveResult);
      
      // Проверяем, что настройки действительно сохранились
      const checkSettings = await getSettings();
      console.log('Проверка сохраненных настроек:', checkSettings?.shop_settings);
      
      return NextResponse.json({
        success: true,
        data: shopSettings,
        message: 'Настройки магазина успешно сохранены (запасной метод)'
      });
    } catch (saveError) {
      console.error('Ошибка при сохранении настроек через saveSettings:', saveError);
      
      // Последний запасной вариант - сохраняем в файл
      try {
        const configDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(configDir)) {
          await mkdir(configDir, { recursive: true });
        }
        
        const configPath = path.join(configDir, 'shop_settings.json');
        await writeFile(configPath, JSON.stringify(shopSettings, null, 2));
        
        console.log('Настройки сохранены в файл:', configPath);
        
        return NextResponse.json({
          success: true,
          data: shopSettings,
          message: 'Настройки магазина сохранены в файл'
        });
      } catch (fileError) {
        console.error('Ошибка при сохранении настроек в файл:', fileError);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при сохранении настроек магазина'
    }, { status: 500 });
  } catch (error) {
    console.error('Ошибка при сохранении настроек магазина:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при сохранении настроек магазина'
    }, { status: 500 });
  }
} 