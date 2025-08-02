import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dataDir = path.join(process.cwd(), 'public', 'data', 'events');
const eventsFilePath = path.join(dataDir, 'events.json');

// Вспомогательная функция для чтения данных из файла
const readEventsFile = (): any[] => {
  try {
    if (!fs.existsSync(eventsFilePath)) {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(eventsFilePath, '[]', 'utf8');
      return [];
    }
    const fileData = fs.readFileSync(eventsFilePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('Ошибка при чтении файла мероприятий:', error);
    return [];
  }
};

// Вспомогательная функция для записи данных в файл
const writeEventsFile = (data: any[]): void => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(eventsFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка при записи файла мероприятий:', error);
  }
};

export async function GET() {
  try {
    const events = readEventsFile();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Ошибка при получении мероприятий:', error);
    return NextResponse.json({ error: 'Не удалось получить мероприятия' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const events = readEventsFile();
    const eventData = await request.json();
    
    if (!eventData.title || !eventData.description || !eventData.date) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    const newEvent = {
      ...eventData,
      id: uuidv4(),
      slug: eventData.slug || eventData.title.toLowerCase().replace(/\s+/g, '-'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    events.push(newEvent);
    writeEventsFile(events);
    
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании мероприятия:', error);
    return NextResponse.json(
      { error: 'Не удалось создать мероприятие' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const events = readEventsFile();
    const eventData = await request.json();
    
    if (!eventData.id) {
      return NextResponse.json(
        { error: 'Отсутствует идентификатор мероприятия' },
        { status: 400 }
      );
    }
    
    const index = events.findIndex((event: any) => event.id === eventData.id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Мероприятие не найдено' },
        { status: 404 }
      );
    }
    
    events[index] = {
      ...events[index],
      ...eventData,
      updatedAt: new Date().toISOString(),
    };
    
    writeEventsFile(events);
    
    return NextResponse.json(events[index]);
  } catch (error) {
    console.error('Ошибка при обновлении мероприятия:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить мероприятие' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Отсутствует идентификатор мероприятия' },
        { status: 400 }
      );
    }
    
    const events = readEventsFile();
    const filteredEvents = events.filter((event: any) => event.id !== id);
    
    if (events.length === filteredEvents.length) {
      return NextResponse.json(
        { error: 'Мероприятие не найдено' },
        { status: 404 }
      );
    }
    
    writeEventsFile(filteredEvents);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении мероприятия:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить мероприятие' },
      { status: 500 }
    );
  }
} 