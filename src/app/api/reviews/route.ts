import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';
import { verify } from 'jsonwebtoken';
import { usersAdapter } from '@/database/adapters';

// GET /api/reviews
export async function GET(request: NextRequest) {
  console.log('[API Reviews] Начало обработки запроса GET /api/reviews');
  
  try {
    const { searchParams } = new URL(request.url);
    const specialistId = searchParams.get('specialistId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const published = searchParams.has('published') ? (searchParams.get('published') === 'true' ? 1 : 0) : null;
    
    console.log('[API Reviews] Параметры запроса:', { 
      specialistId, 
      limit, 
      offset, 
      published: published !== null ? (published === 1 ? 'true' : 'false') : 'не указано' 
    });

    // Базовый запрос для получения отзывов
    let query = `
      SELECT 
        r.id, 
        r.specialistId, 
        r.userId, 
        r.serviceId, 
        r.serviceName, 
        r.appointmentId, 
        r.rating, 
        r.text, 
        r.isModerated,
        r.isPublished,
        r.createdAt, 
        r.updatedAt,
        s.firstName as specialistFirstName,
        s.lastName as specialistLastName,
        s.photo as specialistPhoto,
        COALESCE(u.firstName || ' ' || u.lastName, 'Пользователь') as userName,
        u.avatar as userAvatar
      FROM reviews r
      LEFT JOIN specialists s ON r.specialistId = s.id
      LEFT JOIN users u ON r.userId = u.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    // Добавляем условия фильтрации
    if (specialistId) {
      query += ` AND r.specialistId = ?`;
      queryParams.push(specialistId);
    }

    // Добавляем условие публикации, если указано
    if (searchParams.has('published')) {
      const published = searchParams.get('published') === 'true' ? 1 : 0;
      query += ` AND r.isPublished = ?`;
      queryParams.push(published);
    }

    // Добавляем сортировку и пагинацию
    query += ` ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    console.log('[API Reviews] Выполнение запроса к базе данных...');
    
    try {
      // Выполняем запрос
      const reviews = db.prepare(query).all(...queryParams);
      console.log(`[API Reviews] Получено ${reviews?.length || 0} отзывов`);

      // Для каждого отзыва получаем вложения и реакции
      const processedReviews = await Promise.all(reviews.map(async (review: any) => {
        // Получаем актуальные данные пользователя из адаптера
        let userData = {
          id: review.userId,
          firstName: review.userName ? review.userName.split(' ')[0] : '',
          lastName: review.userName ? review.userName.split(' ')[1] || '' : '',
          avatar: review.userAvatar,
          role: 'user'
        };

        // Если есть ID пользователя, получаем его актуальные данные
        if (review.userId) {
          try {
            const user = await usersAdapter.getById(review.userId);
            if (user) {
              userData = {
                id: user.id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                avatar: user.avatar,
                role: user.role
              };
              console.log(`[API Reviews] Получены актуальные данные пользователя ${user.id}: ${user.firstName} ${user.lastName}`);
            }
          } catch (error) {
            console.error(`[API Reviews] Ошибка при получении данных пользователя ${review.userId}:`, error);
          }
        }

        // Получаем вложения
        const attachments = db.prepare(`
          SELECT id, type, url, name, createdAt
          FROM review_attachments
          WHERE reviewId = ?
        `).all(review.id);

        // Получаем реакции
        const reactions = db.prepare(`
          SELECT id, userId, type, createdAt
          FROM review_reactions
          WHERE reviewId = ?
        `).all(review.id);

        // Получаем ответы
        const replies = db.prepare(`
          SELECT 
            rr.id, rr.userId, rr.text, rr.isModerated, rr.isPublished, 
            rr.createdAt, rr.updatedAt,
            COALESCE(u.firstName || ' ' || u.lastName, 'Пользователь') as userName, 
            u.avatar as userAvatar
          FROM review_replies rr
          LEFT JOIN users u ON rr.userId = u.id
          WHERE rr.reviewId = ?
          ORDER BY rr.createdAt ASC
        `).all(review.id);

        // Для каждого ответа получаем вложения и реакции
        const processedReplies = await Promise.all(replies.map(async (reply: any) => {
          // Получаем данные пользователя, оставившего ответ
          let replyUserData = {
            id: reply.userId,
            firstName: reply.userName ? reply.userName.split(' ')[0] : '',
            lastName: reply.userName ? reply.userName.split(' ')[1] || '' : '',
            avatar: reply.userAvatar,
            role: 'user'
          };

          // Если есть ID пользователя ответа, получаем его актуальные данные
          if (reply.userId) {
            try {
              const replyUser = await usersAdapter.getById(reply.userId);
              if (replyUser) {
                replyUserData = {
                  id: replyUser.id,
                  firstName: replyUser.firstName || '',
                  lastName: replyUser.lastName || '',
                  avatar: replyUser.avatar,
                  role: replyUser.role
                };
              }
            } catch (error) {
              console.error(`[API Reviews] Ошибка при получении данных пользователя ответа ${reply.userId}:`, error);
            }
          }

          // Получаем вложения для ответа
          const replyAttachments = db.prepare(`
            SELECT id, path, type
            FROM reply_attachments
            WHERE replyId = ?
          `).all(reply.id);

          // Получаем реакции для ответа
          const replyReactions = db.prepare(`
            SELECT id, userId, type, createdAt
            FROM reply_reactions
            WHERE replyId = ?
          `).all(reply.id);

          return {
            ...reply,
            attachments: replyAttachments,
            reactions: replyReactions,
            user: replyUserData
          };
        }));

        return {
          ...review,
          attachments,
          reactions,
          replies: processedReplies,
          user: userData
        };
      }));

      return NextResponse.json(processedReviews, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } catch (error) {
      console.error('Ошибка при получении отзывов:', error);
      return NextResponse.json({ error: 'Ошибка при получении отзывов' }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error);
    return NextResponse.json({ error: 'Ошибка при получении отзывов' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

// POST /api/reviews
export async function POST(request: NextRequest) {
  console.log('[API Reviews POST] Начало обработки запроса');
  
  try {
    // Получаем все возможные токены аутентификации
    const authToken = request.cookies.get('auth_token')?.value;
    const clientAuthToken = request.cookies.get('client_auth_token')?.value;
    const authHeader = request.headers.get('Authorization');
    
    console.log('[API Reviews POST] Проверка авторизации:', {
      hasAuthToken: !!authToken,
      hasClientAuthToken: !!clientAuthToken,
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? `${authHeader.substring(0, 15)}...` : 'отсутствует'
    });

    // Авторизация пользователя
    let userId = null;
    let user = null;

    // Проверяем все возможные источники токена
    const token = authToken || clientAuthToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (token) {
      try {
        // Декодируем токен
        const decoded = verify(token, process.env.JWT_SECRET || 'default_secret');
        console.log('[API Reviews POST] Токен декодирован:', { hasDecoded: !!decoded });
        
        // Проверяем структуру токена и получаем ID пользователя
        if ((decoded as any).id) {
          userId = (decoded as any).id;
          console.log('[API Reviews POST] Найден ID в корне токена:', userId);
        } else if ((decoded as any).user && (decoded as any).user.id) {
          userId = (decoded as any).user.id;
          console.log('[API Reviews POST] Найден ID в поле user.id:', userId);
        }
        
        if (userId) {
          // Получаем полные данные пользователя из БД
          user = await usersAdapter.getById(userId);
          
          if (user) {
            console.log('[API Reviews POST] Пользователь найден в БД:', {
              id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь'
            });
          } else {
            console.warn('[API Reviews POST] Пользователь с ID не найден в БД:', userId);
            userId = null;
          }
        }
      } catch (error) {
        console.error('[API Reviews POST] Ошибка при проверке токена:', error);
        userId = null;
      }
    }
    
    // Если пользователь не авторизован, возвращаем ошибку
    if (!userId || !user) {
      console.error('[API Reviews POST] Пользователь не авторизован');
      
      // Формируем ответ с заголовком о необходимости авторизации
      const response = NextResponse.json(
        { error: 'Для отправки отзыва необходимо авторизоваться' }, 
        { status: 401 }
      );
      
      // Добавляем нужные заголовки
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }

    const body = await request.json();
    const { specialistId, serviceId, appointmentId, rating, text, attachments } = body;
    console.log('[API Reviews POST] Данные запроса:', { specialistId, serviceId, rating });

    if (!specialistId || !rating) {
      return NextResponse.json({ error: 'Не указаны обязательные поля' }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Получаем информацию о сервисе, если указан serviceId
    let serviceName = null;
    if (serviceId) {
      const service = db.prepare('SELECT name FROM services WHERE id = ?').get(serviceId);
      if (service) {
        serviceName = service.name;
      }
    }

    // Формируем имя пользователя для отзыва
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь';
    console.log('[API Reviews POST] Информация о пользователе:', { userId, userName });

    const reviewId = uuidv4();
    const now = new Date().toISOString();

    // Создаем новый отзыв
    db.prepare(`
      INSERT INTO reviews (
        id, specialistId, userId, serviceId, serviceName, appointmentId, 
        rating, text, isModerated, isPublished, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId, specialistId, userId, serviceId, serviceName, appointmentId,
      rating, text, 1, 1, now, now
    );

    // Если есть вложения, добавляем их
    if (attachments && Array.isArray(attachments)) {
      const insertAttachment = db.prepare(`
        INSERT INTO review_attachments (id, reviewId, type, url, name, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      console.log('[API Reviews POST] Начинаем обработку вложений:', {
        attachmentsCount: attachments.length,
        reviewId: reviewId
      });

      for (const attachment of attachments) {
        try {
          const attachmentId = uuidv4();
          
          // Детальное логирование вложения
          console.log('[API Reviews POST] Данные вложения:', {
            attachmentId,
            reviewId,
            type: attachment.type,
            url: typeof attachment.url === 'string' ? 
                 (attachment.url.length > 100 ? 
                  attachment.url.substring(0, 50) + '...' + attachment.url.substring(attachment.url.length - 50) : 
                  attachment.url) : 'не строка',
            urlType: typeof attachment.url,
            urlLength: attachment.url ? attachment.url.toString().length : 0,
            name: attachment.name || 'Файл',
            isBase64: attachment.url && typeof attachment.url === 'string' && attachment.url.startsWith('data:')
          });

          // Проверяем и преобразуем все данные в строки
          const type = String(attachment.type || 'image');
          const url = String(attachment.url || '');
          const name = String(attachment.name || 'Файл');
          
          // Проверка на пустые значения
          if (!url) {
            console.warn('[API Reviews POST] Пропускаем вложение с пустым URL');
            continue;
          }

          // Выполняем вставку с явным приведением типов
          try {
            insertAttachment.run(
              String(attachmentId), 
              String(reviewId), 
              String(type), 
              String(url), 
              String(name), 
              String(now)
            );
            
            console.log('[API Reviews POST] Вложение успешно добавлено в БД:', {
              attachmentId,
              reviewId
            });
          } catch (insertError) {
            console.error('[API Reviews POST] Ошибка SQL при вставке вложения:', insertError);
            // Пробуем выполнить вставку с параметрами по одному для отладки
            try {
              const stmt = db.prepare(`
                INSERT INTO review_attachments (id, reviewId, type, url, name, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
              `);
              stmt.run(String(attachmentId));
              stmt.run(String(reviewId));
              stmt.run(String(type));
              stmt.run(String(url));
              stmt.run(String(name));
              stmt.run(String(now));
            } catch (detailedError) {
              console.error('[API Reviews POST] Детальная ошибка при вставке:', detailedError);
            }
          }
        } catch (error) {
          console.error('[API Reviews POST] Ошибка при обработке вложения:', error);
        }
      }
    } else {
      console.log('[API Reviews POST] Вложения отсутствуют или некорректны:', {
        hasAttachments: !!attachments,
        isArray: Array.isArray(attachments),
        attachmentsType: typeof attachments
      });
    }

    // Получаем созданный отзыв со всеми связанными данными
    const review = db.prepare(`
      SELECT 
        r.id, r.specialistId, r.userId, r.serviceId, r.serviceName, 
        r.appointmentId, r.rating, r.text, r.isModerated, r.isPublished,
        r.createdAt, r.updatedAt
      FROM reviews r
      WHERE r.id = ?
    `).get(reviewId);

    console.log('[API Reviews POST] Созданный отзыв:', {
      reviewId: review.id,
      text: review.text?.substring(0, 50),
      rating: review.rating,
      isPublished: review.isPublished
    });

    // Получаем вложения для отзыва
    const reviewAttachments = db.prepare(`
      SELECT id, type, url, name, createdAt
      FROM review_attachments
      WHERE reviewId = ?
    `).all(reviewId);
    
    console.log('[API Reviews POST] Загружены вложения для отзыва:', {
      reviewId,
      attachmentsCount: reviewAttachments.length,
      attachments: reviewAttachments.map(att => ({
        id: att.id,
        type: att.type,
        urlLength: att.url ? att.url.length : 0,
        urlStart: att.url ? att.url.substring(0, 30) + '...' : 'отсутствует'
      }))
    });

    // Формируем полный ответ с данными пользователя
    const responseData = {
      ...review,
      attachments: reviewAttachments,
      reactions: [],
      replies: [],
      user: {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar: user.avatar,
        role: user.role
      }
    };

    // Логируем данные пользователя для отладки
    console.log('[API Reviews POST] Данные пользователя в ответе:', {
      userId: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar ? 'Есть' : 'Отсутствует'
    });

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
    console.error('Ошибка при создании отзыва:', error);
    return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}