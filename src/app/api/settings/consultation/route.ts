import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

interface ConsultationSettings {
  serviceId: string;
  isEnabled: boolean;
  title: string;
  description: string;
}

// Путь к файлу настроек
const getSettingsFilePath = () => {
  const dataDir = path.join(process.cwd(), 'public', 'data', 'settings');
  
  // Создаем директорию, если она не существует
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return path.join(dataDir, 'consultation.json');
};

// Получение настроек
const getSettings = (): ConsultationSettings => {
  const filePath = getSettingsFilePath();
  
  // Если файл не существует или пустой, возвращаем настройки по умолчанию
  if (!fs.existsSync(filePath)) {
    return {
      serviceId: '',
      isEnabled: true,
      title: 'Нужна консультация специалиста?',
      description: 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.'
    };
  }
  
  try {
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const settings = JSON.parse(fileData) as ConsultationSettings;
    
    // Устанавливаем значения по умолчанию, если какие-то поля отсутствуют
    return {
      serviceId: settings.serviceId ?? '',
      isEnabled: settings.isEnabled ?? true,
      title: settings.title ?? 'Нужна консультация специалиста?',
      description: settings.description ?? 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.'
    };
  } catch (error) {
    console.error('Ошибка при чтении файла настроек:', error);
    return {
      serviceId: '',
      isEnabled: true,
      title: 'Нужна консультация специалиста?',
      description: 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.'
    };
  }
};

// Сохранение настроек
const saveSettings = (settings: ConsultationSettings) => {
  const filePath = getSettingsFilePath();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    return false;
  }
};

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка при получении настроек консультации:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении настроек' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }
    
    const data = await request.json() as ConsultationSettings;
    
    // Проверяем и устанавливаем значения по умолчанию
    const settings: ConsultationSettings = {
      serviceId: data.serviceId ?? '',
      isEnabled: data.isEnabled ?? true,
      title: data.title ?? 'Нужна консультация специалиста?',
      description: data.description ?? 'Обсудите ваши вопросы с экспертом. Наши специалисты помогут вам найти решение ваших проблем и подобрать индивидуальный подход.'
    };
    
    const success = saveSettings(settings);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Ошибка при сохранении настроек' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Ошибка при сохранении настроек консультации:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при сохранении настроек' },
      { status: 500 }
    );
  }
} 