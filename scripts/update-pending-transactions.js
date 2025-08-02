/**
 * Скрипт для ручного обновления статуса незавершенных бонусных транзакций для завершенных записей.
 * Используется в случае, если были обнаружены несоответствия в данных.
 */

const { db } = require('../src/database/db');
const path = require('path');
const fs = require('fs');

// Инициализация БД
const initializeDatabase = () => {
  const dbPath = path.join(process.cwd(), 'vdohnovenie.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ База данных не найдена по пути:', dbPath);
    process.exit(1);
  }
  
  console.log('✅ База данных найдена:', dbPath);
};

// Обновление статуса бонусных транзакций
const updateBonusTransactions = () => {
  console.log('🔄 Поиск незавершенных бонусных транзакций для завершенных записей...');
  
  // Находим все записи со статусом "completed"
  const completedAppointments = db.prepare(`
    SELECT id FROM appointments WHERE status = 'completed'
  `).all();
  
  console.log(`📊 Найдено ${completedAppointments.length} завершенных записей`);
  
  if (completedAppointments.length === 0) {
    console.log('ℹ️ Нет завершенных записей для обработки');
    return;
  }
  
  // Получаем все незавершенные бонусные транзакции для завершенных записей
  let pendingTransactions = [];
  
  for (const appointment of completedAppointments) {
    const appointmentTransactions = db.prepare(`
      SELECT id, userId, amount, type, appointmentId 
      FROM bonus_transactions 
      WHERE appointmentId = ? AND status = 'pending'
    `).all(appointment.id);
    
    pendingTransactions = [...pendingTransactions, ...appointmentTransactions];
  }
  
  console.log(`📊 Найдено ${pendingTransactions.length} незавершенных транзакций для завершенных записей`);
  
  if (pendingTransactions.length === 0) {
    console.log('✅ Все бонусные транзакции для завершенных записей уже обработаны');
    return;
  }
  
  // Обновляем статус каждой транзакции
  const now = new Date().toISOString();
  let updatedCount = 0;
  
  // Начинаем транзакцию для обеспечения целостности данных
  db.exec('BEGIN TRANSACTION');
  
  try {
    for (const transaction of pendingTransactions) {
      // Обновляем статус транзакции
      db.prepare(`
        UPDATE bonus_transactions 
        SET status = 'completed', updatedAt = ? 
        WHERE id = ?
      `).run(now, transaction.id);
      
      // Обновляем баланс пользователя
      db.prepare(`
        UPDATE users 
        SET bonusBalance = bonusBalance + ?, updatedAt = ? 
        WHERE id = ?
      `).run(transaction.amount, now, transaction.userId);
      
      updatedCount++;
      console.log(`✅ Обновлена транзакция ${transaction.id} для записи ${transaction.appointmentId}`);
    }
    
    // Если все прошло успешно, фиксируем изменения
    db.exec('COMMIT');
    
    console.log(`\n✅ Успешно обновлено ${updatedCount} бонусных транзакций`);
  } catch (error) {
    // При ошибке откатываем изменения
    db.exec('ROLLBACK');
    console.error('❌ Ошибка при обновлении бонусных транзакций:', error);
    process.exit(1);
  }
};

// Обновление статуса бонусных транзакций для отмененных записей
const updateCancelledAppointmentsTransactions = () => {
  console.log('\n🔄 Поиск незавершенных бонусных транзакций для отмененных записей...');
  
  // Находим все записи со статусом "cancelled"
  const cancelledAppointments = db.prepare(`
    SELECT id FROM appointments WHERE status = 'cancelled'
  `).all();
  
  console.log(`📊 Найдено ${cancelledAppointments.length} отмененных записей`);
  
  if (cancelledAppointments.length === 0) {
    console.log('ℹ️ Нет отмененных записей для обработки');
    return;
  }
  
  // Получаем все незавершенные бонусные транзакции для отмененных записей
  let pendingTransactions = [];
  
  for (const appointment of cancelledAppointments) {
    const appointmentTransactions = db.prepare(`
      SELECT id, userId, amount, type, appointmentId 
      FROM bonus_transactions 
      WHERE appointmentId = ? AND status = 'pending'
    `).all(appointment.id);
    
    pendingTransactions = [...pendingTransactions, ...appointmentTransactions];
  }
  
  console.log(`📊 Найдено ${pendingTransactions.length} незавершенных транзакций для отмененных записей`);
  
  if (pendingTransactions.length === 0) {
    console.log('✅ Все бонусные транзакции для отмененных записей уже обработаны');
    return;
  }
  
  // Обновляем статус каждой транзакции на "cancelled"
  const now = new Date().toISOString();
  let updatedCount = 0;
  
  // Начинаем транзакцию для обеспечения целостности данных
  db.exec('BEGIN TRANSACTION');
  
  try {
    for (const transaction of pendingTransactions) {
      // Обновляем статус транзакции
      db.prepare(`
        UPDATE bonus_transactions 
        SET status = 'cancelled', updatedAt = ? 
        WHERE id = ?
      `).run(now, transaction.id);
      
      updatedCount++;
      console.log(`✅ Отменена транзакция ${transaction.id} для записи ${transaction.appointmentId}`);
    }
    
    // Если все прошло успешно, фиксируем изменения
    db.exec('COMMIT');
    
    console.log(`\n✅ Успешно отменено ${updatedCount} бонусных транзакций`);
  } catch (error) {
    // При ошибке откатываем изменения
    db.exec('ROLLBACK');
    console.error('❌ Ошибка при отмене бонусных транзакций:', error);
    process.exit(1);
  }
};

// Главная функция
const main = () => {
  console.log('🚀 Запуск процесса обновления бонусных транзакций...');
  
  // Инициализируем БД
  initializeDatabase();
  
  // Обновляем бонусные транзакции для завершенных записей
  updateBonusTransactions();
  
  // Обновляем бонусные транзакции для отмененных записей
  updateCancelledAppointmentsTransactions();
  
  console.log('\n🎉 Процесс обновления бонусных транзакций завершен!');
};

// Запускаем скрипт
main(); 