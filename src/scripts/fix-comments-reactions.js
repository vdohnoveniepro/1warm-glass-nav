// Скрипт для исправления проблемы с реакциями в комментариях
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');
const fs = require('fs');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../../src/database/vdohnovenie.db');
console.log(`Используется база данных: ${dbPath}`);

try {
  // Подключаемся к базе данных
  const db = new BetterSqlite3(dbPath);
  
  // Проверяем наличие необходимых полей в таблице комментариев
  console.log('1. Проверяем структуру таблицы comments...');
  const tableInfo = db.prepare(`PRAGMA table_info(comments)`).all();
  
  // Проверяем наличие необходимых полей
  const hasLikesField = tableInfo.some(col => col.name === 'likes');
  const hasDislikesField = tableInfo.some(col => col.name === 'dislikes');
  const hasLikedByField = tableInfo.some(col => col.name === 'likedBy');
  const hasDislikedByField = tableInfo.some(col => col.name === 'dislikedBy');
  
  // Исправляем структуру таблицы, если необходимо
  if (!hasLikesField || !hasDislikesField || !hasLikedByField || !hasDislikedByField) {
    console.log('Необходимо обновить структуру таблицы comments:');
    
    if (!hasLikesField) {
      console.log('Добавляем поле likes...');
      db.prepare(`ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0`).run();
    }
    
    if (!hasDislikesField) {
      console.log('Добавляем поле dislikes...');
      db.prepare(`ALTER TABLE comments ADD COLUMN dislikes INTEGER DEFAULT 0`).run();
    }
    
    if (!hasLikedByField) {
      console.log('Добавляем поле likedBy...');
      db.prepare(`ALTER TABLE comments ADD COLUMN likedBy TEXT DEFAULT '[]'`).run();
    }
    
    if (!hasDislikedByField) {
      console.log('Добавляем поле dislikedBy...');
      db.prepare(`ALTER TABLE comments ADD COLUMN dislikedBy TEXT DEFAULT '[]'`).run();
    }
    
    console.log('Структура таблицы comments успешно обновлена');
  } else {
    console.log('Структура таблицы comments в порядке');
  }
  
  // Исправляем значения полей likedBy и dislikedBy, если они NULL или некорректные
  console.log('\n2. Исправляем значения полей likedBy и dislikedBy...');
  
  // Исправляем NULL или пустые значения
  const updateNullValues = db.prepare(`
    UPDATE comments 
    SET likedBy = '[]' 
    WHERE likedBy IS NULL OR likedBy = ''
  `).run();
  
  console.log(`Исправлено ${updateNullValues.changes} записей с NULL или пустыми значениями в поле likedBy`);
  
  const updateNullDislikedValues = db.prepare(`
    UPDATE comments 
    SET dislikedBy = '[]' 
    WHERE dislikedBy IS NULL OR dislikedBy = ''
  `).run();
  
  console.log(`Исправлено ${updateNullDislikedValues.changes} записей с NULL или пустыми значениями в поле dislikedBy`);
  
  // Проверяем и исправляем некорректный JSON
  console.log('\n3. Проверяем и исправляем некорректный JSON в полях likedBy и dislikedBy...');
  
  const comments = db.prepare(`SELECT id, likedBy, dislikedBy FROM comments`).all();
  let fixedCount = 0;
  
  for (const comment of comments) {
    let needsUpdate = false;
    let likedBy = comment.likedBy;
    let dislikedBy = comment.dislikedBy;
    
    // Проверяем и исправляем поле likedBy
    try {
      JSON.parse(likedBy);
    } catch (e) {
      likedBy = '[]';
      needsUpdate = true;
    }
    
    // Проверяем и исправляем поле dislikedBy
    try {
      JSON.parse(dislikedBy);
    } catch (e) {
      dislikedBy = '[]';
      needsUpdate = true;
    }
    
    // Обновляем запись, если необходимо
    if (needsUpdate) {
      db.prepare(`
        UPDATE comments 
        SET likedBy = ?, dislikedBy = ? 
        WHERE id = ?
      `).run(likedBy, dislikedBy, comment.id);
      
      fixedCount++;
    }
  }
  
  console.log(`Исправлено ${fixedCount} комментариев с некорректным JSON`);
  
  // Создаем или исправляем API маршрут для реакций
  console.log('\n4. Создаем или исправляем API маршрут для реакций...');
  
  // Путь к файлу маршрута API
  const apiDirPath = path.join(__dirname, '../../src/app/api/comments/[id]/reaction');
  const apiRoutePath = path.join(apiDirPath, 'route.ts');
  
  // Проверяем существование директории и создаем ее при необходимости
  if (!fs.existsSync(apiDirPath)) {
    console.log(`Создаем директорию: ${apiDirPath}`);
    fs.mkdirSync(apiDirPath, { recursive: true });
  }
  
  // Содержимое файла маршрута API
  const apiRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Comment } from '@/components/Comments/CommentSection';
import { commentsAdapter } from '@/database/adapters/comments';

// Параметры запроса
interface ReactionParams {
  params: {
    id: string;
  };
}

// POST /api/comments/[id]/reaction - Добавить или убрать реакцию (лайк/дизлайк)
export async function POST(request: NextRequest, { params }: ReactionParams) {
  try {
    console.log(\`[API Reaction] Получен запрос на обновление реакции для комментария \${params.id}\`);
    
    // Проверка авторизации
    const user = await getCurrentUser();
    if (!user) {
      console.error('[API Reaction] Отказано в доступе: пользователь не авторизован');
      return NextResponse.json(
        { success: false, message: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    const { isLike } = body;
    
    console.log(\`[API Reaction] Пользователь: \${user.id}, Тип реакции: \${isLike ? 'лайк' : 'дизлайк'}\`);
    
    if (isLike === undefined) {
      console.error('[API Reaction] Не указан тип реакции');
      return NextResponse.json(
        { success: false, message: 'Не указан тип реакции' },
        { status: 400 }
      );
    }
    
    // Получаем комментарий из базы данных
    let comments;
    
    // Сначала пробуем через адаптер
    if (commentsAdapter && typeof commentsAdapter.find === 'function') {
      try {
        console.log('[API Reaction] Используем commentsAdapter.find');
        comments = await commentsAdapter.find({ id });
      } catch (adapterError) {
        console.error('[API Reaction] Ошибка при использовании адаптера:', adapterError);
        comments = [];
      }
    }
    
    // Если адаптер не сработал, используем прямой запрос к базе данных
    if (!comments || comments.length === 0) {
      try {
        console.log('[API Reaction] Используем прямой запрос к базе данных');
        
        // Проверяем существование таблицы comments
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'").get();
        
        if (tableExists) {
          const stmt = db.prepare('SELECT * FROM comments WHERE id = ?');
          const rows = stmt.all(id);
          
          if (rows && rows.length > 0) {
            comments = rows.map((row: any) => ({
              ...row,
              likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
              dislikedBy: row.dislikedBy ? JSON.parse(row.dislikedBy) : []
            }));
          } else {
            console.error(\`[API Reaction] Комментарий с ID \${id} не найден через SQL запрос\`);
          }
        } else {
          console.error('[API Reaction] Таблица comments не существует');
        }
      } catch (sqlError) {
        console.error('[API Reaction] Ошибка при выполнении SQL запроса:', sqlError);
      }
    }
    
    if (!comments || comments.length === 0) {
      console.error(\`[API Reaction] Комментарий с ID \${id} не найден\`);
      return NextResponse.json(
        { success: false, message: 'Комментарий не найден' },
        { status: 404 }
      );
    }
    
    const comment = comments[0] as Comment;
    console.log(\`[API Reaction] Найден комментарий: \${comment.id}\`);
    
    // Проверяем, реагировал ли пользователь на этот комментарий ранее
    const hasLiked = comment.likedBy?.includes(user.id) || false;
    const hasDisliked = comment.dislikedBy?.includes(user.id) || false;
    
    console.log(\`[API Reaction] Текущие реакции: лайки=\${comment.likes}, дизлайки=\${comment.dislikes}, hasLiked=\${hasLiked}, hasDisliked=\${hasDisliked}\`);
    
    // Обеспечиваем, что массивы likedBy и dislikedBy существуют
    if (!comment.likedBy) comment.likedBy = [];
    if (!comment.dislikedBy) comment.dislikedBy = [];
    
    // Создаем копию комментария для обновления
    let updatedComment = { ...comment };
    
    // Явно исключаем поле replies при обновлении, чтобы не перезаписать его на уровне API
    delete updatedComment.replies;
    
    // Обрабатываем лайк
    if (isLike) {
      if (hasLiked) {
        // Если уже лайкнул, убираем лайк
        updatedComment.likes = Math.max(0, comment.likes - 1);
        updatedComment.likedBy = comment.likedBy.filter(id => id !== user.id);
        console.log('[API Reaction] Убираем лайк');
      } else {
        // Добавляем лайк
        updatedComment.likes = (comment.likes || 0) + 1;
        updatedComment.likedBy = [...comment.likedBy, user.id];
        console.log('[API Reaction] Добавляем лайк');
        
        // Если был дизлайк, убираем его
        if (hasDisliked) {
          updatedComment.dislikes = Math.max(0, comment.dislikes - 1);
          updatedComment.dislikedBy = comment.dislikedBy.filter(id => id !== user.id);
          console.log('[API Reaction] Убираем ранее поставленный дизлайк');
        }
      }
    } 
    // Обрабатываем дизлайк
    else {
      if (hasDisliked) {
        // Если уже дизлайкнул, убираем дизлайк
        updatedComment.dislikes = Math.max(0, comment.dislikes - 1);
        updatedComment.dislikedBy = comment.dislikedBy.filter(id => id !== user.id);
        console.log('[API Reaction] Убираем дизлайк');
      } else {
        // Добавляем дизлайк
        updatedComment.dislikes = (comment.dislikes || 0) + 1;
        updatedComment.dislikedBy = [...comment.dislikedBy, user.id];
        console.log('[API Reaction] Добавляем дизлайк');
        
        // Если был лайк, убираем его
        if (hasLiked) {
          updatedComment.likes = Math.max(0, comment.likes - 1);
          updatedComment.likedBy = comment.likedBy.filter(id => id !== user.id);
          console.log('[API Reaction] Убираем ранее поставленный лайк');
        }
      }
    }
    
    // Обновляем комментарий в базе данных
    try {
      if (commentsAdapter && typeof commentsAdapter.update === 'function') {
        console.log('[API Reaction] Обновляем комментарий через адаптер');
        await commentsAdapter.update(id, updatedComment);
        console.log('[API Reaction] Комментарий успешно обновлен через адаптер');
      } else {
        console.log('[API Reaction] Обновляем комментарий через прямой SQL запрос');
        
        // Преобразуем массивы в JSON для хранения
        const likedByJson = JSON.stringify(updatedComment.likedBy);
        const dislikedByJson = JSON.stringify(updatedComment.dislikedBy);
        
        const updateStmt = db.prepare(\`
          UPDATE comments 
          SET likes = ?, dislikes = ?, likedBy = ?, dislikedBy = ?, updatedAt = ? 
          WHERE id = ?
        \`);
        
        const result = updateStmt.run(
          updatedComment.likes,
          updatedComment.dislikes,
          likedByJson,
          dislikedByJson,
          new Date().toISOString(),
          id
        );
        
        if (result.changes > 0) {
          console.log('[API Reaction] Комментарий успешно обновлен через SQL запрос');
        } else {
          console.error('[API Reaction] Не удалось обновить комментарий через SQL запрос');
          throw new Error('Не удалось обновить комментарий через SQL запрос');
        }
      }
      
      console.log(\`[API Reaction] Результат: лайки=\${updatedComment.likes}, дизлайки=\${updatedComment.dislikes}\`);
      return NextResponse.json({ success: true, data: updatedComment });
    } catch (updateError) {
      console.error('[API Reaction] Ошибка при обновлении комментария:', updateError);
      return NextResponse.json(
        { success: false, message: 'Ошибка при обновлении комментария' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API Reaction] Необработанная ошибка:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}`;
  
  // Записываем файл маршрута API
  fs.writeFileSync(apiRoutePath, apiRouteContent);
  console.log(`API маршрут для реакций создан/обновлен: ${apiRoutePath}`);
  
  // Закрываем соединение с базой данных
  db.close();
  console.log('\nИсправление завершено. База данных закрыта.');
  
} catch (error) {
  console.error('Ошибка при выполнении скрипта:', error);
  process.exit(1);
} 