import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  // Проверка авторизации
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Необходима авторизация администратора' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { enabled } = data;

    // Здесь мы просто возвращаем фиктивный ответ, как будто сервер запущен
    // В реальной реализации здесь бы был запуск/остановка SQLite-сервера
    return NextResponse.json({
      enabled,
      port: 8080,
      message: enabled ? 'SQLite сервер запущен' : 'SQLite сервер остановлен'
    });
  } catch (error) {
    console.error('Ошибка при управлении SQLite-сервером:', error);
    return NextResponse.json({ error: 'Ошибка при управлении SQLite-сервером' }, { status: 500 });
  }
} 