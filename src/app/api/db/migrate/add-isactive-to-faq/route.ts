import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/db';
import { logger } from '@/lib/logger';
import { initDB } from '../../';

export const POST = async (req: NextRequest) => {
  try {
    // Инициализируем базу данных
    initDB();
    
    logger.info('[Миграция] Начало добавления поля isActive в таблицу FAQ');
    
    // Проверяем, существует ли колонка isActive в таблице faq
    const columnExists = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('faq') WHERE name = 'isActive'
    `).get() as { count: number };
    
    if (columnExists.count === 0) {
      // Добавляем колонку isActive
      db.exec(`ALTER TABLE faq ADD COLUMN isActive INTEGER DEFAULT 1`);
      
      // Устанавливаем значение по умолчанию для существующих записей
      db.exec(`UPDATE faq SET isActive = 1 WHERE isActive IS NULL`);
      
      logger.info('[Миграция] Колонка isActive добавлена в таблицу faq');
      
      return NextResponse.json({
        success: true,
        message: 'Колонка isActive успешно добавлена в таблицу FAQ'
      });
    } else {
      logger.info('[Миграция] Колонка isActive уже существует в таблице faq');
      
      return NextResponse.json({
        success: true,
        message: 'Колонка isActive уже существует в таблице FAQ'
      });
    }
  } catch (error) {
    logger.error('[Миграция] Ошибка при добавлении колонки isActive в таблицу faq:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: `Ошибка при добавлении колонки isActive: ${error}`
      }, 
      { status: 500 }
    );
  }
}; 