import { initializeDatabase } from '../schema';

// Инициализируем базу данных SQLite при первом импорте адаптеров
// Это обеспечит инициализацию БД при любом использовании адаптеров
initializeDatabase();

import { appointmentsAdapter } from './appointments';
import { articlesAdapter } from './articles';
import { specialistsAdapter } from './specialists';
import { usersAdapter } from './users';
import { servicesAdapter } from './services';
import { faqAdapter } from './faq';
import { bonusAdapter } from '../api/bonus';
import { commentsAdapter } from './comments';

export {
  servicesAdapter,
  specialistsAdapter,
  articlesAdapter,
  usersAdapter,
  appointmentsAdapter,
  faqAdapter,
  bonusAdapter,
  commentsAdapter
};

// Экспортируем типы
export type { User } from '../api/users';
export type { Specialist } from '../api/specialists';
export type { Service } from '../api/services';
export type { Appointment } from '../api/appointments';
export type { Article } from '../api/articles';
export type { BonusTransaction, BonusSettings } from '../api/bonus';
export type { Comment } from '../api/comments'; 