'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaVk, FaTelegramPlane, FaYoutube, FaInstagram, FaPhone, FaMapMarkerAlt, FaEnvelope, FaArrowUp, FaTelegram } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-[#4B4B4B] text-white relative">
      {/* Кнопка прокрутки вверх */}
      <button 
        onClick={scrollToTop}
        className="absolute -top-5 right-8 w-10 h-10 rounded-full bg-[#F0B7A4] flex items-center justify-center text-white shadow-lg hover:bg-[#E8A48F] transition-all"
      >
        <FaArrowUp size={18} />
      </button>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* О нас */}
          <div>
            <div className="flex items-center mb-4">
              <div className="relative w-10 h-10 mr-2 bg-[#F0B7A4] rounded-xl overflow-hidden flex items-center justify-center">
                <span className="font-bold text-white text-lg">В</span>
              </div>
              <h2 className="text-xl font-bold">Вдохновение</h2>
            </div>
            <p className="mb-6 text-sm text-gray-300">
              Центр психологической помощи "Вдохновение" — место, где вы найдете поддержку и понимание. 
              Мы помогаем справиться с эмоциональными трудностями и улучшить качество жизни.
            </p>
            <div className="flex space-x-3">
              <a href="https://vk.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#F0B7A4] transition-all">
                <FaVk size={18} />
                <span className="sr-only">ВКонтакте</span>
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#F0B7A4] transition-all">
                <FaTelegramPlane size={18} />
                <span className="sr-only">Телеграм</span>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#F0B7A4] transition-all">
                <FaYoutube size={18} />
                <span className="sr-only">YouTube</span>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#F0B7A4] transition-all">
                <FaInstagram size={18} />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-[#F0B7A4]">Навигация</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Главная
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Услуги
                </Link>
              </li>
              <li>
                <Link href="/specialists" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Специалисты
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Услуги */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-[#F0B7A4]">Наши услуги</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/services/individual" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Индивидуальная психотерапия
                </Link>
              </li>
              <li>
                <Link href="/services/family" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Семейная психотерапия
                </Link>
              </li>
              <li>
                <Link href="/services/art" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Арт-терапия
                </Link>
              </li>
              <li>
                <Link href="/services/group" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Групповые занятия
                </Link>
              </li>
              <li>
                <Link href="/services/online" className="text-gray-300 hover:text-[#F0B7A4] transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F0B7A4]"></span>
                  Онлайн-консультации
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="text-lg font-semibold mb-5 text-[#F0B7A4]">Контакты</h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  <FaPhone className="text-[#F0B7A4]" size={16} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Телефон</p>
                  <p>+7 (495) 123-45-67</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  <FaEnvelope className="text-[#F0B7A4]" size={16} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p>info.vdohnovenie.pro@gmail.com</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  <FaTelegram className="text-[#F0B7A4]" size={16} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Telegram</p>
                  <p>t.me/vdohnovenie_pro</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>© {currentYear} Центр психологической помощи "Вдохновение". Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 