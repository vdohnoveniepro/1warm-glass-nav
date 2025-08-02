const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных SQLite
const DB_PATH = path.join(process.cwd(), 'src', 'database', 'vdohnovenie.db');

// Путь к JSON файлам с записями на прием
const APPOINTMENTS_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'appointments', 'appointments.json');
const APPOINTMENTS_ALT_PATH = path.join(process.cwd(), 'appointments'); // Альтернативный путь
const LEGACY_APPOINTMENTS_PATH = path.join(process.cwd(), 'public', 'data', 'appointments.json');

/**
 * Чтение JSON файла
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Файл не найден: ${filePath}`);
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error);
    return [];
  }
}

/**
 * Проверка и миграция записей на прием
 */
async function checkAndMigrateAppointments() {
  console.log('Начинаем проверку и миграцию записей на прием...');

  // Проверка существования базы данных
  if (!fs.existsSync(DB_PATH)) {
    console.error(`База данных не найдена по пути: ${DB_PATH}`);
    return;
  }

  // Подключение к базе данных
  let db;
  try {
    db = new Database(DB_PATH);
    console.log('Успешное подключение к базе данных SQLite.');
  } catch (dbError) {
    console.error('Ошибка при подключении к базе данных:', dbError);
    return;
  }

  // Проверка наличия таблицы appointments
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'").get();
    if (!tableExists) {
      console.error('Таблица appointments не существует в базе данных.');
      return;
    }
  } catch (tableError) {
    console.error('Ошибка при проверке таблицы appointments:', tableError);
    return;
  }

  // Проверка количества записей в базе данных
  let appointmentsCount = 0;
  try {
    appointmentsCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get().count;
    console.log(`В базе данных SQLite найдено записей на прием: ${appointmentsCount}`);
  } catch (countError) {
    console.error('Ошибка при подсчете записей в базе данных:', countError);
    return;
  }

  // Если записей нет, пытаемся найти JSON файлы с записями для миграции
  if (appointmentsCount === 0) {
    console.log('Записи на прием отсутствуют в базе данных. Ищем JSON файлы для миграции...');

    // Проверяем все возможные пути к файлам с записями
    let appointments = [];
    let sourceFile = '';

    if (fs.existsSync(APPOINTMENTS_JSON_PATH)) {
      appointments = readJsonFile(APPOINTMENTS_JSON_PATH);
      sourceFile = APPOINTMENTS_JSON_PATH;
    } else if (fs.existsSync(LEGACY_APPOINTMENTS_PATH)) {
      appointments = readJsonFile(LEGACY_APPOINTMENTS_PATH);
      sourceFile = LEGACY_APPOINTMENTS_PATH;
    } else if (fs.existsSync(APPOINTMENTS_ALT_PATH)) {
      appointments = readJsonFile(APPOINTMENTS_ALT_PATH);
      sourceFile = APPOINTMENTS_ALT_PATH;
    }

    if (appointments.length === 0) {
      console.log('Нет записей на прием для миграции в JSON файлах.');
      return;
    }

    console.log(`Найдено ${appointments.length} записей на прием в файле ${sourceFile}. Начинаем миграцию...`);

    // Подготавливаем запрос на вставку
    const stmt = db.prepare(`
      INSERT INTO appointments (
        id, userId, specialistId, serviceId, userName, 
        userPhone, date, startTime, endTime, status, 
        comment, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Начинаем транзакцию
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
          appointment.startTime || appointment.timeStart,
          appointment.endTime || appointment.timeEnd,
          appointment.status || 'pending',
          appointment.comment || null,
          appointment.createdAt || new Date().toISOString(),
          appointment.updatedAt || new Date().toISOString()
        );
      }
    });

    try {
      insertMany(appointments);
      console.log(`Успешно мигрировано ${appointments.length} записей на прием в базу данных SQLite.`);
    } catch (insertError) {
      console.error('Ошибка при миграции записей в базу данных:', insertError);
      return;
    }
  } else {
    console.log('В базе данных уже есть записи на прием. Миграция не требуется.');
  }

  // Закрываем соединение с базой данных
  db.close();
  console.log('Проверка и миграция записей на прием завершена.');
}

// Запускаем проверку и миграцию
checkAndMigrateAppointments()
  .catch(error => {
    console.error('Ошибка при выполнении скрипта:', error);
  }); 