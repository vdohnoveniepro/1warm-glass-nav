import fs from 'fs';
import path from 'path';
import { db } from './db';
import { initializeDatabase } from './schema';

// Пути к JSON файлам
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

// Отладочная информация
let debugInfo: any = {};

// Инициализация базы данных
export const migrateData = async () => {
  console.log('Начинаем миграцию данных...');
  debugInfo = { steps: [] };
  
  // Инициализация структуры базы данных
  try {
    debugInfo.steps.push('Инициализация базы данных');
    initializeDatabase();
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    debugInfo.initError = `${error}`;
    return false;
  }
  
  try {
    // Миграция начинается с базовых данных, затем переходим к зависимым
    try {
      debugInfo.steps.push('Миграция пользователей');
      await migrateUsers();
    } catch (error) {
      console.error('Ошибка при миграции пользователей:', error);
      debugInfo.usersError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция специалистов');
      await migrateSpecialists();
    } catch (error) {
      console.error('Ошибка при миграции специалистов:', error);
      debugInfo.specialistsError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция услуг');
      await migrateServices();
    } catch (error) {
      console.error('Ошибка при миграции услуг:', error);
      debugInfo.servicesError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция связей');
      await migrateSpecialistServices();
    } catch (error) {
      console.error('Ошибка при миграции связей специалистов и услуг:', error);
      debugInfo.servicesLinksError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция статей');
      await migrateArticles();
    } catch (error) {
      console.error('Ошибка при миграции статей:', error);
      debugInfo.articlesError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция отзывов');
      await migrateReviews();
    } catch (error) {
      console.error('Ошибка при миграции отзывов:', error);
      debugInfo.reviewsError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция записей');
      await migrateAppointments();
    } catch (error) {
      console.error('Ошибка при миграции записей на прием:', error);
      debugInfo.appointmentsError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция событий');
      await migrateEvents();
    } catch (error) {
      console.error('Ошибка при миграции событий:', error);
      debugInfo.eventsError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция настроек');
      await migrateSettings();
    } catch (error) {
      console.error('Ошибка при миграции настроек:', error);
      debugInfo.settingsError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция FAQ');
      await migrateFAQ();
    } catch (error) {
      console.error('Ошибка при миграции FAQ:', error);
      debugInfo.faqError = `${error}`;
      return false;
    }
    
    try {
      debugInfo.steps.push('Миграция промокодов');
      await migratePromos();
    } catch (error) {
      console.error('Ошибка при миграции промокодов:', error);
      debugInfo.promosError = `${error}`;
      return false;
    }
    
    console.log('Миграция данных успешно завершена!');
    debugInfo.steps.push('Успешное завершение');
    debugInfo.success = true;
    return true;
  } catch (error) {
    console.error('Ошибка при миграции данных:', error);
    debugInfo.error = `${error}`;
    return false;
  }
};

// Экспортируем отладочную информацию
export const getDebugInfo = () => {
  return debugInfo;
};

// Функция для чтения JSON файла
const readJsonFile = (filePath: string): any[] => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Файл не найден: ${filePath}`);
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return [];
  }
};

// Миграция пользователей
const migrateUsers = async () => {
  console.log('Миграция пользователей...');
  
  const usersFilePath = path.join(DATA_DIR, 'users', 'users.json');
  const users = readJsonFile(usersFilePath);
  
  if (users.length === 0) {
    console.log('Нет пользователей для миграции.');
    return;
  }
  
  // Исследуем структуру избранного
  let usersWithFavorites = 0;
  for (const user of users) {
    if (user.favorites) {
      usersWithFavorites++;
      console.log(`Пользователь ${user.id} имеет избранное:`, {
        articles: user.favorites.articles?.length || 0,
        services: user.favorites.services?.length || 0,
        specialists: user.favorites.specialists?.length || 0
      });
    }
  }
  console.log(`Найдено ${usersWithFavorites} пользователей с избранным`);
  
  // Подготавливаем данные пользователей для SQLite
  const preparedUsers = users.map(user => {
    // Преобразуем избранное в JSON строку для сохранения в SQLite
    const hasUserSerialization = 'toJSON' in user;
    
    // Копируем пользователя для безопасного изменения
    const preparedUser = {...user};
    
    // Проверяем и подготавливаем избранное
    if (!preparedUser.favorites) {
      preparedUser.favorites = { articles: [], services: [], specialists: [] };
    } else {
      // Убеждаемся, что все массивы существуют
      if (!preparedUser.favorites.articles) preparedUser.favorites.articles = [];
      if (!preparedUser.favorites.services) preparedUser.favorites.services = [];
      if (!preparedUser.favorites.specialists) preparedUser.favorites.specialists = [];
    }
    
    return preparedUser;
  });
  
  // Обновляем схему таблицы пользователей, добавляя колонку favorites, если ее нет
  try {
    // Проверяем, есть ли колонка favorites
    const columnsInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasFavoritesColumn = columnsInfo.some((column: any) => column.name === 'favorites');
    
    if (!hasFavoritesColumn) {
      console.log('Добавляем колонку favorites в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN favorites TEXT").run();
    }
    
    // Проверяем, есть ли колонка roles
    const hasRolesColumn = columnsInfo.some((column: any) => column.name === 'roles');
    
    if (!hasRolesColumn) {
      console.log('Добавляем колонку roles в таблицу users');
      db.prepare("ALTER TABLE users ADD COLUMN roles TEXT").run();
      
      // Инициализируем roles на основе основной роли для всех пользователей
      console.log('Инициализируем колонку roles для всех пользователей');
      
      // Получаем всех пользователей
      const allUsers = db.prepare('SELECT id, role FROM users').all();
      
      // Для каждого пользователя создаем массив ролей на основе основной роли
      for (const user of allUsers) {
        const roleArray = [user.role.toLowerCase()];
        const rolesJson = JSON.stringify(roleArray);
        
        // Обновляем поле roles
        db.prepare('UPDATE users SET roles = ? WHERE id = ?').run(rolesJson, user.id);
      }
      
      console.log(`Инициализированы roles для ${allUsers.length} пользователей`);
    }
  } catch (error) {
    console.error('Ошибка при обновлении схемы таблицы users:', error);
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, password, firstName, lastName, 
      phone, avatar, role, favorites, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const user of items) {
      const favoritesJson = user.favorites ? JSON.stringify(user.favorites) : null;
      
      stmt.run(
        user.id,
        user.email || null,
        user.password || null,
        user.firstName || null,
        user.lastName || null,
        user.phone || null,
        user.avatar || null,
        user.role || 'client',
        favoritesJson,
        user.createdAt || new Date().toISOString(),
        user.updatedAt || new Date().toISOString()
      );
    }
  });
  
  insertMany(preparedUsers);
  console.log(`Мигрировано ${preparedUsers.length} пользователей (с избранным: ${usersWithFavorites}).`);
};

// Миграция специалистов
const migrateSpecialists = async () => {
  console.log('Миграция специалистов...');
  
  // Сначала получаем список всех существующих ID пользователей
  const existingUserIds = db.prepare('SELECT id FROM users').all().map((row: any) => row.id);
  const userIdsSet = new Set(existingUserIds);
  
  debugInfo.existingUserIds = existingUserIds;
  
  const specialistsFilePath = path.join(DATA_DIR, 'specialists', 'specialists.json');
  const specialists = readJsonFile(specialistsFilePath);
  
  if (specialists.length === 0) {
    console.log('Нет специалистов для миграции.');
    return;
  }
  
  const specialistsStmt = db.prepare(`
    INSERT OR REPLACE INTO specialists (
      id, firstName, lastName, photo, description, 
      position, experience, "order", userId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const positionsStmt = db.prepare(`
    INSERT INTO specialist_positions (specialistId, position)
    VALUES (?, ?)
  `);
  
  const workScheduleStmt = db.prepare(`
    INSERT INTO specialist_work_schedules (id, specialistId, enabled, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const workDayStmt = db.prepare(`
    INSERT INTO work_days (id, scheduleId, day, active, startTime, endTime)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const lunchBreakStmt = db.prepare(`
    INSERT INTO lunch_breaks (id, workDayId, enabled, startTime, endTime)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const vacationStmt = db.prepare(`
    INSERT INTO vacations (id, scheduleId, enabled, startDate, endDate)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const documentsStmt = db.prepare(`
    INSERT INTO specialist_documents (specialistId, path, name, type)
    VALUES (?, ?, ?, ?)
  `);
  
  // Используем транзакцию для вставки данных
  const insertMany = db.transaction((items) => {
    for (const specialist of items) {
      // Проверяем, существует ли пользователь, на которого ссылается специалист
      const userId = specialist.userId || null;
      
      // Если userId не null и такого пользователя нет, устанавливаем userId в null
      const actualUserId = (userId && !userIdsSet.has(userId)) ? null : userId;
      
      if (userId && !userIdsSet.has(userId)) {
        console.warn(`Пользователь с ID ${userId} не найден для специалиста ${specialist.id}. Связь будет удалена.`);
        debugInfo.invalidUserIds = debugInfo.invalidUserIds || [];
        debugInfo.invalidUserIds.push(userId);
      }
      
      // Вставляем основные данные специалиста
      specialistsStmt.run(
        specialist.id,
        specialist.firstName,
        specialist.lastName,
        specialist.photo || null,
        specialist.description || null,
        specialist.position || null,
        specialist.experience || 0,
        specialist.order || 0,
        actualUserId,
        specialist.createdAt || new Date().toISOString(),
        specialist.updatedAt || new Date().toISOString()
      );
      
      // Вставляем дополнительные должности
      if (specialist.additionalPositions && Array.isArray(specialist.additionalPositions)) {
        for (const position of specialist.additionalPositions) {
          positionsStmt.run(specialist.id, position);
        }
      }
      
      // Вставляем документы
      if (specialist.documents && Array.isArray(specialist.documents)) {
        for (const doc of specialist.documents) {
          // Проверяем, существует ли путь к документу
          const path = doc.path || doc.file || null;
          
          if (!path) {
            console.warn(`Документ без пути для специалиста ${specialist.id} будет пропущен.`);
            debugInfo.invalidDocuments = debugInfo.invalidDocuments || [];
            debugInfo.invalidDocuments.push({specialistId: specialist.id, doc});
            continue;
          }
          
          documentsStmt.run(specialist.id, path, doc.name || null, doc.type || null);
        }
      }
      
      // Вставляем рабочее расписание
      if (specialist.workSchedule) {
        const scheduleId = `schedule_${specialist.id}`;
        workScheduleStmt.run(
          scheduleId,
          specialist.id,
          specialist.workSchedule.enabled ? 1 : 0,
          specialist.createdAt || new Date().toISOString(),
          specialist.updatedAt || new Date().toISOString()
        );
        
        // Вставляем рабочие дни
        if (specialist.workSchedule.workDays && Array.isArray(specialist.workSchedule.workDays)) {
          for (const workDay of specialist.workSchedule.workDays) {
            const workDayId = workDay.id || `workday_${specialist.id}_${workDay.day}`;
            workDayStmt.run(
              workDayId,
              scheduleId,
              workDay.day,
              workDay.active ? 1 : 0,
              workDay.startTime,
              workDay.endTime
            );
            
            // Вставляем перерывы на обед
            if (workDay.lunchBreaks && Array.isArray(workDay.lunchBreaks)) {
              for (const lunchBreak of workDay.lunchBreaks) {
                lunchBreakStmt.run(
                  lunchBreak.id || `lunchbreak_${workDayId}_${lunchBreak.startTime}`,
                  workDayId,
                  lunchBreak.enabled ? 1 : 0,
                  lunchBreak.startTime,
                  lunchBreak.endTime
                );
              }
            }
          }
        }
        
        // Вставляем отпуска
        if (specialist.workSchedule.vacations && Array.isArray(specialist.workSchedule.vacations)) {
          for (const vacation of specialist.workSchedule.vacations) {
            vacationStmt.run(
              vacation.id || `vacation_${specialist.id}_${vacation.startDate}`,
              scheduleId,
              vacation.enabled ? 1 : 0,
              vacation.startDate,
              vacation.endDate
            );
          }
        }
      }
    }
  });
  
  insertMany(specialists);
  console.log(`Мигрировано ${specialists.length} специалистов.`);
};

// Миграция услуг
const migrateServices = async () => {
  console.log('Миграция услуг...');
  
  const servicesFilePath = path.join(DATA_DIR, 'services', 'services.json');
  const services = readJsonFile(servicesFilePath);
  
  if (services.length === 0) {
    console.log('Нет услуг для миграции.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO services (
      id, name, description, shortDescription, image, 
      price, duration, color, "order", isArchived, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const service of items) {
      stmt.run(
        service.id,
        service.name,
        service.description || null,
        service.shortDescription || null,
        service.image || null,
        service.price || 0,
        service.duration || 60,
        service.color || null,
        service.order || 0,
        service.isArchived ? 1 : 0,
        service.createdAt || new Date().toISOString(),
        service.updatedAt || new Date().toISOString()
      );
    }
  });
  
  insertMany(services);
  console.log(`Мигрировано ${services.length} услуг.`);
};

// Миграция связей специалистов и услуг
const migrateSpecialistServices = async () => {
  console.log('Миграция связей специалистов и услуг...');
  
  // Получаем список существующих специалистов и услуг
  const existingSpecialistIds = db.prepare('SELECT id FROM specialists').all().map((row: any) => row.id);
  const existingServiceIds = db.prepare('SELECT id FROM services').all().map((row: any) => row.id);
  
  const specialistIdsSet = new Set(existingSpecialistIds);
  const serviceIdsSet = new Set(existingServiceIds);
  
  debugInfo.existingSpecialistIds = existingSpecialistIds;
  debugInfo.existingServiceIds = existingServiceIds;
  
  const specialistsFilePath = path.join(DATA_DIR, 'specialists', 'specialists.json');
  const specialists = readJsonFile(specialistsFilePath);
  
  if (specialists.length === 0) {
    console.log('Нет специалистов для миграции связей.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO specialist_services (specialistId, serviceId)
    VALUES (?, ?)
  `);
  
  let totalLinks = 0;
  let skippedLinks = 0;
  
  const insertMany = db.transaction((items) => {
    for (const specialist of items) {
      // Проверяем, существует ли специалист
      if (!specialistIdsSet.has(specialist.id)) {
        console.warn(`Специалист с ID ${specialist.id} не найден. Связи будут пропущены.`);
        debugInfo.invalidSpecialistLinks = debugInfo.invalidSpecialistLinks || [];
        debugInfo.invalidSpecialistLinks.push(specialist.id);
        continue;
      }
      
      // Проверяем поле selectedServices
      if (specialist.selectedServices && Array.isArray(specialist.selectedServices)) {
        for (const serviceId of specialist.selectedServices) {
          // Проверяем, существует ли услуга
          if (!serviceIdsSet.has(serviceId)) {
            console.warn(`Услуга с ID ${serviceId} не найдена для специалиста ${specialist.id}. Связь будет пропущена.`);
            debugInfo.invalidServiceLinks = debugInfo.invalidServiceLinks || [];
            debugInfo.invalidServiceLinks.push({specialistId: specialist.id, serviceId});
            skippedLinks++;
            continue;
          }
          
          stmt.run(specialist.id, serviceId);
          totalLinks++;
        }
      }
      
      // Проверяем также поле services, если оно есть и содержит id
      if (specialist.services && Array.isArray(specialist.services)) {
        for (const service of specialist.services) {
          if (service.id) {
            // Проверяем, существует ли услуга
            if (!serviceIdsSet.has(service.id)) {
              console.warn(`Услуга с ID ${service.id} не найдена для специалиста ${specialist.id}. Связь будет пропущена.`);
              debugInfo.invalidServiceLinks = debugInfo.invalidServiceLinks || [];
              debugInfo.invalidServiceLinks.push({specialistId: specialist.id, serviceId: service.id});
              skippedLinks++;
              continue;
            }
            
            stmt.run(specialist.id, service.id);
            totalLinks++;
          }
        }
      }
    }
  });
  
  insertMany(specialists);
  console.log(`Мигрировано ${totalLinks} связей специалистов и услуг. Пропущено ${skippedLinks} недействительных связей.`);
  debugInfo.totalServiceLinks = totalLinks;
  debugInfo.skippedServiceLinks = skippedLinks;
};

// Миграция статей
const migrateArticles = async () => {
  console.log('Миграция статей...');
  
  const articlesFilePath = path.join(DATA_DIR, 'articles', 'articles.json');
  const articles = readJsonFile(articlesFilePath);
  
  if (articles.length === 0) {
    console.log('Нет статей для миграции.');
    return;
  }
  
  const articlesStmt = db.prepare(`
    INSERT OR REPLACE INTO articles (
      id, title, slug, banner, content, excerpt, 
      category, specialistId, status, views, 
      createdAt, updatedAt, publishedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const tagsStmt = db.prepare(`
    INSERT OR REPLACE INTO article_tags (articleId, tag)
    VALUES (?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const article of items) {
      articlesStmt.run(
        article.id,
        article.title,
        article.slug || null,
        article.banner || null,
        article.content || null,
        article.excerpt || null,
        article.category || null,
        article.specialistId || null,
        article.status || 'draft',
        article.views || 0,
        article.createdAt || new Date().toISOString(),
        article.updatedAt || new Date().toISOString(),
        article.publishedAt || null
      );
      
      // Вставляем теги статьи
      if (article.tags && Array.isArray(article.tags)) {
        for (const tag of article.tags) {
          tagsStmt.run(article.id, tag);
        }
      }
    }
  });
  
  insertMany(articles);
  console.log(`Мигрировано ${articles.length} статей.`);
};

// Миграция отзывов
const migrateReviews = async () => {
  console.log('Миграция отзывов...');
  
  // Получаем списки существующих ID пользователей и специалистов
  const existingUserIds = db.prepare('SELECT id FROM users').all().map((row: any) => row.id);
  const existingSpecialistIds = db.prepare('SELECT id FROM specialists').all().map((row: any) => row.id);
  
  const userIdsSet = new Set(existingUserIds);
  const specialistIdsSet = new Set(existingSpecialistIds);
  
  const reviewsFilePath = path.join(DATA_DIR, 'reviews.json');
  const reviews = readJsonFile(reviewsFilePath);
  
  if (reviews.length === 0) {
    console.log('Нет отзывов для миграции.');
    return;
  }
  
  const reviewsStmt = db.prepare(`
    INSERT OR REPLACE INTO reviews (
      id, specialistId, userId, rating, text, 
      isModerated, isPublished, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const attachmentsStmt = db.prepare(`
    INSERT INTO review_attachments (reviewId, path, type)
    VALUES (?, ?, ?)
  `);
  
  const reactionsStmt = db.prepare(`
    INSERT OR REPLACE INTO review_reactions (
      id, reviewId, userId, type, createdAt
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  const repliesStmt = db.prepare(`
    INSERT OR REPLACE INTO review_replies (
      id, reviewId, userId, text, isModerated, 
      isPublished, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const replyAttachmentsStmt = db.prepare(`
    INSERT INTO reply_attachments (replyId, path, type)
    VALUES (?, ?, ?)
  `);
  
  const replyReactionsStmt = db.prepare(`
    INSERT OR REPLACE INTO reply_reactions (
      id, replyId, userId, type, createdAt
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  let migratedReviews = 0;
  let skippedReviews = 0;
  
  const insertMany = db.transaction((items) => {
    for (const review of items) {
      // Проверяем, существует ли специалист и пользователь
      const specialistId = review.specialistId || null;
      const userId = review.userId || null;
      
      // Проверяем, существует ли специалист
      if (specialistId !== null && !specialistIdsSet.has(specialistId)) {
        console.warn(`Специалист с ID ${specialistId} не найден для отзыва ${review.id}. Отзыв будет пропущен.`);
        debugInfo.invalidReviewSpecialists = debugInfo.invalidReviewSpecialists || [];
        debugInfo.invalidReviewSpecialists.push({reviewId: review.id, specialistId});
        skippedReviews++;
        continue;
      }
      
      // Проверяем, существует ли пользователь
      if (userId !== null && !userIdsSet.has(userId)) {
        console.warn(`Пользователь с ID ${userId} не найден для отзыва ${review.id}. Будет установлено NULL.`);
        debugInfo.invalidReviewUsers = debugInfo.invalidReviewUsers || [];
        debugInfo.invalidReviewUsers.push({reviewId: review.id, userId});
        // Продолжаем выполнение, но с NULL в поле userId
      }
      
      reviewsStmt.run(
        review.id,
        specialistId,
        userId !== null && userIdsSet.has(userId) ? userId : null,
        review.rating || 0,
        review.text || null,
        review.isModerated ? 1 : 0,
        review.isPublished ? 1 : 0,
        review.createdAt || new Date().toISOString(),
        review.updatedAt || new Date().toISOString()
      );
      
      migratedReviews++;
      
      // Вставляем вложения к отзыву
      if (review.attachments && Array.isArray(review.attachments)) {
        for (const attachment of review.attachments) {
          const path = attachment.path || attachment.url || null;
          if (!path) {
            console.warn(`Вложение без пути для отзыва ${review.id} будет пропущено.`);
            continue;
          }
          
          attachmentsStmt.run(
            review.id,
            path,
            attachment.type || null
          );
        }
      }
      
      // Вставляем реакции на отзыв, только если пользователь существует
      if (review.reactions && Array.isArray(review.reactions)) {
        for (const reaction of review.reactions) {
          if (reaction.userId === null || !userIdsSet.has(reaction.userId)) {
            console.warn(`Пользователь с ID ${reaction.userId} не найден для реакции на отзыв ${review.id}. Реакция будет пропущена.`);
            continue;
          }
          
          reactionsStmt.run(
            reaction.id,
            review.id,
            reaction.userId,
            reaction.type,
            reaction.createdAt || new Date().toISOString()
          );
        }
      }
      
      // Вставляем ответы на отзыв, только если пользователь существует
      if (review.replies && Array.isArray(review.replies)) {
        for (const reply of review.replies) {
          if (reply.userId === null || !userIdsSet.has(reply.userId)) {
            console.warn(`Пользователь с ID ${reply.userId} не найден для ответа на отзыв ${review.id}. Ответ будет пропущен.`);
            continue;
          }
          
          repliesStmt.run(
            reply.id,
            review.id,
            reply.userId,
            reply.text || null,
            reply.isModerated ? 1 : 0,
            reply.isPublished ? 1 : 0,
            reply.createdAt || new Date().toISOString(),
            reply.updatedAt || new Date().toISOString()
          );
          
          // Вставляем вложения к ответу
          if (reply.attachments && Array.isArray(reply.attachments)) {
            for (const attachment of reply.attachments) {
              const path = attachment.path || attachment.url || null;
              if (!path) {
                console.warn(`Вложение без пути для ответа ${reply.id} будет пропущено.`);
                continue;
              }
              
              replyAttachmentsStmt.run(
                reply.id,
                path,
                attachment.type || null
              );
            }
          }
          
          // Вставляем реакции на ответ, только если пользователь существует
          if (reply.reactions && Array.isArray(reply.reactions)) {
            for (const reaction of reply.reactions) {
              if (reaction.userId === null || !userIdsSet.has(reaction.userId)) {
                console.warn(`Пользователь с ID ${reaction.userId} не найден для реакции на ответ ${reply.id}. Реакция будет пропущена.`);
                continue;
              }
              
              replyReactionsStmt.run(
                reaction.id,
                reply.id,
                reaction.userId,
                reaction.type,
                reaction.createdAt || new Date().toISOString()
              );
            }
          }
        }
      }
    }
  });
  
  insertMany(reviews);
  console.log(`Мигрировано ${migratedReviews} отзывов. Пропущено ${skippedReviews} отзывов.`);
  debugInfo.migratedReviews = migratedReviews;
  debugInfo.skippedReviews = skippedReviews;
};

// Миграция записей на прием
const migrateAppointments = async () => {
  console.log('Миграция записей на прием...');
  
  const appointmentsFilePath = path.join(DATA_DIR, 'appointments', 'appointments.json');
  const alternativeFilePath = path.join(DATA_DIR, 'appointments.json');
  
  let appointments = readJsonFile(appointmentsFilePath);
  
  if (appointments.length === 0 && fs.existsSync(alternativeFilePath)) {
    console.log('Используем альтернативный путь для записей на прием.');
    appointments = readJsonFile(alternativeFilePath);
  }
  
  if (appointments.length === 0) {
    console.log('Нет записей на прием для миграции.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO appointments (
      id, userId, specialistId, serviceId, userName, 
      userPhone, date, startTime, endTime, status, 
      comment, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const appointment of items) {
      stmt.run(
        appointment.id,
        appointment.userId || null,
        appointment.specialistId || null,
        appointment.serviceId || null,
        appointment.userName || null,
        appointment.userPhone || null,
        appointment.date,
        appointment.startTime,
        appointment.endTime,
        appointment.status || 'pending',
        appointment.comment || null,
        appointment.createdAt || new Date().toISOString(),
        appointment.updatedAt || new Date().toISOString()
      );
    }
  });
  
  insertMany(appointments);
  console.log(`Мигрировано ${appointments.length} записей на прием.`);
};

// Миграция событий
const migrateEvents = async () => {
  console.log('Миграция событий...');
  
  const eventsFilePath = path.join(DATA_DIR, 'events', 'events.json');
  const events = readJsonFile(eventsFilePath);
  
  if (events.length === 0) {
    console.log('Нет событий для миграции.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO events (
      id, title, description, image, startDate, 
      endDate, location, price, capacity, isOnline, 
      isArchived, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const event of items) {
      stmt.run(
        event.id,
        event.title,
        event.description || null,
        event.image || null,
        event.startDate || null,
        event.endDate || null,
        event.location || null,
        event.price || 0,
        event.capacity || 0,
        event.isOnline ? 1 : 0,
        event.isArchived ? 1 : 0,
        event.createdAt || new Date().toISOString(),
        event.updatedAt || new Date().toISOString()
      );
    }
  });
  
  insertMany(events);
  console.log(`Мигрировано ${events.length} событий.`);
};

// Миграция настроек
const migrateSettings = async () => {
  console.log('Миграция настроек...');
  
  // Общие настройки
  const settingsFilePath = path.join(DATA_DIR, 'settings', 'general.json');
  const settings = readJsonFile(settingsFilePath);
  
  if (Object.keys(settings).length > 0) {
    const settingsStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (id, name, value, updatedAt)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertSettings = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        const settingId = `setting_${key}`;
        settingsStmt.run(
          settingId,
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value),
          new Date().toISOString()
        );
      }
    });
    
    insertSettings();
    console.log(`Мигрированы общие настройки.`);
  } else {
    console.log('Нет общих настроек для миграции.');
  }
  
  // Настройки консультаций
  const consultationSettingsPath = path.join(DATA_DIR, 'settingsConsultation', 'settings.json');
  const consultationSettings = readJsonFile(consultationSettingsPath);
  
  if (Object.keys(consultationSettings).length > 0) {
    const consultationStmt = db.prepare(`
      INSERT OR REPLACE INTO consultation_settings (id, name, value, updatedAt)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertConsultationSettings = db.transaction(() => {
      for (const [key, value] of Object.entries(consultationSettings)) {
        const settingId = `consult_${key}`;
        consultationStmt.run(
          settingId,
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value),
          new Date().toISOString()
        );
      }
    });
    
    insertConsultationSettings();
    console.log(`Мигрированы настройки консультаций.`);
  } else {
    console.log('Нет настроек консультаций для миграции.');
  }
};

// Миграция FAQ
const migrateFAQ = async () => {
  console.log('Миграция FAQ...');
  
  const faqFilePath = path.join(DATA_DIR, 'faq.json');
  const faqItems = readJsonFile(faqFilePath);
  
  if (faqItems.length === 0) {
    console.log('Нет FAQ для миграции.');
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO faq (
      id, question, answer, category, "order", isActive, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const faq of items) {
      stmt.run(
        faq.id,
        faq.question,
        faq.answer,
        faq.category || null,
        faq.order || 0,
        faq.isActive !== undefined ? faq.isActive : 1,
        faq.createdAt || new Date().toISOString(),
        faq.updatedAt || new Date().toISOString()
      );
    }
  });
  
  insertMany(faqItems);
  console.log(`Мигрировано ${faqItems.length} FAQ.`);
};

// Миграция промокодов
const migratePromos = async () => {
  console.log('Миграция промокодов...');
  
  const promosFilePath = path.join(DATA_DIR, 'promos', 'promos.json');
  
  // Проверяем существование файла
  if (!fs.existsSync(promosFilePath)) {
    console.log('Файл с промокодами не найден, создаем пустую таблицу.');
    return;
  }
  
  const promos = readJsonFile(promosFilePath);
  
  if (promos.length === 0) {
    console.log('Нет промокодов для миграции.');
    return;
  }
  
  console.log(`Найдено ${promos.length} промокодов для миграции.`);
  
  // Очищаем таблицы перед миграцией
  db.exec('DELETE FROM promo_services');
  db.exec('DELETE FROM promos');
  
  const now = new Date().toISOString();
  
  // Мигрируем промокоды
  for (const promo of promos) {
    try {
      // Вставляем промокод
      db.run(`
        INSERT INTO promos (
          id, code, description, discount_type, discount_value, 
          start_date, end_date, max_uses, current_uses, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        promo.id || `promo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        promo.code,
        promo.description || '',
        promo.discountType || 'percentage',
        promo.discountValue || 0,
        promo.startDate || now,
        promo.endDate || null,
        promo.maxUses || null,
        promo.currentUses || 0,
        promo.isActive !== undefined ? promo.isActive ? 1 : 0 : 1,
        promo.createdAt || now,
        promo.updatedAt || now
      ]);
      
      // Связываем с услугами, если они указаны
      if (promo.services && Array.isArray(promo.services) && promo.services.length > 0) {
        for (const serviceId of promo.services) {
          try {
            db.run(`
              INSERT INTO promo_services (promo_id, service_id)
              VALUES (?, ?)
            `, [promo.id, serviceId]);
          } catch (error) {
            console.warn(`Не удалось связать промокод ${promo.code} с услугой ${serviceId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Ошибка при миграции промокода ${promo.code}:`, error);
    }
  }
  
  console.log('Миграция промокодов завершена.');
}; 