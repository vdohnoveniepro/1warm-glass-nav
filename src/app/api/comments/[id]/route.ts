import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { verify } from 'jsonwebtoken';

// Интерфейс для комментария
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
  likedBy: string;
  dislikedBy: string;
  photo?: string;
}

// Параметры запроса
interface CommentParams {
  params: {
    id: string;
  };
}

// GET /api/comments/[id] - Получить комментарий по ID
export async function GET(request: NextRequest, { params }: CommentParams) {
  try {
    const { id } = params;
    
    const comments = await db.comments.find({ id });
    
    if (!comments || comments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Комментарий не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: comments[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Ошибка при получении комментария:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT /api/comments/:id
export async function PUT(
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
      userId = (decoded as any).id;
    } catch (error) {
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
    const { content } = body;
    
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Содержание комментария не может быть пустым' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
    
    // Получаем комментарий для проверки прав доступа
    const comment = db.prepare(`
      SELECT * FROM comments WHERE id = ?
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
    
    // Проверяем права доступа (только владелец может редактировать)
    if (comment.userId !== userId) {
      return NextResponse.json({ error: 'Нет прав для редактирования' }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
    
    // Обновляем комментарий
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE comments
      SET content = ?, updatedAt = ?
      WHERE id = ?
    `).run(content, now, commentId);
    
    // Получаем обновленный комментарий
    const updatedComment = db.prepare(`
      SELECT * FROM comments WHERE id = ?
    `).get(commentId);
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedComment,
        likedBy: updatedComment.likedBy ? JSON.parse(updatedComment.likedBy) : [],
        dislikedBy: updatedComment.dislikedBy ? JSON.parse(updatedComment.dislikedBy) : []
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении комментария:', error);
    return NextResponse.json({ error: 'Ошибка при обновлении комментария' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

// DELETE /api/comments/:id
export async function DELETE(
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
    let userRole;
    try {
      const decoded = verify(authToken, process.env.JWT_SECRET || 'default_secret');
      userId = (decoded as any).id;
      userRole = (decoded as any).role;
    } catch (error) {
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
    
    // Получаем комментарий для проверки прав доступа
    const comment = db.prepare(`
      SELECT userId FROM comments WHERE id = ?
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
    
    // Проверяем права доступа (владелец или админ)
    const isOwner = comment.userId === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Нет прав для удаления' }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
    
    // Удаляем комментарий
    db.prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
    
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