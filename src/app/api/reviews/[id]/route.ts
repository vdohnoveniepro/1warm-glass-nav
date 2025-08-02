import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { Review } from '@/models/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { verify } from 'jsonwebtoken';

// Функция для получения отзыва по ID
function getReviewById(id: string): Review | null {
  try {
    // Получаем основные данные отзыва
    const reviewRow = db.prepare(`
      SELECT r.*, 
             u.firstName as userFirstName, 
             u.lastName as userLastName, 
             u.avatar as userAvatar
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      WHERE r.id = ?
    `).get(id);
    
    if (!reviewRow) {
      return null;
    }
    
    // Получаем вложения для отзыва
    const attachments = db.prepare(`
      SELECT * FROM review_attachments 
      WHERE reviewId = ?
    `).all(id);
    
    // Преобразуем вложения в правильный формат
    const formattedAttachments = attachments.map((attachment: any) => ({
      id: attachment.id,
      reviewId: attachment.reviewId,
      type: attachment.type || 'image',
      url: attachment.url || attachment.path || '/images/default-attachment.png',
      name: attachment.name || 'Вложение',
      createdAt: attachment.createdAt || reviewRow.createdAt
    }));
    
    // Получаем реакции на отзыв
    const reactions = db.prepare(`
      SELECT ra.*, 
             u.firstName as userFirstName, 
             u.lastName as userLastName, 
             u.avatar as userAvatar
      FROM review_reactions ra
      LEFT JOIN users u ON ra.userId = u.id
      WHERE ra.reviewId = ?
    `).all(id);
    
    // Получаем ответы на отзыв
    const repliesRows = db.prepare(`
      SELECT rr.*, 
             u.firstName as userFirstName, 
             u.lastName as userLastName, 
             u.avatar as userAvatar,
             u.role as userRole
      FROM review_replies rr
      LEFT JOIN users u ON rr.userId = u.id
      WHERE rr.reviewId = ?
      ORDER BY rr.createdAt ASC
    `).all(id);
    
    // Преобразуем ответы в формат ReviewReply
    const replies = repliesRows.map((reply: any) => ({
      id: reply.id,
      reviewId: reply.reviewId,
      parentReplyId: reply.parentReplyId,
      userId: reply.userId,
      user: {
        id: reply.userId,
        firstName: reply.userFirstName || 'Пользователь',
        lastName: reply.userLastName || '',
        avatar: reply.userAvatar,
        role: reply.userRole
      },
      text: reply.text,
      attachments: [], // TODO: добавить загрузку вложений для ответов
      reactions: [], // TODO: добавить загрузку реакций для ответов
      isModerated: reply.isModerated === 1,
      isPublished: reply.isPublished === 1,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt
    }));
    
    // Формируем объект отзыва
    return {
      id: reviewRow.id,
      userId: reviewRow.userId,
      user: {
        id: reviewRow.userId,
        firstName: reviewRow.userFirstName || 'Анонимный пользователь',
        lastName: reviewRow.userLastName || '',
        avatar: reviewRow.userAvatar || '/images/default-avatar.png'
      },
      specialistId: reviewRow.specialistId,
      serviceId: reviewRow.serviceId,
      serviceName: reviewRow.serviceName,
      appointmentId: reviewRow.appointmentId,
      rating: reviewRow.rating,
      text: reviewRow.text,
      attachments: formattedAttachments,
      reactions: reactions,
      replies: replies,
      isModerated: reviewRow.isModerated === 1,
      isPublished: reviewRow.isPublished === 1,
      createdAt: reviewRow.createdAt,
      updatedAt: reviewRow.updatedAt
    };
  } catch (error) {
    console.error('Ошибка при получении отзыва из базы данных:', error);
    return null;
  }
}

// Функция для обновления отзыва
function updateReview(id: string, data: Partial<Review>): Review | null {
  try {
    // Получаем текущий отзыв
    const review = getReviewById(id);
    
    if (!review) {
      return null;
    }
    
    // Обновляем поля отзыва
    const updatedReview = {
      ...review,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Обновляем отзыв в базе данных
    db.prepare(`
      UPDATE reviews
      SET isModerated = ?,
          isPublished = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      updatedReview.isModerated ? 1 : 0,
      updatedReview.isPublished ? 1 : 0,
      updatedReview.updatedAt,
      id
    );
    
    return updatedReview;
  } catch (error) {
    console.error('Ошибка при обновлении отзыва в базе данных:', error);
    return null;
  }
}

// Функция для удаления отзыва
function deleteReview(id: string): boolean {
  try {
    // Удаляем все связанные данные (вложения, реакции, ответы)
    db.prepare(`DELETE FROM review_attachments WHERE reviewId = ?`).run(id);
    db.prepare(`DELETE FROM review_reactions WHERE reviewId = ?`).run(id);
    db.prepare(`DELETE FROM review_replies WHERE reviewId = ?`).run(id);
    
    // Удаляем сам отзыв
    const result = db.prepare(`DELETE FROM reviews WHERE id = ?`).run(id);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка при удалении отзыва из базы данных:', error);
    return false;
  }
}

// Обработчик GET запроса для получения одного отзыва по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID отзыва обязателен' },
        { status: 400 }
      );
    }
    
    // Получаем отзыв по ID
    const review = getReviewById(id);
    
    if (!review) {
      return NextResponse.json(
        { error: 'Отзыв не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(review);
  } catch (error) {
    console.error('Ошибка при обработке GET запроса:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при получении отзыва' },
      { status: 500 }
    );
  }
}

// Обработчик PATCH запроса для обновления отзыва
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID отзыва обязателен' },
        { status: 400 }
      );
    }
    
    // Получаем данные для обновления
    let data;
    try {
      data = await request.json();
    } catch (jsonError) {
      console.error('Ошибка при разборе JSON тела запроса:', jsonError);
      return NextResponse.json(
        { error: 'Некорректный формат запроса. Ошибка при разборе JSON.' },
        { status: 400 }
      );
    }
    
    // Обновляем отзыв
    const updatedReview = updateReview(id, data);
    
    if (!updatedReview) {
      return NextResponse.json(
        { error: 'Отзыв не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error('Ошибка при обработке PATCH запроса:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обновлении отзыва' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API Reviews DELETE] Начало обработки запроса DELETE');
  
  try {
    const reviewId = params.id;
    console.log(`[API Reviews DELETE] ID отзыва: ${reviewId}`);
    
    // Получаем сессию через next-auth
    const session = await getServerSession(authOptions);
    
    // Получаем токен из куки для дополнительной проверки
    const authToken = request.cookies.get('auth_token')?.value;
    console.log('[API Reviews DELETE] Проверка авторизации:', { 
      hasSession: !!session?.user, 
      hasToken: !!authToken, 
      tokenLength: authToken ? authToken.length : 0 
    });
    
    // Проверяем авторизацию через next-auth или auth_token
    let userId = null;
    
    if (session?.user) {
      userId = session.user.id;
      console.log('[API Reviews DELETE] Пользователь авторизован через next-auth:', userId);
    } else if (authToken) {
      try {
        // Декодируем токен
        const decoded = verify(authToken, process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production');
        
        // Проверяем структуру токена и получаем ID пользователя
        let decodedUserId = null;
        
        // Вариант 1: ID находится непосредственно в поле id
        if ((decoded as any).id) {
          decodedUserId = (decoded as any).id;
          console.log('[API Reviews DELETE] Найден ID в корне токена:', decodedUserId);
        } 
        // Вариант 2: ID находится в поле user.id (стандартный формат)
        else if ((decoded as any).user && (decoded as any).user.id) {
          decodedUserId = (decoded as any).user.id;
          console.log('[API Reviews DELETE] Найден ID в поле user.id:', decodedUserId);
        }
        
        if (decodedUserId) {
          userId = decodedUserId;
          console.log('[API Reviews DELETE] Токен декодирован успешно:', { 
            userId, 
            decodedData: JSON.stringify(decoded)
          });
        } else {
          console.error('[API Reviews DELETE] Не удалось найти ID пользователя в токене');
        }
      } catch (error) {
        console.error('[API Reviews DELETE] Ошибка при проверке токена:', error);
      }
    }
    
    // Если пользователь не авторизован ни через next-auth, ни через токен
    if (!userId) {
      console.error('[API Reviews DELETE] Пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем существование отзыва и права на удаление
    const review = db.prepare('SELECT userId FROM reviews WHERE id = ?').get(reviewId);
    
    if (!review) {
      console.error(`[API Reviews DELETE] Отзыв с ID ${reviewId} не найден`);
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }
    
    // Проверяем, что пользователь является автором отзыва или администратором
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    const isAdmin = user && user.role === 'admin';
    
    if (review.userId !== userId && !isAdmin) {
      console.error(`[API Reviews DELETE] Пользователь ${userId} не имеет прав на удаление отзыва ${reviewId}`);
      return NextResponse.json({ error: 'Нет прав на удаление отзыва' }, { status: 403 });
    }
    
    console.log(`[API Reviews DELETE] Удаление отзыва ${reviewId} пользователем ${userId}`);
    
    // Начинаем транзакцию для удаления отзыва и связанных данных
    db.transaction(() => {
      // Удаляем связанные реакции
      db.prepare('DELETE FROM review_reactions WHERE reviewId = ?').run(reviewId);
      
      // Удаляем связанные вложения
      db.prepare('DELETE FROM review_attachments WHERE reviewId = ?').run(reviewId);
      
      // Удаляем связанные ответы
      db.prepare('DELETE FROM review_replies WHERE reviewId = ?').run(reviewId);
      
      // Удаляем сам отзыв
      db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
    })();
    
    console.log(`[API Reviews DELETE] Отзыв ${reviewId} успешно удален`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Reviews DELETE] Ошибка при удалении отзыва:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении отзыва' },
      { status: 500 }
    );
  }
} 