export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[]; // Поддержка нескольких ролей
  phone: string;
  photo?: string;
  specialistId?: string;
  bonusBalance?: number;
  referralCode?: string;
  favorites?: {
    articles: string[];
    services: string[];
    specialists: string[];
  };
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SPECIALIST = 'specialist',
  MANAGER = 'manager'
} 