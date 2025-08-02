import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verify } from 'jsonwebtoken';
import { usersAdapter } from '@/database/adapters';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API Reviews Reaction] Начало обработки запроса POST');
  
  try {
    const reviewId = params.id;
    console.log(`[API Reviews Reaction] ID отзыва: ${reviewId}`);
    
    // Получаем токен из куки для авторизации
    const authToken = request.cookies.get('auth_token')?.value;
    const clientAuthToken = request.cookies.get('client_auth_token')?.value;
    const authHeader = request.headers.get('Authorization');
    
    console.log('[API Reviews Reaction] Проверка авторизации:', { 
      hasToken: !!authToken,
      hasClientToken: !!clientAuthToken,
      hasAuthHeader: !!authHeader
    });
    
    // Проверяем авторизацию
    let userId = null;
    
    // Пробуем получить токен из всех возможных источников
    const token = authToken || clientAuthToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET || 'default_secret');
        
        // Извлекаем ID пользователя из токена
        if ((decoded as any).id) {
          userId = (decoded as any).id;
          console.log('[API Reviews Reaction] Пользователь авторизован через токен:', userId);
        } else if ((decoded as any).user && (decoded as any).user.id) {
          userId = (decoded as any).user.id;
          console.log('[API Reviews Reaction] Пользователь авторизован через user.id в токене:', userId);
        }
      } catch (error) {
        console.error('[API Reviews Reaction] Ошибка при проверке токена:', error);
      }
    }
    
    // Если пользователь не авторизован
    if (!userId) {
      console.error('[API Reviews Reaction] Пользователь не авторизован');
      return NextResponse.json({ error: 'Для добавления реакции необходимо авторизоваться' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Проверяем существование пользователя в базе данных
    const user = await usersAdapter.getById(userId);
    if (!user) {
      console.error(`[API Reviews Reaction] Пользователь с ID ${userId} не найден в базе данных`);
      return NextResponse.json({ error: 'Пользователь не найден' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    const body = await request.json();
    const { type } = body;
    console.log(`[API Reviews Reaction] Тип реакции: ${type}`);

    if (!type || !['like', 'dislike', 'love', 'thanks', 'wow', 'sad', 'none'].includes(type)) {
      return NextResponse.json({ error: 'Неверный тип реакции' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Проверяем существование отзыва
    const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
      console.error(`[API Reviews Reaction] Отзыв с ID ${reviewId} не найден`);
      return NextResponse.json({ error: 'Отзыв не найден' }, { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Проверяем, есть ли уже реакция от этого пользователя
    const existingReaction = db.prepare(`
      SELECT id, type FROM review_reactions 
      WHERE reviewId = ? AND userId = ?
    `).get(reviewId, userId);

    const now = new Date().toISOString();

    // Обрабатываем существующую реакцию
    if (existingReaction) {
      // Если тип реакции такой же, удаляем реакцию
      if (existingReaction.type === type || type === 'none') {
        db.prepare('DELETE FROM review_reactions WHERE id = ?').run(existingReaction.id);
        console.log(`[API Reviews Reaction] Удалена реакция типа ${existingReaction.type} от пользователя ${userId}`);
      } else {
        // Иначе обновляем тип реакции
        db.prepare('UPDATE review_reactions SET type = ?, createdAt = ? WHERE id = ?')
          .run(type, now, existingReaction.id);
        console.log(`[API Reviews Reaction] Обновлена реакция с типа ${existingReaction.type} на ${type} от пользователя ${userId}`);
      }
    } else if (type !== 'none') {
      // Создаем новую реакцию, если её ещё нет и тип не 'none'
      const reactionId = uuidv4();
      db.prepare(`
        INSERT INTO review_reactions (id, reviewId, userId, type, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(reactionId, reviewId, userId, type, now);
      console.log(`[API Reviews Reaction] Создана новая реакция типа ${type} от пользователя ${userId}`);
    }

    // Получаем все реакции для отзыва с данными пользователей
    const reactions = db.prepare(`
      SELECT rr.id, rr.userId, rr.type, rr.createdAt,
             u.firstName, u.lastName, u.avatar
      FROM review_reactions rr
      LEFT JOIN users u ON rr.userId = u.id
      WHERE rr.reviewId = ?
    `).all(reviewId);
    
    console.log(`[API Reviews Reaction] Всего реакций для отзыва: ${reactions.length}`);

    // Получаем полные данные отзыва для возврата
    const fullReview = db.prepare(`
      SELECT 
        r.id, r.specialistId, r.userId, r.serviceId, r.serviceName, 
        r.appointmentId, r.rating, r.text, r.isModerated, r.isPublished,
        r.createdAt, r.updatedAt
      FROM reviews r
      WHERE r.id = ?
    `).get(reviewId);

    if (!fullReview) {
      console.error(`[API Reviews Reaction] Не удалось получить данные отзыва ${reviewId}`);
      return NextResponse.json({ error: 'Ошибка при получении данных отзыва' }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Получаем данные пользователя, оставившего отзыв
    const reviewUser = await usersAdapter.getById(fullReview.userId);

    // Получаем вложения для отзыва
    const reviewAttachments = db.prepare(`
      SELECT id, type, url, name, createdAt
      FROM review_attachments
      WHERE reviewId = ?
    `).all(reviewId);

    // Получаем ответы на отзыв
    const replies = db.prepare(`
      SELECT 
        rr.id, rr.reviewId, rr.userId, rr.text, rr.isModerated, rr.isPublished,
        rr.createdAt, rr.updatedAt,
        u.firstName, u.lastName, u.avatar, u.role
      FROM review_replies rr
      LEFT JOIN users u ON rr.userId = u.id
      WHERE rr.reviewId = ? AND rr.isPublished = 1
      ORDER BY rr.createdAt ASC
    `).all(reviewId);

    // Формируем полный ответ
    const responseData = {
      id: fullReview.id,
      specialistId: fullReview.specialistId,
      userId: fullReview.userId,
      serviceId: fullReview.serviceId,
      serviceName: fullReview.serviceName,
      appointmentId: fullReview.appointmentId,
      rating: fullReview.rating,
      text: fullReview.text,
      isModerated: fullReview.isModerated,
      isPublished: fullReview.isPublished,
      createdAt: fullReview.createdAt,
      updatedAt: fullReview.updatedAt,
      attachments: reviewAttachments,
      reactions: reactions,
      replies: replies,
      user: reviewUser ? {
        id: reviewUser.id,
        firstName: reviewUser.firstName || '',
        lastName: reviewUser.lastName || '',
        avatar: reviewUser.avatar,
        role: reviewUser.role
      } : {
        id: fullReview.userId,
        firstName: '',
        lastName: '',
        avatar: null,
        role: 'user'
      }
    };

    // Формируем успешный ответ с сохранением токена
    const response = NextResponse.json(responseData);
    
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
    
    // Добавляем нужные заголовки
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('[API Reviews Reaction] Ошибка при обработке реакции:', error);
    return NextResponse.json({ error: 'Ошибка при обработке реакции' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
} 