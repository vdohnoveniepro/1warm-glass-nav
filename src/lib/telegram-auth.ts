import crypto from 'crypto';

/**
 * Validate Telegram WebApp initData using HMAC per Telegram docs
 */
export function isValidTelegramData(initData: string, botToken: string): boolean {
  try {
    if (!initData || !botToken) return false;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    // Remove hash from params
    params.delete('hash');

    // Sort params and build data-check string
    const sortedParams: [string, string][] = Array.from(params.entries()).sort();
    const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

    // Create secret key and calculate HMAC-SHA256
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculated = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return calculated === hash;
  } catch (e) {
    console.error('[telegram-auth] Ошибка валидации initData:', e);
    return false;
  }
}

/**
 * Parse Telegram user from initData
 */
export function parseTelegramUserData(initData: string): {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
} | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(decodeURIComponent(userStr));
  } catch (e) {
    console.error('[telegram-auth] Ошибка парсинга user из initData:', e);
    return null;
  }
}
