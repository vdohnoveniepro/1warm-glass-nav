import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database';

// Функция для удаления ответа на отзыв
function deleteReply(id: string): boolean {
  try {
    // Удаляем все связанные данные (вложения, реакции)
    db.prepare(`DELETE FROM reply_attachments WHERE replyId = ?`).run(id);
    db.prepare(`DELETE FROM reply_reactions WHERE replyId = ?`).run(id);
    
    // Удаляем сам ответ
    const result = db.prepare(`DELETE FROM review_replies WHERE id = ?`).run(id);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка при удалении ответа из базы данных:', error);
    return false;
  }
}

// Обработчик DELETE запроса для удаления ответа по ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ответа обязателен' },
        { status: 400 }
      );
    }
    
    // Получаем информацию об ответе перед удалением, чтобы вернуть ID отзыва
    const replyInfo = db.prepare(`
      SELECT reviewId FROM review_replies WHERE id = ?
    `).get(id) as { reviewId: string } | undefined;
    
    if (!replyInfo) {
      return NextResponse.json(
        { error: 'Ответ не найден' },
        { status: 404 }
      );
    }
    
    const reviewId = replyInfo.reviewId;
    
    // Удаляем ответ
    const success = deleteReply(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Ответ не найден или не удалось удалить' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ответ успешно удален',
      reviewId: reviewId
    });
  } catch (error) {
    console.error('Ошибка при обработке DELETE запроса:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при удалении ответа' },
      { status: 500 }
    );
  }
}

// Обработчик PATCH запроса для обновления ответа
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ответа обязателен' },
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
    
    // Проверяем существование ответа
    const replyExists = db.prepare(`
      SELECT id FROM review_replies WHERE id = ?
    `).get(id);
    
    if (!replyExists) {
      return NextResponse.json(
        { error: 'Ответ не найден' },
        { status: 404 }
      );
    }
    
    // Обновляем поля ответа
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    
    if (data.isModerated !== undefined) {
      updateFields.push('isModerated = ?');
      queryParams.push(data.isModerated ? 1 : 0);
    }
    
    if (data.isPublished !== undefined) {
      updateFields.push('isPublished = ?');
      queryParams.push(data.isPublished ? 1 : 0);
    }
    
    if (data.text !== undefined) {
      updateFields.push('text = ?');
      queryParams.push(data.text);
    }
    
    // Добавляем дату обновления
    updateFields.push('updatedAt = ?');
    queryParams.push(new Date().toISOString());
    
    // Добавляем ID в конец массива параметров
    queryParams.push(id);
    
    // Выполняем обновление
    const result = db.prepare(`
      UPDATE review_replies
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...queryParams);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Не удалось обновить ответ' },
        { status: 500 }
      );
    }
    
    // Получаем обновленный ответ
    const updatedReply = db.prepare(`
      SELECT rr.*, 
             u.firstName as userFirstName, 
             u.lastName as userLastName, 
             u.avatar as userAvatar,
             u.role as userRole
      FROM review_replies rr
      LEFT JOIN users u ON rr.userId = u.id
      WHERE rr.id = ?
    `).get(id) as {
      id: string;
      reviewId: string;
      parentReplyId: string | null;
      userId: string;
      userFirstName: string | null;
      userLastName: string | null;
      userAvatar: string | null;
      userRole: string | null;
      text: string;
      isModerated: number;
      isPublished: number;
      createdAt: string;
      updatedAt: string;
    };
    
    // Преобразуем в формат ответа
    const formattedReply = {
      id: updatedReply.id,
      reviewId: updatedReply.reviewId,
      parentReplyId: updatedReply.parentReplyId,
      userId: updatedReply.userId,
      user: {
        id: updatedReply.userId,
        firstName: updatedReply.userFirstName || 'Пользователь',
        lastName: updatedReply.userLastName || '',
        avatar: updatedReply.userAvatar || '/images/default-avatar.png',
        role: updatedReply.userRole
      },
      text: updatedReply.text,
      attachments: [], // TODO: добавить загрузку вложений для ответов
      reactions: [], // TODO: добавить загрузку реакций для ответов
      isModerated: updatedReply.isModerated === 1,
      isPublished: updatedReply.isPublished === 1,
      createdAt: updatedReply.createdAt,
      updatedAt: updatedReply.updatedAt
    };
    
    return NextResponse.json(formattedReply);
  } catch (error) {
    console.error('Ошибка при обработке PATCH запроса:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обновлении ответа' },
      { status: 500 }
    );
  }
} 