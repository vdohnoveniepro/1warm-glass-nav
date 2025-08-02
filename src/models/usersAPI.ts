import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// Путь к файлу пользователей
const usersFilePath = path.join(process.cwd(), 'public', 'data', 'users.json');

// Интерфейс для пользователя
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'user' | 'specialist' | 'admin';
  passwordHash: string;
  specialistId?: string; // ID связанного профиля специалиста (если пользователь - специалист)
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для данных при создании пользователя
export interface UserCreateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'user' | 'specialist' | 'admin';
  specialistId?: string;
}

// Загрузка пользователей из файла
const loadUsers = (): User[] => {
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
    return [];
  }

  const data = fs.readFileSync(usersFilePath, 'utf8');
  return JSON.parse(data);
};

// Сохранение пользователей в файл
const saveUsers = (users: User[]) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Получить всех пользователей
export const getAllUsers = (): User[] => {
  return loadUsers();
};

// Получить пользователя по ID
export const getUserById = (id: string): User | null => {
  const users = loadUsers();
  return users.find(user => user.id === id) || null;
};

// Получить пользователя по email
export const getUserByEmail = (email: string): User | null => {
  const users = loadUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
};

// Хеширование пароля
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Создать нового пользователя
export const createUser = async (data: UserCreateData): Promise<User> => {
  const users = loadUsers();
  
  // Проверка на уникальность email
  const existingUser = getUserByEmail(data.email);
  if (existingUser) {
    throw new Error('Пользователь с таким email уже существует');
  }
  
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(data.password);
  
  const newUser: User = {
    id: uuidv4(),
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    role: data.role,
    passwordHash,
    ...(data.specialistId && { specialistId: data.specialistId }),
    createdAt: now,
    updatedAt: now,
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
};

// Обновить пользователя
export const updateUser = async (id: string, data: Partial<UserCreateData>): Promise<User | null> => {
  const users = loadUsers();
  const index = users.findIndex(user => user.id === id);
  
  if (index === -1) return null;
  
  const updates: Partial<User> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  if (data.password) {
    updates.passwordHash = await hashPassword(data.password);
    delete (updates as any).password;
  }
  
  users[index] = {
    ...users[index],
    ...updates,
  };
  
  saveUsers(users);
  
  return users[index];
};

// Удалить пользователя
export const deleteUser = (id: string): boolean => {
  const users = loadUsers();
  const filteredUsers = users.filter(user => user.id !== id);
  
  if (filteredUsers.length === users.length) {
    return false;
  }
  
  saveUsers(filteredUsers);
  return true;
};

// Проверка пароля
export const verifyPassword = async (user: User, password: string): Promise<boolean> => {
  return await bcrypt.compare(password, user.passwordHash);
}; 