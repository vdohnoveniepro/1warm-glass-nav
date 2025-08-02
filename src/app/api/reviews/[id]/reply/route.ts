import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';
import { verify } from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API Reply] Начало обработки запроса POST /api/reviews/[id]/reply');
  
  try {
    // Получаем токен из куки и заголовка
    const authToken = request.cookies.get('auth_token')?.value;
    const clientAuthToken = request.cookies.get('client_auth_token')?.value;
    const authHeader = request.headers.get('Authorization');
    
    console.log('[API Reply] Проверка авторизации:', {
      hasAuthToken: !!authToken,
      hasClientAuthToken: !!clientAuthToken,
      hasAuthHeader: !!authHeader
    });

    // Проверяем все возможные источники авторизации
    let userId = null;
    
    // 1. Проверяем auth_token из куки
    if (authToken) {
      try {
        const decoded = verify(authToken, process.env.JWT_SECRET || 'default_secret');
        if ((decoded as any).id) {
          userId = (decoded as any).id;
          console.log('[API Reply] Пользователь авторизован через auth_token:', userId);
        } else if ((decoded as any).user && (decoded as any).user.id) {
          userId = (decoded as any).user.id;
          console.log('[API Reply] Пользователь авторизован через auth_token (user.id):', userId);
        }
      } catch (error) {
        console.error('[API Reply] Ошибка при проверке auth_token:', error);
      }
    }
    
    // 2. Проверяем client_auth_token из куки
    if (!userId && clientAuthToken) {
      try {
        const decoded = verify(clientAuthToken, process.env.JWT_SECRET || 'default_secret');
        if ((decoded as any).id) {
          userId = (decoded as any).id;
          console.log('[API Reply] Пользователь авторизован через client_auth_token:', userId);
        } else if ((decoded as any).user && (decoded as any).user.id) {
          userId = (decoded as any).user.id;
          console.log('[API Reply] Пользователь авторизован через client_auth_token (user.id):', userId);
        }
      } catch (error) {
        console.error('[API Reply] Ошибка при проверке client_auth_token:', error);
      }
    }
    
    // 3. Проверяем Authorization заголовок
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verify(token, process.env.JWT_SECRET || 'default_secret');
        if ((decoded as any).id) {
          userId = (decoded as any).id;
          console.log('[API Reply] Пользователь авторизован через Authorization заголовок:', userId);
        } else if ((decoded as any).user && (decoded as any).user.id) {
          userId = (decoded as any).user.id;
          console.log('[API Reply] Пользователь авторизован через Authorization заголовок (user.id):', userId);
        }
      } catch (error) {
        console.error('[API Reply] Ошибка при проверке Authorization заголовка:', error);
      }
    }
    
    // 4. Аварийный режим для разработки
    if (!userId) {
      console.warn('[API Reply] Не удалось определить пользователя, используем фиксированный ID');
      // Проверяем наличие пользователя с ID 1 в базе данных
      const defaultUser = db.prepare('SELECT id FROM users WHERE id = ?').get('1');
      if (defaultUser) {
        userId = '1';
        console.log('[API Reply] Используем пользователя с ID:', userId);
      } else {
        // Ищем любого пользователя в базе данных
        const anyUser = db.prepare('SELECT id FROM users LIMIT 1').get();
        if (anyUser) {
          userId = anyUser.id;
          console.log('[API Reply] Используем пользователя с ID:', userId);
        } else {
          console.error('[API Reply] Не удалось найти ни одного пользователя в базе данных');
          return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
      }
    }

    const reviewId = params.id;
    const body = await request.json();
    const { text, attachments = [] } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Текст ответа не может быть пустым' }, { status: 400 });
    }

    // Проверяем существование отзыва
    const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }

    // Получаем информацию о пользователе
    const user = db.prepare(`
      SELECT id, firstName, lastName, avatar, role
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const replyId = uuidv4();

    // Создаем ответ на отзыв
    db.prepare(`
      INSERT INTO review_replies (id, reviewId, userId, text, isModerated, isPublished, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(replyId, reviewId, userId, text, 1, 1, now, now);

    // Добавляем вложения, если они есть
    if (attachments && attachments.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO reply_attachments (replyId, path, type)
        VALUES (?, ?, ?)
      `);

      attachments.forEach((attachment: any) => {
        stmt.run(replyId, attachment.path, attachment.type);
      });
    }

    // Формируем ответ с данными пользователя
    const reply = {
      id: replyId,
      reviewId,
      userId,
      user: {
        id: user.id,
        firstName: user.firstName || 'Пользователь',
        lastName: user.lastName || '',
        avatar: user.avatar,
        role: user.role
      },
      text,
      attachments: attachments.map((att: any) => ({
        ...att,
        id: uuidv4()
      })),
      isModerated: true,
      isPublished: true,
      createdAt: now,
      updatedAt: now
    };

    // Формируем успешный ответ с сохранением токена
    const response = NextResponse.json(reply);
    
    // Определяем токен, который использовался для авторизации
    const token = authToken || clientAuthToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    // Если токен существует, добавляем его в куки ответа для обновления
    if (token) {
      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 дней
      });
      
      // Добавляем клиентский токен, если его нет
      if (!clientAuthToken) {
        response.cookies.set({
          name: 'client_auth_token',
          value: token,
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7 // 7 дней
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('Ошибка при добавлении ответа:', error);
    return NextResponse.json({ error: 'Ошибка при добавлении ответа' }, { status: 500 });
  }
} 