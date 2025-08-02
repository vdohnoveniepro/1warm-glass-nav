// Константы для JWT авторизации
export const JWT_SECRET_STRING = process.env.JWT_SECRET || 'your-secret-key';

// Другие константы приложения
export const TOKEN_EXPIRY = '30d'; // Срок действия токена - 30 дней
export const AUTH_CACHE_TTL = 60 * 1000; // Время жизни кеша авторизации - 1 минута

// Константы для работы с избранным
export const FAVORITES_TABLES = {
  ARTICLES: 'user_favorite_articles',
  SERVICES: 'user_favorite_services',
  SPECIALISTS: 'user_favorite_specialists'
}; 