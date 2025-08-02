import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { usersAdapter } from '@/database/adapters';
import { verify } from 'jsonwebtoken';

// Интерфейс комментария для внутреннего использования API
interface CommentData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  articleId: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  replies?: CommentData[];
  photo?: string;
}

// GET /api/comments?articleId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({ error: 'Не указан ID статьи' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Получаем все комментарии для статьи
    const comments = db.prepare(`
      SELECT 
        c.id, 
        c.content, 
        c.articleId, 
        c.parentId, 
        c.createdAt, 
        c.updatedAt,
        c.userName, 
        c.userAvatar, 
        c.userId, 
        c.likes, 
        c.dislikes,
        c.likedBy,
        c.dislikedBy,
        c.photo
      FROM comments c
      WHERE c.articleId = ?
      ORDER BY c.createdAt ASC
    `).all(articleId);

    // Обрабатываем результаты для правильного отображения
    const processedComments = await Promise.all(comments.map(async (comment: any) => {
      // Если есть userId, пытаемся получить актуальный аватар пользователя
      if (comment.userId) {
        try {
          const user = await usersAdapter.getById(comment.userId);
          if (user) {
            // Используем аватар из профиля, если он есть
            comment.userAvatar = user.avatar || comment.userAvatar || comment.photo || null;
          }
        } catch (error) {
          console.error('Ошибка при получении пользователя:', error);
        }
      }

      return {
        ...comment,
        likedBy: comment.likedBy ? JSON.parse(comment.likedBy) : [],
        dislikedBy: comment.dislikedBy ? JSON.parse(comment.dislikedBy) : [],
      };
    }));

    // Строим дерево комментариев
    const commentTree = buildCommentTree(processedComments);

    return NextResponse.json(commentTree, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    return NextResponse.json({ error: 'Ошибка при получении комментариев' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

// POST /api/comments
export async function POST(request: NextRequest) {
  try {
    // Получаем токен из куки
    const authToken = request.cookies.get('auth_token')?.value;
    console.log('[API Comments POST] Проверка токена:', { 
      hasToken: !!authToken, 
      tokenLength: authToken ? authToken.length : 0 
    });
    
    const body = await request.json();
    const { content, articleId, parentId = null, photo = null } = body;

    if (!content || !articleId) {
      return NextResponse.json({ error: 'Не указаны обязательные поля' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    let userId = null;
    let userName = body.userName || 'Гость';
    let userAvatar = body.userAvatar || null;

    // Если пользователь авторизован, используем его данные
    if (authToken) {
      try {
        // Декодируем токен
        const decoded = verify(authToken, process.env.JWT_SECRET || 'default_secret');
        
        // Проверяем структуру токена и получаем ID пользователя
        let decodedUserId = null;
        
        // Вариант 1: ID находится непосредственно в поле id
        if ((decoded as any).id) {
          decodedUserId = (decoded as any).id;
          console.log('[API Comments POST] Найден ID в корне токена:', decodedUserId);
        } 
        // Вариант 2: ID находится в поле user.id (стандартный формат)
        else if ((decoded as any).user && (decoded as any).user.id) {
          decodedUserId = (decoded as any).user.id;
          console.log('[API Comments POST] Найден ID в поле user.id:', decodedUserId);
        }
        
        if (decodedUserId) {
          userId = decodedUserId;
          console.log('[API Comments POST] Токен декодирован успешно:', { 
            userId, 
            decodedData: JSON.stringify(decoded)
          });
          
          // Получаем актуальные данные пользователя из базы
          try {
            const user = await usersAdapter.getById(userId);
            if (user) {
              userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь';
              userAvatar = user.avatar || null;
              
              // Убедимся, что userId установлен корректно
              userId = user.id;
              console.log(`[API Comments POST] Комментарий от авторизованного пользователя: ${userName}, ID: ${userId}`);
            } else {
              console.log('[API Comments POST] Пользователь не найден в базе данных, хотя токен валидный');
              userId = null;
            }
          } catch (error) {
            console.error('[API Comments POST] Ошибка при получении пользователя:', error);
            userId = null;
          }
        } else {
          console.error('[API Comments POST] Не удалось найти ID пользователя в токене');
          userId = null;
        }
      } catch (error) {
        console.error('[API Comments POST] Ошибка при проверке токена:', error);
        // Если токен недействителен, продолжаем как гость
        userId = null;
      }
    } else {
      console.log('[API Comments POST] Комментарий от неавторизованного пользователя (гость)');
    }

    const commentId = uuidv4();
    const now = new Date().toISOString();

    // Создаем новый комментарий
    db.prepare(`
      INSERT INTO comments (
        id, content, articleId, parentId, 
        userId, userName, userAvatar, 
        createdAt, updatedAt, 
        likes, dislikes, likedBy, dislikedBy, photo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      commentId, content, articleId, parentId,
      userId, userName, userAvatar,
      now, now,
      0, 0, '[]', '[]', photo
    );

    // Получаем созданный комментарий
    const comment = db.prepare(`
      SELECT 
        id, content, articleId, parentId, 
        userId, userName, userAvatar, 
        createdAt, updatedAt, 
        likes, dislikes, likedBy, dislikedBy, photo
      FROM comments 
      WHERE id = ?
    `).get(commentId);

    return NextResponse.json({
      ...comment,
      likedBy: [],
      dislikedBy: [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Ошибка при создании комментария:', error);
    return NextResponse.json({ error: 'Ошибка при создании комментария' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

// DELETE /api/comments?id=...
export async function DELETE(request: NextRequest) {
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
    let userRole;
    try {
      const decoded = verify(authToken, process.env.JWT_SECRET || 'default_secret');
      
      // Проверяем структуру токена и получаем ID пользователя
      let decodedUserId = null;
      
      // Вариант 1: ID находится непосредственно в поле id
      if ((decoded as any).id) {
        decodedUserId = (decoded as any).id;
        userRole = (decoded as any).role;
        console.log('[API Comments DELETE] Найден ID в корне токена:', decodedUserId);
      } 
      // Вариант 2: ID находится в поле user.id (стандартный формат)
      else if ((decoded as any).user && (decoded as any).user.id) {
        decodedUserId = (decoded as any).user.id;
        userRole = (decoded as any).user.role;
        console.log('[API Comments DELETE] Найден ID в поле user.id:', decodedUserId);
      }
      
      if (!decodedUserId) {
        console.error('[API Comments DELETE] Не удалось найти ID пользователя в токене:', JSON.stringify(decoded));
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
      console.log('[API Comments DELETE] Токен декодирован успешно:', { userId, userRole });
    } catch (error) {
      console.error('[API Comments DELETE] Ошибка при проверке токена:', error);
      return NextResponse.json({ error: 'Недействительный токен авторизации' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Не указан ID комментария' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Получаем комментарий
    const comment = db.prepare('SELECT userId FROM comments WHERE id = ?').get(commentId);
    
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

    // Проверяем права на удаление (только автор или админ)
    if (comment.userId !== userId && userRole !== 'admin') {
      return NextResponse.json({ error: 'Нет прав на удаление' }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Удаляем комментарий и все дочерние комментарии
    db.prepare('DELETE FROM comments WHERE id = ? OR parentId = ?').run(commentId, commentId);

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Ошибка при удалении комментария:', error);
    return NextResponse.json({ error: 'Ошибка при удалении комментария' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

// Вспомогательная функция для построения дерева комментариев
function buildCommentTree(comments: CommentData[]): CommentData[] {
  // Создаем карту комментариев для быстрого поиска
  const commentMap = new Map<string, CommentData>();
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });
  
  // Строим дерево
  const rootComments: CommentData[] = [];
  
  comments.forEach(comment => {
    if (comment.parentId) {
      // Это ответ на комментарий
      const parentComment = commentMap.get(comment.parentId);
      if (parentComment) {
        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(comment);
      } else {
        // Если родительский комментарий не найден, добавляем как корневой
        rootComments.push(comment);
      }
    } else {
      // Это корневой комментарий
      rootComments.push(comment);
    }
  });
  
  return rootComments;
} 