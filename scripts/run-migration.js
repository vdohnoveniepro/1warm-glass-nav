const http = require('http');

/**
 * Скрипт для запуска миграции из JSON в SQLite через API
 */
const main = async () => {
  console.log('Запуск миграции данных из JSON в SQLite...');
  
  try {
    // Проверка, запущен ли сервер
    await checkServer();
    
    // Отправляем запрос на миграцию
    const result = await sendMigrationRequest();
    
    if (result.success) {
      console.log('Миграция данных успешно завершена!');
      
      // Выводим краткую статистику
      if (result.details) {
        console.log('\nКраткая статистика миграции:');
        console.log(`- Пользователей: ${result.details.existingUserIds?.length || 0}`);
        console.log(`- Специалистов: ${result.details.existingSpecialistIds?.length || 0}`);
        console.log(`- Услуг: ${result.details.existingServiceIds?.length || 0}`);
        console.log(`- Отзывов: ${result.details.migratedReviews || 0}`);
        
        if (result.details.invalidServiceLinks?.length > 0) {
          console.log(`\nПропущено связей услуг: ${result.details.invalidServiceLinks.length}`);
        }
        
        if (result.details.skippedReviews > 0) {
          console.log(`Пропущено отзывов: ${result.details.skippedReviews}`);
        }
      }
      
      process.exit(0);
    } else {
      console.error('Произошла ошибка при миграции данных:', result.message);
      
      if (result.details && result.details.errors) {
        console.error('Ошибки:', result.details.errors);
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('Критическая ошибка при миграции данных:', error);
    process.exit(1);
  }
};

/**
 * Проверяет, запущен ли сервер
 */
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', (error) => {
      reject(new Error('Сервер не запущен. Запустите сервер командой "npm run dev" перед выполнением миграции.'));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Превышено время ожидания ответа от сервера.'));
    });
    
    req.end();
  });
};

/**
 * Отправляет запрос на миграцию
 */
const sendMigrationRequest = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/db/migrate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 секунд на выполнение миграции
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Ошибка при разборе ответа: ${error}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Ошибка при отправке запроса: ${error}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Превышено время ожидания ответа от сервера при миграции.'));
    });
    
    req.end();
  });
};

main(); 