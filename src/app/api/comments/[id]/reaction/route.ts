import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен из куки
    const authToken = request.cookies.get('auth_token')?.value;

    // Проверяем авторизацию
    if (!authToken) {
      return NextResponse.json({ error: 'Не авторизован' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Декодируем токен
    let userId;
    try {
      const decoded = verify(authToken, process.env.JWT_SECRET || 'default_secret');
      
      // Проверяем структуру токена и получаем ID пользователя
      let decodedUserId = null;
      
      // Вариант 1: ID находится непосредственно в поле id
      if ((decoded as any).id) {
        decodedUserId = (decoded as any).id;
        console.log('[API Reaction] Найден ID в корне токена:', decodedUserId);
      } 
      // Вариант 2: ID находится в поле user.id (стандартный формат)
      else if ((decoded as any).user && (decoded as any).user.id) {
        decodedUserId = (decoded as any).user.id;
        console.log('[API Reaction] Найден ID в поле user.id:', decodedUserId);
      }
      
      if (!decodedUserId) {
        console.error('[API Reaction] Не удалось найти ID пользователя в токене:', JSON.stringify(decoded));
        return NextResponse.json({ error: 'Недействительный токен авторизации' }, { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      }
      
      userId = decodedUserId;
      console.log('[API Reaction] Токен декодирован успешно, userId:', userId);
    } catch (error) {
      console.error('[API Reaction] Ошибка при проверке токена:', error);
      return NextResponse.json({ error: 'Недействительный токен авторизации' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    const commentId = params.id;
    const body = await request.json();
    const { reaction } = body;

    if (!reaction || !['like', 'dislike', 'none'].includes(reaction)) {
      return NextResponse.json({ error: 'Неверные параметры' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Получаем текущий комментарий
    const comment = db.prepare(`
      SELECT id, likes, dislikes, likedBy, dislikedBy
      FROM comments
      WHERE id = ?
    `).get(commentId);

    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Парсим списки лайков и дизлайков
    const likedBy = comment.likedBy ? JSON.parse(comment.likedBy) : [];
    const dislikedBy = comment.dislikedBy ? JSON.parse(comment.dislikedBy) : [];

    // Обрабатываем реакцию
    let newLikedBy = [...likedBy];
    let newDislikedBy = [...dislikedBy];
    let newLikes = comment.likes;
    let newDislikes = comment.dislikes;

    // Удаляем предыдущие реакции пользователя
    if (likedBy.includes(userId)) {
      newLikedBy = newLikedBy.filter(id => id !== userId);
      newLikes--;
    }
    if (dislikedBy.includes(userId)) {
      newDislikedBy = newDislikedBy.filter(id => id !== userId);
      newDislikes--;
    }

    // Добавляем новую реакцию
    if (reaction === 'like') {
      newLikedBy.push(userId);
      newLikes++;
    } else if (reaction === 'dislike') {
      newDislikedBy.push(userId);
      newDislikes++;
    }

    // Обновляем комментарий
    db.prepare(`
      UPDATE comments
      SET likes = ?, dislikes = ?, likedBy = ?, dislikedBy = ?
      WHERE id = ?
    `).run(
      newLikes,
      newDislikes,
      JSON.stringify(newLikedBy),
      JSON.stringify(newDislikedBy),
      commentId
    );

    return NextResponse.json({
      likes: newLikes,
      dislikes: newDislikes,
      likedBy: newLikedBy,
      dislikedBy: newDislikedBy,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Ошибка при обработке реакции:', error);
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