import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Интерфейс для результатов пререндеринга
interface PrerenderResult {
  url: string;
  status: number;
  time: number; // время выполнения в мс
}

// POST /api/admin/optimize/prerender - предварительный рендеринг страниц
export async function POST() {
  try {
    const startTime = Date.now();
    
    // Список страниц для предварительного рендеринга
    // Можно также получать этот список динамически из базы данных или sitemap.xml
    const urls = await getPagesToPrerender();
    
    // Предварительный рендеринг страниц
    const results = await prerenderPages(urls);
    
    // Подсчитываем успешно обработанные страницы
    const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
    const failedCount = results.length - successCount;
    
    // Среднее время рендеринга
    const averageTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.time, 0) / results.length 
      : 0;
    
    const duration = (Date.now() - startTime) / 1000; // в секундах
    
    return NextResponse.json({
      success: true,
      message: `Предварительный рендеринг завершен за ${duration.toFixed(2)} сек. Успешно: ${successCount}, с ошибками: ${failedCount}`,
      summary: {
        totalPages: results.length,
        successCount,
        failedCount,
        averageTimeMs: Math.round(averageTime)
      },
      results
    });
  } catch (error) {
    console.error('Ошибка при выполнении предварительного рендеринга:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при выполнении предварительного рендеринга' },
      { status: 500 }
    );
  }
}

/**
 * Получает список страниц для предварительного рендеринга
 */
async function getPagesToPrerender(): Promise<string[]> {
  // Базовые URL, которые должны быть предварительно отрендерены
  const baseUrls = [
    '/',
    '/specialists',
    '/services',
    '/booking/thank-you',
    '/blog',
    '/cabinet'
  ];
  
  const urls: string[] = [...baseUrls];
  
  try {
    // Добавляем URL специалистов
    const specialistsDir = path.join(process.cwd(), 'db/specialists');
    if (fs.existsSync(specialistsDir)) {
      const specialistFiles = fs.readdirSync(specialistsDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of specialistFiles) {
        const specialistId = path.basename(file, '.json');
        urls.push(`/specialists/${specialistId}`);
      }
    }
    
    // Добавляем URL услуг
    const servicesDir = path.join(process.cwd(), 'db/services');
    if (fs.existsSync(servicesDir)) {
      const serviceFiles = fs.readdirSync(servicesDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of serviceFiles) {
        const serviceId = path.basename(file, '.json');
        urls.push(`/services/${serviceId}`);
      }
    }
    
    // Добавляем URL статей блога
    const blogDir = path.join(process.cwd(), 'db/articles');
    if (fs.existsSync(blogDir)) {
      const blogFiles = fs.readdirSync(blogDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of blogFiles) {
        const blogId = path.basename(file, '.json');
        urls.push(`/blog/${blogId}`);
      }
    }
  } catch (error) {
    console.error('Ошибка при получении списка страниц:', error);
  }
  
  return urls;
}

/**
 * Выполняет предварительный рендеринг страниц
 */
async function prerenderPages(urls: string[]): Promise<PrerenderResult[]> {
  const results: PrerenderResult[] = [];
  
  // Получаем базовый URL сайта из окружения или используем локальный
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Определяем тип клиента HTTP в зависимости от протокола
  const client = baseUrl.startsWith('https') ? https : http;
  
  for (const url of urls) {
    const pageUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const pageStartTime = Date.now();
    
    try {
      // Отправляем HTTP GET запрос для инициации рендеринга страницы
      const result = await fetchPage(client, pageUrl);
      
      results.push({
        url,
        status: result.statusCode || 0,
        time: Date.now() - pageStartTime
      });
    } catch (error) {
      console.error(`Ошибка при предварительном рендеринге ${pageUrl}:`, error);
      results.push({
        url,
        status: 500,
        time: Date.now() - pageStartTime
      });
    }
  }
  
  return results;
}

/**
 * Отправляет HTTP запрос на указанный URL
 */
function fetchPage(client: typeof http | typeof https, url: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = client.get(url, (response) => {
      // Отбрасываем тело ответа, нам нужен только статус
      response.on('data', () => {});
      response.on('end', () => {
        resolve(response);
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Устанавливаем таймаут для запроса
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
} 